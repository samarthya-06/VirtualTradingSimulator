import yahooFinance from 'yahoo-finance2';
import NodeCache from 'node-cache';
import { logError } from '../utils/logger.js';
import marketDataCacheService from './marketDataCacheService.js';
import indianStockUtils from '../utils/indianStockUtils.js';

// Initialize caches with optimized TTL and checkperiod
const searchCache = new NodeCache({ 
    stdTTL: 600,         // 10 minutes for search results (increased from 5 minutes)
    checkperiod: 120,    // Check for expired keys every 2 minutes
    useClones: false,    // Don't clone data for better performance
    maxKeys: 1000        // Limit maximum keys to prevent memory issues
}); 

const quoteCache = new NodeCache({ 
    stdTTL: 1,           // 1 second for quotes (reduced from 3 seconds for more real-time data)
    checkperiod: 1,      // Check for expired keys every 1 second
    useClones: false,    // Don't clone data for better performance
    maxKeys: 5000        // Limit maximum keys to prevent memory issues
});

// Cache for market indices with longer TTL
const indicesCache = new NodeCache({
    stdTTL: 10,          // 10 seconds for indices (reduced from 30 seconds for more frequent updates)
    checkperiod: 5,      // Check for expired keys every 5 seconds (reduced from 10 seconds)
    useClones: false,    // Don't clone data for better performance
    maxKeys: 100         // Limit maximum keys to prevent memory issues
});

const batchSize = 5;     // Reduced from 20 to 5 to avoid rate limiting
const requestQueue = []; // Queue for API requests
let isProcessingQueue = false;
let lastRequestTime = 0;
const minRequestInterval = 200; // Reduced from 500ms to 200ms for faster updates

// Process the request queue with optimized handling for 1-second updates
async function processQueue() {
    if (isProcessingQueue || requestQueue.length === 0) return;
    
    isProcessingQueue = true;
    
    try {
        // Group requests by symbol to avoid duplicate requests
        const symbolMap = new Map();
        requestQueue.forEach(request => {
            const requestKey = request.key || 'default';
            // Keep only the most recent request for each symbol
            symbolMap.set(requestKey, request);
        });
        
        // Clear the queue and add only the unique requests back
        requestQueue.length = 0;
        symbolMap.forEach(request => requestQueue.push(request));
        
        while (requestQueue.length > 0) {
            const now = Date.now();
            const timeSinceLastRequest = now - lastRequestTime;
            
            // Ensure we're not making requests too quickly
            if (timeSinceLastRequest < minRequestInterval) {
                await new Promise(resolve => setTimeout(resolve, minRequestInterval - timeSinceLastRequest));
            }
            
            const request = requestQueue.shift();
            lastRequestTime = Date.now();
            
            try {
                const result = await request.execute();
                request.resolve(result);
            } catch (error) {
                request.reject(error);
            }
            
            // Reduced delay between requests for faster updates
            await new Promise(resolve => setTimeout(resolve, Math.floor(minRequestInterval / 2)));
        }
    } finally {
        isProcessingQueue = false;
    }
}

// Add a request to the queue
function queueRequest(executeFunction) {
    return new Promise((resolve, reject) => {
        requestQueue.push({
            execute: executeFunction,
            resolve,
            reject
        });
        
        // Start processing the queue if it's not already being processed
        if (!isProcessingQueue) {
            processQueue();
        }
    });
}

class StockMarketService {
    constructor() {
        this.cache = quoteCache;
        this.searchCache = searchCache;
        this.indicesCache = indicesCache;
        this.isIndianMarket = true;
        this.apiKey = process.env.YAHOO_FINANCE_API_KEY;
        this.baseUrl = process.env.MARKET_DATA_API_URL;
        this.topStocksCache = new Map();
        this.apiFailureCount = 0;
        this.lastApiFailureTime = 0;
        this.API_BACKOFF_THRESHOLD = 5; // Number of failures before backing off
        this.API_BACKOFF_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
    }

    // Check if we should use fallback data due to repeated API failures
    shouldUseFallback() {
        const now = Date.now();
        // If we've had too many failures and we're still within the backoff period
        if (this.apiFailureCount >= this.API_BACKOFF_THRESHOLD && 
            (now - this.lastApiFailureTime) < this.API_BACKOFF_TIME) {
            return true;
        }
        // If we're outside the backoff period, reset the failure count
        if ((now - this.lastApiFailureTime) > this.API_BACKOFF_TIME) {
            this.apiFailureCount = 0;
        }
        return false;
    }
    
    // Record an API failure
    recordApiFailure() {
        this.apiFailureCount++;
        this.lastApiFailureTime = Date.now();
    }

    async searchStocks(query) {
        try {
            // Normalize query to improve cache hits
            const normalizedQuery = query.trim().toLowerCase();
            
            // Check cache with normalized query
            const cachedResults = searchCache.get(normalizedQuery);
            if (cachedResults) {
                console.log(`Cache hit for search query: ${normalizedQuery}`);
                return cachedResults;
            }

            console.log(`Fetching search results for: ${normalizedQuery}`);
            
            // Queue the Yahoo Finance API request
            const results = await queueRequest(async () => {
                return yahooFinance.search(normalizedQuery, {
                    newsCount: 0,
                    quotesCount: 100,  // Increased from 50 to 100 to get more matches
                    enableNavLinks: false,
                    enableEnhancedTrivialQuery: true,
                    region: 'IN',
                    lang: 'en-IN'
                });
            });

            if (!results?.quotes?.length) {
                // If no results, try a fallback approach with common stocks
                return this._getFallbackSearchResults(normalizedQuery);
            }

            // Normalize and deduplicate stock results
            const stockMap = new Map();
            
            // Pre-calculate query terms for better relevance matching
            const queryTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 1);
            
            results.quotes
                .filter(quote => {
                    if (!quote?.symbol) return false;
                    // Be more lenient with quote types to include more results
                    return (quote.quoteType === 'EQUITY' || 
                           quote.quoteType === 'ETF' ||
                           quote.quoteType === 'OPTION') && 
                           (quote.exchange === 'NSE' || 
                            quote.exchange === 'BSE' || 
                            quote.symbol.endsWith('.NS') || 
                            quote.symbol.endsWith('.BO'));
                })
                .forEach(quote => {
                    // Extract base symbol without exchange suffix using our utility
                    const baseSymbol = indianStockUtils.getBaseSymbol(quote.symbol);
                    
                    // Determine exchange
                    const exchange = quote.symbol.endsWith('.NS') ? 'NSE' : 
                                    quote.symbol.endsWith('.BO') ? 'BSE' : 
                                    quote.exchange || 'NSE';
                    
                    // Calculate custom relevance score
                    let relevanceScore = quote.score || 0;
                    
                    // Boost score for exact symbol matches
                    if (baseSymbol.toLowerCase() === normalizedQuery) {
                        relevanceScore += 100;
                    }
                    
                    // Boost score for partial symbol matches
                    if (baseSymbol.toLowerCase().includes(normalizedQuery)) {
                        relevanceScore += 50;
                    }
                    
                    // Boost score for name matches
                    const nameLower = (quote.shortname || quote.longname || '').toLowerCase();
                    if (nameLower === normalizedQuery) {
                        relevanceScore += 75;
                    }
                    
                    // Boost for each query term found in name
                    queryTerms.forEach(term => {
                        if (nameLower.includes(term)) {
                            relevanceScore += 25;
                        }
                    });
                    
                    // Create stock object with enhanced metadata
                    const stock = {
                        symbol: baseSymbol,
                        name: quote.shortname || quote.longname || quote.symbol,
                        exchange: exchange,
                        type: quote.quoteType,
                        score: relevanceScore,
                        fullSymbol: indianStockUtils.standardizeSymbol(quote.symbol, exchange === 'BSE' ? 'BSE' : 'NSE'),
                        industry: quote.industry || null,
                        sector: quote.sector || null
                    };
                    
                    // If we already have this stock from another exchange, keep the one with higher score
                    if (stockMap.has(baseSymbol)) {
                        const existing = stockMap.get(baseSymbol);
                        if (stock.score > existing.score) {
                            stockMap.set(baseSymbol, stock);
                        }
                    } else {
                        stockMap.set(baseSymbol, stock);
                    }
                });
                
            // Convert to array and sort by relevance score
            let stocks = Array.from(stockMap.values())
                .sort((a, b) => b.score - a.score);  // Sort by score descending
                
            // If we still don't have results, use fallback
            if (stocks.length === 0) {
                stocks = this._getFallbackSearchResults(normalizedQuery);
            }

            searchCache.set(normalizedQuery, stocks);
            return stocks;
        } catch (error) {
            console.error('Error searching stocks:', error);
            return this._getFallbackSearchResults(normalizedQuery);
        }
    }
    
    // Fallback search results when Yahoo Finance API fails or returns no results
    _getFallbackSearchResults(query) {
        const results = [];
        
        // Use our top stocks lists to find matches
        const allStocks = [
            ...indianStockUtils.TOP_NSE_STOCKS.map(s => ({ symbol: s, exchange: 'NSE' })),
            ...indianStockUtils.TOP_BSE_STOCKS.map(s => ({ symbol: s, exchange: 'BSE' }))
        ];
        
        // Filter stocks that match the query
        for (const stock of allStocks) {
            const baseSymbol = indianStockUtils.getBaseSymbol(stock.symbol);
            
            if (baseSymbol.toLowerCase().includes(query) || 
                query.includes(baseSymbol.toLowerCase())) {
                results.push({
                    symbol: baseSymbol,
                    name: baseSymbol,
                    exchange: stock.exchange,
                    type: 'EQUITY',
                    score: 50,
                    fullSymbol: stock.symbol,
                    industry: null,
                    sector: null
                });
            }
        }
        
        // Add common Indian stocks for common search terms
        if (query.includes('bank')) {
            ['HDFCBANK', 'ICICIBANK', 'KOTAKBANK', 'SBIN', 'BANKBARODA', 'AXISBANK'].forEach(symbol => {
                if (!results.some(s => s.symbol === symbol)) {
                    results.push({
                        symbol,
                        name: symbol,
                        exchange: 'NSE',
                        type: 'EQUITY',
                        score: 40,
                        fullSymbol: `${symbol}.NS`,
                        industry: 'Banking',
                        sector: 'Financial Services'
                    });
                }
            });
        }
        
        if (query.includes('tata')) {
            ['TCS', 'TATAMOTORS', 'TATASTEEL', 'TATAPOWER', 'TATACHEM', 'TATAELXSI'].forEach(symbol => {
                if (!results.some(s => s.symbol === symbol)) {
                    results.push({
                        symbol,
                        name: `TATA ${symbol.replace('TATA', '')}`,
                        exchange: 'NSE',
                        type: 'EQUITY',
                        score: 40,
                        fullSymbol: `${symbol}.NS`,
                        industry: null,
                        sector: null
                    });
                }
            });
        }
        
        if (query.includes('reliance')) {
            ['RELIANCE', 'RCOM'].forEach(symbol => {
                if (!results.some(s => s.symbol === symbol)) {
                    results.push({
                        symbol,
                        name: symbol,
                        exchange: 'NSE',
                        type: 'EQUITY',
                        score: 40,
                        fullSymbol: `${symbol}.NS`,
                        industry: null,
                        sector: null
                    });
                }
            });
        }
        
        return results;
    }

    async getStockQuotes(symbols) {
        try {
            // Handle numeric symbols by mapping them to actual stock symbols
            const correctedSymbols = symbols.map(symbol => {
                if (!isNaN(symbol)) {
                    // Map numeric symbols using the utility function
                    return indianStockUtils.NUMERIC_TO_SYMBOL_MAP[symbol] || 'RELIANCE';
                }
                return symbol;
            });

            // Process in smaller batches to avoid rate limiting
            const batchSize = 5;
            const batches = [];
            for (let i = 0; i < correctedSymbols.length; i += batchSize) {
                batches.push(correctedSymbols.slice(i, i + batchSize));
            }
            
            // Combine results from all batches
            const results = {};
            for (const batch of batches) {
                try {
                    const batchResults = await Promise.all(
                        batch.map(async (symbol) => {
                            try {
                                // Check cache first
                                const baseSymbol = indianStockUtils.getBaseSymbol(symbol);
                                const cachedQuote = await marketDataCacheService.getQuote(baseSymbol);
                                if (cachedQuote) {
                                    return { symbol: baseSymbol, quote: cachedQuote };
                                }
                                
                                // Standardize the symbol
                                const fullSymbol = indianStockUtils.standardizeSymbol(symbol);
                                
                                // Fetch from Yahoo Finance without fields param to avoid validation errors
                                const quote = await yahooFinance.quote(fullSymbol);
                                
                                if (quote && quote.regularMarketPrice) {
                                    const stockData = {
                                        symbol: baseSymbol,
                                        name: quote.shortName || quote.longName || baseSymbol,
                                        price: quote.regularMarketPrice || 0,
                                        change: quote.regularMarketChange || 0,
                                        changePercent: quote.regularMarketChangePercent || 0,
                                        dayHigh: quote.regularMarketDayHigh || quote.regularMarketPrice,
                                        dayLow: quote.regularMarketDayLow || quote.regularMarketPrice,
                                        volume: quote.regularMarketVolume || 0,
                                        marketCap: quote.marketCap || 0,
                                        exchange: fullSymbol.endsWith('.NS') ? 'NSE' : 'BSE',
                                        previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice - (quote.regularMarketChange || 0)
                                    };
                                    
                                    // Cache the stock data
                                    await marketDataCacheService.cacheQuote(baseSymbol, stockData);
                                    
                                    return { symbol: baseSymbol, quote: stockData };
                                }
                                return null;
                            } catch (error) {
                                console.error(`Error fetching quote for ${symbol}:`, error.message);
                                
                                // Return fallback data
                                try {
                                    const baseSymbol = indianStockUtils.getBaseSymbol(symbol);
                                    const fallbackData = indianStockUtils.generateFallbackData(baseSymbol, false);
                                    await marketDataCacheService.cacheQuote(baseSymbol, fallbackData, 30);
                                    return { symbol: baseSymbol, quote: fallbackData };
                                } catch (fallbackError) {
                                    console.error(`Failed to generate fallback data for ${symbol}`);
                                    return null;
                                }
                            }
                        })
                    );
                    
                    // Add valid results to the combined results
                    batchResults
                        .filter(result => result !== null)
                        .forEach(result => {
                            results[result.symbol] = result.quote;
                        });
                    
                    // Add a small delay between batches to avoid rate limiting
                    if (batches.length > 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (error) {
                    console.error(`Error processing batch: ${batch.join(', ')}`, error);
                }
            }
            
            return results;
        } catch (error) {
            console.error('Error in getStockQuotes:', error);
            return {};
        }
    }

    /**
     * Get batch quotes for multiple symbols
     * @param {Array} symbols - Array of stock symbols
     * @returns {Object} - Object with symbols as keys and quote data as values
     */
    async getBatchQuotes(symbols) {
        if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
            return {};
        }
        
        // Normalize symbols to ensure consistent formatting
        const normalizedSymbols = symbols.map(symbol => indianStockUtils.standardizeSymbol(symbol));
        
        // First check the cache for each symbol
        const cachedResults = {};
        const symbolsToFetch = [];
        
        for (const symbol of normalizedSymbols) {
            const baseSymbol = indianStockUtils.getBaseSymbol(symbol);
            const cacheKey = `quote:${baseSymbol}`;
            const cachedQuote = this.cache.get(cacheKey);
            
            if (cachedQuote) {
                cachedResults[baseSymbol] = cachedQuote;
            } else {
                symbolsToFetch.push(symbol);
            }
        }
        
        // If all symbols were in cache, return immediately
        if (symbolsToFetch.length === 0) {
            return cachedResults;
        }
        
        // Use market data cache service for more recent quotes
        try {
            const marketDataResults = {};
            
            // Try to get data from marketDataCacheService first (which includes WebSocket updates)
            for (const symbol of symbolsToFetch) {
                const baseSymbol = indianStockUtils.getBaseSymbol(symbol);
                const marketData = await marketDataCacheService.getQuote(baseSymbol);
                
                if (marketData && marketData.price) {
                    marketDataResults[baseSymbol] = {
                        symbol: baseSymbol,
                        price: marketData.price,
                        change: marketData.change,
                        changePercent: marketData.changePercent,
                        dayHigh: marketData.dayHigh,
                        dayLow: marketData.dayLow,
                        volume: marketData.volume,
                        previousClose: marketData.previousClose,
                        exchange: marketData.exchange
                    };
                    
                    // Also update our local cache
                    this.cache.set(`quote:${baseSymbol}`, marketDataResults[baseSymbol]);
                }
            }
            
            // Process remaining symbols that weren't in marketDataCache
            const remainingSymbols = symbolsToFetch.filter(symbol => {
                const baseSymbol = indianStockUtils.getBaseSymbol(symbol);
                return !marketDataResults[baseSymbol];
            });
            
            // If we still have symbols to fetch, use Yahoo Finance in batches
            if (remainingSymbols.length > 0) {
                const batchPromises = [];
                
                // Split into smaller batches to avoid rate limiting
                for (let i = 0; i < remainingSymbols.length; i += batchSize) {
                    const batchSymbols = remainingSymbols.slice(i, i + batchSize);
                    
                    batchPromises.push(
                        queueRequest(async () => {
                            const quotes = await this.getStockQuotes(batchSymbols);
                            return quotes;
                        })
                    );
                    
                    // Add a small delay between batches
                    if (i + batchSize < remainingSymbols.length) {
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                }
                
                const batchResults = await Promise.allSettled(batchPromises);
                
                // Process successful batch results
                batchResults.forEach(result => {
                    if (result.status === 'fulfilled' && result.value) {
                        // Merge new quotes into our results
                        Object.entries(result.value).forEach(([symbol, data]) => {
                            const baseSymbol = indianStockUtils.getBaseSymbol(symbol);
                            marketDataResults[baseSymbol] = data;
                            
                            // Update cache
                            this.cache.set(`quote:${baseSymbol}`, data);
                        });
                    }
                });
            }
            
            // Merge cached and fresh results
            return { ...cachedResults, ...marketDataResults };
        } catch (error) {
            logError('Error in getBatchQuotes:', error);
            
            // Record the failure for our backoff mechanism
            this.recordApiFailure();
            
            // Return whatever cached results we have
            return cachedResults;
        }
    }

    // Generate fallback data when real API data is unavailable
    generateFallbackStockData(symbol) {
        // Use the utility function for generating fallback data
        return indianStockUtils.generateFallbackData(symbol, false);
    }

    async getMarketIndices() {
        try {
            // Check cache first
            const cachedIndices = await marketDataCacheService.getIndices();
            if (cachedIndices) {
                return cachedIndices;
            }
            
            // Check if we should use fallback data due to API failures
            if (this.shouldUseFallback()) {
                console.log(`Using fallback data for market indices due to recent API failures`);
                return this.getFallbackMarketIndices();
            }

            // Define key indices for both NSE and BSE
            const indexSymbols = [
                '^NSEI',    // Nifty 50
                '^BSESN',   // Sensex
                '^NSEBANK', // Bank Nifty
                '^CNXIT'    // Nifty IT
            ];
            
            // Queue the Yahoo Finance API request for all indices at once
            const quotes = await Promise.allSettled(
                indexSymbols.map(symbol => 
                    queueRequest(async () => {
                        return yahooFinance.quote(symbol);
                    })
                )
            );
            
            // Process the results
            const indices = quotes
                .map((result, index) => {
                    if (result.status === 'fulfilled' && result.value) {
                        const quote = result.value;
                        const symbol = indexSymbols[index];
                        
                        return {
                            symbol: symbol,
                            name: indianStockUtils.INDEX_NAMES[symbol] || quote.shortName || quote.longName || symbol,
                            price: quote.regularMarketPrice || 0,
                            change: quote.regularMarketChange || 0,
                            changePercent: quote.regularMarketChangePercent || 0,
                            dayHigh: quote.regularMarketDayHigh || 0,
                            dayLow: quote.regularMarketDayLow || 0,
                            timestamp: Date.now()
                        };
                    } else {
                        // For failures, generate fallback data
                        const symbol = indexSymbols[index];
                        return this.generateFallbackIndexData(symbol);
                    }
                });
            
            // Cache the results
            await marketDataCacheService.cacheIndices(indices, 60); // Cache for 1 minute
            
            return indices;
        } catch (error) {
            console.error('Error fetching market indices:', error);
            // If we encounter an error, use fallback data
            return this.getFallbackMarketIndices();
        }
    }

    // Generate fallback market indices when real API data is unavailable
    async getFallbackMarketIndices() {
        // Define key indices for both NSE and BSE
        const indexSymbols = [
            '^NSEI',    // Nifty 50
            '^BSESN',   // Sensex
            '^NSEBANK', // Bank Nifty
            '^CNXIT'    // Nifty IT
        ];
        
        // Generate fallback data for each index
        const indices = indexSymbols.map(symbol => this.generateFallbackIndexData(symbol));
        
        // Cache the results
        await marketDataCacheService.cacheIndices(indices, 60); // Cache for 1 minute
        
        return indices;
    }
    
    // Generate fallback data for a specific market index
    generateFallbackIndexData(symbol) {
        return indianStockUtils.generateFallbackData(symbol, true);
    }

    async getNSEStocks() {
        try {
            // Get NSE stocks from cache or load from TOP_NSE_STOCKS
            const cachedStocks = await marketDataCacheService.get('nse_stocks');
            if (cachedStocks) {
                return cachedStocks;
            }
            
            const stocks = indianStockUtils.TOP_NSE_STOCKS.map(symbol => ({
                symbol: indianStockUtils.getBaseSymbol(symbol),
                exchange: 'NSE'
            }));
            
            await marketDataCacheService.set('nse_stocks', stocks, 3600); // Cache for 1 hour
            return stocks;
        } catch (error) {
            console.error('Error getting NSE stocks:', error);
            return [];
        }
    }
    
    async getBSEStocks() {
        try {
            // Get BSE stocks from cache or load from TOP_BSE_STOCKS
            const cachedStocks = await marketDataCacheService.get('bse_stocks');
            if (cachedStocks) {
                return cachedStocks;
            }
            
            const stocks = indianStockUtils.TOP_BSE_STOCKS.map(symbol => ({
                symbol: indianStockUtils.getBaseSymbol(symbol),
                exchange: 'BSE'
            }));
            
            await marketDataCacheService.set('bse_stocks', stocks, 3600); // Cache for 1 hour
            return stocks;
        } catch (error) {
            console.error('Error getting BSE stocks:', error);
            return [];
        }
    }

    async getQuote(symbol) {
        if (!symbol) {
            throw new Error('Symbol is required');
        }

        try {
            // Standardize symbol format using our utility function
            const baseSymbol = indianStockUtils.getBaseSymbol(symbol);
            
            // Check cache first
            const cacheKey = `quote_${baseSymbol}`;
            let stockData = await marketDataCacheService.getQuote(baseSymbol);
            
            if (stockData) {
                console.log(`Cache hit for quote: ${baseSymbol}`);
                return stockData;
            }

            // Determine which exchange to use for this request
            // Default to NSE, but allow override
            const fullSymbol = indianStockUtils.standardizeSymbol(symbol);
            
            console.log(`Fetching quote for: ${fullSymbol} (base: ${baseSymbol})`);
            
            // Check if we should use fallback data due to API failures
            if (this.shouldUseFallback()) {
                console.log(`Using fallback data for ${baseSymbol} due to recent API failures`);
                return this.generateFallbackStockData(baseSymbol);
            }

            // Queue the Yahoo Finance API request
            let quote;
            try {
                quote = await queueRequest(async () => {
                    return await yahooFinance.quote(fullSymbol);
                });
            } catch (error) {
                // Record the API failure
                this.recordApiFailure();
                console.error(`Yahoo Finance API error for ${fullSymbol}:`, error.message);
                
                // Try alternative exchange if the first one fails
                if (fullSymbol.endsWith('.NS')) {
                    try {
                        const bseSymbol = baseSymbol + '.BO';
                        console.log(`Retrying with BSE symbol: ${bseSymbol}`);
                        quote = await queueRequest(async () => {
                            return await yahooFinance.quote(bseSymbol);
                        });
                    } catch (bseError) {
                        console.error(`Failed with BSE symbol as well:`, bseError.message);
                        throw error; // Throw the original error
                    }
                } else if (fullSymbol.endsWith('.BO')) {
                    try {
                        const nseSymbol = baseSymbol + '.NS';
                        console.log(`Retrying with NSE symbol: ${nseSymbol}`);
                        quote = await queueRequest(async () => {
                            return await yahooFinance.quote(nseSymbol);
                        });
                    } catch (nseError) {
                        console.error(`Failed with NSE symbol as well:`, nseError.message);
                        throw error; // Throw the original error
                    }
                } else {
                    throw error;
                }
            }

            if (!quote) {
                console.log(`No quote data returned for ${fullSymbol}, generating fallback data`);
                return this.generateFallbackStockData(baseSymbol);
            }

            // Format the response
            stockData = {
                symbol: baseSymbol,
                name: quote.shortName || quote.longName || baseSymbol,
                price: quote.regularMarketPrice || 0,
                change: quote.regularMarketChange || 0,
                changePercent: quote.regularMarketChangePercent || 0,
                dayHigh: quote.regularMarketDayHigh || 0,
                dayLow: quote.regularMarketDayLow || 0,
                volume: quote.regularMarketVolume || 0,
                marketCap: quote.marketCap || 0,
                exchange: fullSymbol.endsWith('.NS') ? 'NSE' : 'BSE',
                peRatio: quote.trailingPE || 0,
                dividend: quote.dividendYield || 0,
                timestamp: Date.now()
            };

            // Cache the quote for 2 seconds (realtime data)
            await marketDataCacheService.cacheQuote(baseSymbol, stockData, 2);

            return stockData;
        } catch (error) {
            console.error(`Error fetching quote for ${symbol}:`, error);
            
            // If we encounter an error, use fallback data
            const baseSymbol = indianStockUtils.getBaseSymbol(symbol);
            return this.generateFallbackStockData(baseSymbol);
        }
    }

    async getTopStocks() {
        try {
            // Check cache first
            const cachedStocks = this.topStocksCache.get('topStocks');
            if (cachedStocks) {
                return cachedStocks;
            }
            
            // If we've had too many recent API failures, use fallback data immediately
            if (this.shouldUseFallback()) {
                console.log('Using fallback top stocks data due to recent API failures');
                const fallbackStocks = this.generateFallbackTopStocks();
                this.topStocksCache.set('topStocks', fallbackStocks);
                return fallbackStocks;
            }
            
            // For Indian markets, return top stocks from NSE
            try {
                const nseStocks = await this.getNSEStocks();
                const topStocks = nseStocks.slice(0, 20); // Get top 20 stocks
                const result = topStocks.map(stock => ({
                    symbol: stock.symbol,
                    name: stock.name,
                    price: stock.price,
                    change: stock.change,
                    changePercent: stock.changePercent
                }));
                
                // Cache the results
                this.topStocksCache.set('topStocks', result);
                return result;
            } catch (error) {
                // Record the API failure
                this.recordApiFailure();
                logError('Error fetching top stocks:', error);
                const fallbackStocks = this.generateFallbackTopStocks();
                this.topStocksCache.set('topStocks', fallbackStocks);
                return fallbackStocks;
            }
        } catch (error) {
            logError('Error fetching top stocks:', error);
            return this.generateFallbackTopStocks();
        }
    }
    
    // Generate fallback data for top stocks
    generateFallbackTopStocks() {
        const symbols = [
            'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
            'KOTAKBANK', 'ITC', 'HINDUNILVR', 'LT', 'SBIN',
            'BAJFINANCE', 'BHARTIARTL', 'ASIANPAINT', 'AXISBANK', 'MARUTI',
            'TECHM', 'TITAN', 'WIPRO', 'ULTRACEMCO', 'SUNPHARMA'
        ];
        
        return symbols.map(symbol => ({
            symbol,
            name: symbol,
            price: Math.random() * 1000 + 500, // Random price between 500 and 1500
            change: Math.random() * 20 - 10, // Random change between -10 and 10
            changePercent: Math.random() * 4 - 2 // Random percent between -2% and 2%
        }));
    }
}

export default new StockMarketService();