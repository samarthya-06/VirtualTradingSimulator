import express from 'express';
import asyncHandler from 'express-async-handler';
import yahooFinance from 'yahoo-finance2';
import Stock from '../models/stockModel.js';
import marketDataCacheService from '../services/marketDataCacheService.js';
import webSocketService from '../services/webSocketService.js';
import stockNewsService from '../services/stockNewsService.js';
import marketNewsService from '../services/marketNewsService.js';

// @desc    Search stocks
// @route   GET /api/market/search
// @access  Private
const searchStocks = asyncHandler(async (req, res) => {
    const { query } = req.query;

    if (!query || query.length < 2) {
        return res.status(400).json({ error: 'Search query must be at least 2 characters long' });
    }

    try {
        // Check cache first for this query
        const cachedResults = await marketDataCacheService.getSearchResults(query);
        if (cachedResults) {
            return res.json(cachedResults);
        }

        // Search in database first
        const dbResults = await Stock.find({
            $or: [
                { symbol: { $regex: query.toUpperCase(), $options: 'i' } },
                { name: { $regex: query, $options: 'i' } },
                { companyName: { $regex: query, $options: 'i' } }
            ]
        }).limit(15);

        // If we have enough results from DB, return them
        if (dbResults.length >= 5) {
            const formattedResults = dbResults.map(stock => ({
                symbol: stock.symbol,
                name: stock.companyName || stock.name,
                exchange: stock.exchange,
                type: 'EQUITY',
                lastPrice: stock.currentPrice || 0,
                change: stock.currentPrice - stock.previousClose || 0,
                changePercent: ((stock.currentPrice - stock.previousClose) / stock.previousClose) * 100 || 0
            }));

            // Cache the results
            await marketDataCacheService.cacheSearchResults(query, formattedResults);

            return res.json(formattedResults);
        }

        // Try to search with both NSE and BSE suffixes
        const suffixes = ['', '.NS', '.BO'];
        let yahooResults = [];

        // Try each suffix
        for (const suffix of suffixes) {
            try {
                const searchQuery = suffix ? query : query;
                const results = await yahooFinance.search(searchQuery, {
                    newsCount: 0,
                    quotesCount: 20,
                    enableNavLinks: false,
                    enableEnhancedTrivialQuery: true
                });

                if (results && results.quotes && results.quotes.length > 0) {
                    yahooResults = [...yahooResults, ...results.quotes];
                }
            } catch (error) {
                console.error(`Error searching with suffix ${suffix}:`, error.message);
                // Continue with other suffixes
            }
        }

        // Filter and transform the results
        const stocks = yahooResults
            .filter(quote => {
                if (!quote || !quote.symbol) return false;

                // Include stocks from NSE and BSE
                const symbol = quote.symbol.toUpperCase();
                const exchange = quote.exchange?.toUpperCase() || '';

                return exchange === 'NSE' ||
                       exchange === 'BSE' ||
                       symbol.endsWith('.NS') ||
                       symbol.endsWith('.BO') ||
                       // Also include stocks that might be Indian but don't have the suffix yet
                       (quote.quoteType === 'EQUITY' &&
                        (quote.shortName?.includes('India') ||
                         quote.longName?.includes('India') ||
                         quote.shortName?.includes('Ltd') ||
                         quote.longName?.includes('Limited')));
            })
            .map(quote => {
                // Determine exchange
                let exchange = 'UNKNOWN';
                if (quote.symbol.endsWith('.NS')) {
                    exchange = 'NSE';
                } else if (quote.symbol.endsWith('.BO')) {
                    exchange = 'BSE';
                } else if (quote.exchange) {
                    exchange = quote.exchange;
                }

                // Clean symbol (remove exchange suffix)
                let symbol = quote.symbol;
                if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) {
                    symbol = symbol.substring(0, symbol.length - 3);
                }

                return {
                    symbol: symbol,
                    name: quote.shortName || quote.longName || symbol,
                    exchange: exchange,
                    type: quote.quoteType || 'EQUITY',
                    lastPrice: quote.regularMarketPrice || 0,
                    change: quote.regularMarketChange || 0,
                    changePercent: quote.regularMarketChangePercent || 0
                };
            });

        // Combine and deduplicate results
        const allResults = [...dbResults.map(stock => ({
            symbol: stock.symbol,
            name: stock.companyName || stock.name,
            exchange: stock.exchange,
            type: 'EQUITY',
            lastPrice: stock.currentPrice || 0,
            change: stock.currentPrice - stock.previousClose || 0,
            changePercent: ((stock.currentPrice - stock.previousClose) / stock.previousClose) * 100 || 0
        }))];

        stocks.forEach(stock => {
            if (!allResults.some(r => r.symbol === stock.symbol && r.exchange === stock.exchange)) {
                allResults.push(stock);
            }
        });

        // Sort results by relevance (exact matches first, then partial matches)
        const sortedResults = allResults.sort((a, b) => {
            // Exact symbol match gets highest priority
            if (a.symbol?.toUpperCase() === query.toUpperCase()) return -1;
            if (b.symbol?.toUpperCase() === query.toUpperCase()) return 1;

            // Starts with query gets next priority
            if (a.symbol?.toUpperCase().startsWith(query.toUpperCase()) && !b.symbol?.toUpperCase().startsWith(query.toUpperCase())) return -1;
            if (b.symbol?.toUpperCase().startsWith(query.toUpperCase()) && !a.symbol?.toUpperCase().startsWith(query.toUpperCase())) return 1;

            // Contains query gets next priority
            if (a.symbol?.toUpperCase().includes(query.toUpperCase()) && !b.symbol?.toUpperCase().includes(query.toUpperCase())) return -1;
            if (b.symbol?.toUpperCase().includes(query.toUpperCase()) && !a.symbol?.toUpperCase().includes(query.toUpperCase())) return 1;

            // Name matches
            if (a.name?.toUpperCase().includes(query.toUpperCase()) && !b.name?.toUpperCase().includes(query.toUpperCase())) return -1;
            if (b.name?.toUpperCase().includes(query.toUpperCase()) && !a.name?.toUpperCase().includes(query.toUpperCase())) return 1;

            return 0;
        });

        const finalResults = sortedResults.slice(0, 15); // Limit to top 15 results

        // Cache the results
        await marketDataCacheService.cacheSearchResults(query, finalResults);

        res.json(finalResults);
    } catch (error) {
        console.error('Search error:', error);
        // If database results exist, return them even if Yahoo Finance fails
        if (dbResults && dbResults.length > 0) {
            const formattedResults = dbResults.map(stock => ({
                symbol: stock.symbol,
                name: stock.companyName || stock.name,
                exchange: stock.exchange,
                type: 'EQUITY',
                lastPrice: stock.currentPrice || 0,
                change: stock.currentPrice - stock.previousClose || 0,
                changePercent: ((stock.currentPrice - stock.previousClose) / stock.previousClose) * 100 || 0
            }));
            return res.json(formattedResults);
        }
        res.status(500).json({ error: 'Failed to search stocks' });
    }
});

// @desc    Get real-time stock data
// @route   GET /api/market/quote/:symbol
// @access  Private
const getQuote = asyncHandler(async (req, res) => {
    const { symbol } = req.params;

    try {
        // Handle numeric symbol cases
        if (!isNaN(symbol)) {
            // Map common numeric indices to actual symbols
            const numericToSymbol = {
                '0': 'RELIANCE',
                '1': 'TCS',
                '2': 'HDFCBANK',
                '3': 'INFY',
                '4': 'ICICIBANK',
                '5': 'HINDUNILVR',
                '6': 'SBIN',
                '7': 'BHARTIARTL',
                '8': 'KOTAKBANK',
                '9': 'ITC',
                '10': 'LT',
                '11': 'AXISBANK',
                '12': 'WIPRO',
                '13': 'BAJFINANCE',
                '14': 'HCLTECH'
            };

            const actualSymbol = numericToSymbol[symbol] || 'RELIANCE';
            // Redirect to the actual stock symbol
            return res.redirect(`/api/market/quote/${actualSymbol}`);
        }

        // First check if we have this stock in our database
        const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '');
        const stockInDb = await Stock.findOne({ symbol: cleanSymbol });

        // Check cache first
        const cachedQuote = await marketDataCacheService.getQuote(cleanSymbol);
        if (cachedQuote) {
            return res.json(cachedQuote);
        }

        // Try both NSE and BSE suffixes with Yahoo Finance
        const suffixes = ['.NS', '.BO'];
        let lastError = null;
        let quote = null;

        for (const suffix of suffixes) {
            try {
                // Fix Yahoo Finance validation errors by removing fields param
                quote = await yahooFinance.quote(cleanSymbol + suffix);

                if (quote && quote.regularMarketPrice) {
                    // Create response object
                    const quoteResponse = {
                        symbol: cleanSymbol,
                        name: quote.shortName || quote.longName || cleanSymbol,
                        price: quote.regularMarketPrice,
                        change: quote.regularMarketChange || 0,
                        changePercent: quote.regularMarketChangePercent || 0,
                        dayHigh: quote.regularMarketDayHigh || quote.regularMarketPrice,
                        dayLow: quote.regularMarketDayLow || quote.regularMarketPrice,
                        volume: quote.regularMarketVolume || 0,
                        marketCap: quote.marketCap || 0,
                        exchange: suffix === '.NS' ? 'NSE' : 'BSE',
                        previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice - (quote.regularMarketChange || 0)
                    };

                    // Cache the result
                    await marketDataCacheService.cacheQuote(cleanSymbol, quoteResponse);

                    // Return the successful quote
                    return res.json(quoteResponse);
                }
            } catch (error) {
                console.error(`Error fetching quote for ${cleanSymbol}${suffix}:`, error);
                lastError = error;
            }
        }

        // If we have the stock in DB, return that data as fallback
        if (stockInDb) {
            const dbQuote = {
                symbol: cleanSymbol,
                name: stockInDb.companyName || stockInDb.name || cleanSymbol,
                price: stockInDb.currentPrice || 0,
                change: stockInDb.currentPrice - stockInDb.previousClose || 0,
                changePercent: ((stockInDb.currentPrice - stockInDb.previousClose) / stockInDb.previousClose) * 100 || 0,
                dayHigh: stockInDb.dayHigh || stockInDb.currentPrice || 0,
                dayLow: stockInDb.dayLow || stockInDb.currentPrice || 0,
                volume: stockInDb.volume || 0,
                marketCap: stockInDb.marketCap || 0,
                exchange: stockInDb.exchange || 'NSE',
                previousClose: stockInDb.previousClose || 0
            };

            return res.json(dbQuote);
        }

        // Use fallback data if everything else fails
        try {
            const indianStockUtils = await import('../utils/indianStockUtils.js');
            const fallbackData = indianStockUtils.default.generateFallbackData(cleanSymbol, false);

            const fallbackQuote = {
                symbol: cleanSymbol,
                name: cleanSymbol,
                price: fallbackData.price,
                change: fallbackData.change,
                changePercent: fallbackData.changePercent,
                dayHigh: fallbackData.high,
                dayLow: fallbackData.low,
                volume: fallbackData.volume,
                marketCap: fallbackData.price * 1000000000, // Estimate market cap
                exchange: 'NSE',
                previousClose: fallbackData.previousClose,
                isFallback: true
            };

            // Cache the fallback result
            await marketDataCacheService.cacheQuote(cleanSymbol, fallbackQuote, 30);

            return res.json(fallbackQuote);
        } catch (fallbackError) {
            console.error('Error generating fallback data:', fallbackError);

            // If all attempts failed, return minimal data to avoid breaking the UI
            return res.json({
                symbol: cleanSymbol,
                name: cleanSymbol,
                price: 0,
                change: 0,
                changePercent: 0,
                dayHigh: 0,
                dayLow: 0,
                volume: 0,
                marketCap: 0,
                exchange: 'UNKNOWN',
                previousClose: 0,
                error: true,
                errorMessage: 'Failed to fetch stock data'
            });
        }
    } catch (error) {
        console.error(`Error in getQuote for ${symbol}:`, error);
        res.status(500).json({ error: error.message || 'Failed to fetch stock quote' });
    }
});

// Helper function to fetch market indices data
const fetchMarketIndices = async () => {
    const indices = ['^NSEI', '^BSESN']; // NIFTY 50 and SENSEX

    try {
        // Check if we have cached indices data
        const cachedIndices = await marketDataCacheService.getIndices();
        if (cachedIndices) {
            return cachedIndices;
        }

        const quotes = await Promise.all(
            indices.map(async (symbol) => {
                try {
                    const quote = await yahooFinance.quote(symbol);
                    return quote;
                } catch (error) {
                    console.error(`Error fetching index ${symbol}:`, error.message);
                    return null;
                }
            })
        );

        const filteredQuotes = quotes.filter(quote => quote !== null);

        // Format the response for the frontend
        const formattedIndices = filteredQuotes.map(quote => {
            const isNifty = quote.symbol === '^NSEI';
            return {
                symbol: isNifty ? 'NIFTY50' : 'SENSEX',
                name: isNifty ? 'NIFTY 50' : 'BSE SENSEX',
                price: quote.regularMarketPrice || 0,
                change: quote.regularMarketChangePercent || 0,
                volume: quote.regularMarketVolume || 0,
                timestamp: Date.now()
            };
        });

        // Cache the formatted indices
        if (formattedIndices.length > 0) {
            await marketDataCacheService.cacheIndices(formattedIndices);
        }

        return formattedIndices;
    } catch (error) {
        console.error('Indices error:', error.message);
        return [];
    }
};

// Helper function for socket.io to get market indices data
const getMarketIndicesData = async () => {
    try {
        return await fetchMarketIndices();
    } catch (error) {
        console.error('Error in getMarketIndicesData:', error);
        return []; // Return empty array on error to prevent app crashes
    }
};

// @desc    Get market indices (NIFTY 50 and SENSEX)
// @route   GET /api/market/indices
// @access  Private
const getMarketIndices = asyncHandler(async (req, res) => {
    try {
        const indices = await getMarketIndicesData();
        res.json(indices);
    } catch (error) {
        console.error('Indices error:', error);
        res.status(500).json({ error: 'Failed to fetch market indices' });
    }
});

// Socket.IO event handlers
const setupSocketHandlers = (io) => {
    // Increase the max listeners to prevent warnings
    io.sockets.setMaxListeners(30); // Increase from default 10 to 30

    // Set priority symbols for market overview screen - these will always get updated
    const prioritySymbols = [
        'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
        'HINDUNILVR', 'SBIN', 'BHARTIARTL', 'ITC', 'KOTAKBANK'
    ];

    // Key market indices to always keep updated
    const priorityIndices = [
        '^NSEI', // NIFTY 50
        '^BSESN', // SENSEX
        '^NSEBANK', // BANK NIFTY
        '^CNXIT' // NIFTY IT
    ];

    // Set up priority symbols and indices in the WebSocketService
    for (const symbol of prioritySymbols) {
        webSocketService.setPrioritySymbol(symbol);
        webSocketService.subscribe(symbol);
    }

    for (const index of priorityIndices) {
        webSocketService.setPrioritySymbol(index);
        webSocketService.subscribe(index);
    }

    // Initialize client connection counter
    let connectedClients = 0;

    io.on('connection', (socket) => {
        // Allow more listeners on each socket to prevent warnings
        socket.setMaxListeners(20);

        // Increment connected clients counter
        connectedClients++;
        console.log(`Client connected: ${socket.id} (Total: ${connectedClients})`);

        // Send initial priority data immediately
        sendPriorityData(socket);

        // Track subscribed symbols for this socket
        const subscribedSymbols = new Set();

        // Track handler references for proper cleanup
        const handlerKeys = new Map();

        // Handle client disconnection
        socket.on('disconnect', (reason) => {
            // Decrement connected clients counter
            connectedClients--;
            console.log(`Client disconnected: ${socket.id}, reason: ${reason} (Total: ${connectedClients})`);

            // Clean up all handler references
            for (const [symbol, handlerKey] of handlerKeys.entries()) {
                const handler = handlerKey.handler;
                webSocketService.removeMessageHandler('quote_update', handler, handlerKey.key);
            }
            handlerKeys.clear();

            // Unsubscribe from all symbols on disconnect (except priority symbols)
            for (const symbol of subscribedSymbols) {
                // Only unsubscribe if not a priority symbol
                if (!prioritySymbols.includes(symbol) && !priorityIndices.includes(symbol)) {
                    webSocketService.unsubscribe(symbol);
                }
            }
            subscribedSymbols.clear();
        });

        // Handle symbol subscription
        socket.on('subscribe_symbol', (symbol) => {
            if (!symbol) return;

            // Clean the symbol
            const cleanSymbol = symbol.replace(/\s+/g, '').toUpperCase();

            // Add to tracking set
            subscribedSymbols.add(cleanSymbol);

            // Start real-time updates via the WebSocket service
            webSocketService.subscribe(cleanSymbol);

            // Send immediate data to reduce perceived latency
            sendImmediateSymbolData(socket, cleanSymbol);

            // Set up handler for quote updates specific to this socket
            const quoteUpdateHandler = (message) => {
                if (message.type === 'quote_update' && message.symbol === cleanSymbol) {
                    socket.emit('stock_update', message.data);
                }
            };

            // Register the handler with socket ID for tracking
            const handlerKey = webSocketService.addMessageHandler('quote_update', quoteUpdateHandler, socket.id);

            // Store handler reference for cleanup
            handlerKeys.set(cleanSymbol, {
                handler: quoteUpdateHandler,
                key: handlerKey
            });

            // Handle unsubscription
            socket.on('unsubscribe_symbol', (unsymbol) => {
                if (unsymbol === cleanSymbol) {
                    subscribedSymbols.delete(cleanSymbol);

                    // Clean up the handler if it exists
                    if (handlerKeys.has(cleanSymbol)) {
                        const handlerData = handlerKeys.get(cleanSymbol);
                        webSocketService.removeMessageHandler('quote_update', handlerData.handler, handlerData.key);
                        handlerKeys.delete(cleanSymbol);
                    }

                    // Only unsubscribe if not a priority symbol
                    if (!prioritySymbols.includes(cleanSymbol) && !priorityIndices.includes(cleanSymbol)) {
                        webSocketService.unsubscribe(cleanSymbol);
                    }
                }
            });
        });

        // Handle search request for real-time data
        socket.on('search_stock', async (query) => {
            try {
                const stockMarketService = await import('../services/stockMarketService.js').then(m => m.default);
                const results = await stockMarketService.searchStocks(query);
                socket.emit('search_results', results);

                // If search returns results, fetch real-time data for the first 5 results
                if (results && results.length > 0) {
                    const topResults = results.slice(0, 5);
                    for (const stock of topResults) {
                        // Add proper suffix for exchange if not present
                        let symbol = stock.symbol;
                        if (!symbol.includes('.')) {
                            symbol = stock.exchange === 'BSE' ? `${symbol}.BO` : `${symbol}.NS`;
                        }

                        // Start real-time updates for this symbol
                        webSocketService.fetchStockData(symbol);
                    }
                }
            } catch (error) {
                console.error('Search error:', error);
                socket.emit('error', { message: 'Failed to search stocks' });
            }
        });

        // Get real-time quote for a specific stock
        socket.on('get_quote', async (symbol) => {
            if (!symbol) return;

            try {
                // Clean the symbol
                const cleanSymbol = symbol.replace(/\s+/g, '').toUpperCase();

                // Check if already in cache
                const cachedData = await marketDataCacheService.getQuote(cleanSymbol);
                if (cachedData) {
                    socket.emit('stock_data', cachedData);
                }

                // Subscribe to real-time updates
                socket.emit('subscribing', { symbol: cleanSymbol });
                socket.emit('subscribe_symbol', cleanSymbol);
            } catch (error) {
                console.error(`Error getting quote for ${symbol}:`, error);
                socket.emit('error', { message: 'Failed to get stock data' });
            }
        });

        socket.on('get_initial_data', async () => {
            try {
                // Fetch market indices
                const indices = await getMarketIndicesData();

                // Get top stocks data
                const stockMarketService = await import('../services/stockMarketService.js').then(m => m.default);
                const topStocks = await stockMarketService.getTopStocks();

                // Setup real-time updates for all top stocks
                for (const stock of topStocks) {
                    if (stock.symbol) {
                        // Mark top stocks as priority
                        if (prioritySymbols.includes(stock.symbol)) {
                            webSocketService.setPrioritySymbol(stock.symbol);
                        }

                        // Start real-time updates in the background
                        webSocketService.subscribe(stock.symbol);
                    }
                }

                socket.emit('initial_market_data', {
                    indices,
                    topStocks
                });
            } catch (error) {
                console.error('Error fetching initial data:', error);
                socket.emit('error', { message: 'Failed to fetch initial market data' });
            }
        });

        // Get data for Technical Analysis screen
        socket.on('get_technical_data', async (symbol, timeframe = 'daily') => {
            if (!symbol) return;

            try {
                const cleanSymbol = symbol.replace(/\s+/g, '').toUpperCase();

                // Mark as priority for real-time updates
                webSocketService.setPrioritySymbol(cleanSymbol);

                // Start real-time updates with higher priority
                webSocketService.subscribe(cleanSymbol);

                // Get historical data for technical analysis
                const marketDataService = await import('../services/marketDataService.js');
                const historicalData = await marketDataService.getHistoricalData(cleanSymbol, timeframe, 200);

                socket.emit('technical_data', {
                    symbol: cleanSymbol,
                    timeframe,
                    data: historicalData
                });
            } catch (error) {
                console.error(`Error getting technical data for ${symbol}:`, error);
                socket.emit('error', { message: 'Failed to get technical analysis data' });
            }
        });
    });
};

// Helper function to send immediate data for a symbol
const sendImmediateSymbolData = async (socket, symbol) => {
    try {
        const cachedData = await marketDataCacheService.getQuote(symbol);
        if (cachedData) {
            socket.emit('stock_update', cachedData);
        } else {
            // Trigger immediate data fetch
            webSocketService.fetchStockData(symbol);
        }
    } catch (error) {
        console.error(`Error sending immediate data for ${symbol}:`, error);
    }
};

// Helper function to send priority data (indices and key stocks)
const sendPriorityData = async (socket) => {
    try {
        // Get indices
        const indices = await getMarketIndicesData();
        if (indices && indices.length > 0) {
            socket.emit('indices_update', indices);
        }

        // Get priority stocks - define priority symbols locally if they're not accessible
        const prioritySymbols = [
            'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
            'HINDUNILVR', 'SBIN', 'BHARTIARTL', 'ITC', 'KOTAKBANK'
        ];

        const priorityStockData = [];
        for (const symbol of prioritySymbols) {
            const data = await marketDataCacheService.getQuote(symbol);
            if (data) {
                priorityStockData.push(data);
            }
        }

        if (priorityStockData.length > 0) {
            socket.emit('priority_stocks_update', priorityStockData);
        }
    } catch (error) {
        console.error('Error sending priority data:', error);
    }
};

// @desc    Get NSE stocks
// @route   GET /api/market/nse
// @access  Private
const getNSEStocks = asyncHandler(async (req, res) => {
    try {
        // Check cache first - use longer cache duration
        const cachedStocks = await marketDataCacheService.getTopStocks('nse');
        if (cachedStocks) {
            return res.json(cachedStocks);
        }

        // Expanded list of popular NSE stocks
        const symbols = [
            'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
            'HINDUNILVR.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS', 'KOTAKBANK.NS',
            'LT.NS', 'AXISBANK.NS', 'BAJFINANCE.NS', 'ASIANPAINT.NS', 'MARUTI.NS',
            'TITAN.NS', 'SUNPHARMA.NS', 'WIPRO.NS', 'HCLTECH.NS', 'ULTRACEMCO.NS',
            'TATAMOTORS.NS', 'ADANIENT.NS', 'NTPC.NS', 'POWERGRID.NS', 'TATASTEEL.NS',
            'ONGC.NS', 'JSWSTEEL.NS', 'ADANIPORTS.NS', 'BAJAJFINSV.NS', 'NESTLEIND.NS'
        ];

        // Optimize DB query with projection to only get needed fields
        const dbStocks = await Stock.find(
            {
                symbol: { $in: symbols.map(s => s.replace('.NS', '')) },
                exchange: 'NSE',
                lastUpdated: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            },
            {
                symbol: 1,
                companyName: 1,
                currentPrice: 1,
                previousClose: 1,
                volume: 1,
                marketCap: 1,
                lastUpdated: 1
            }
        ).lean(); // Use lean for better performance

        // Create a map for quick lookup
        const dbStocksMap = {};
        dbStocks.forEach(stock => {
            dbStocksMap[stock.symbol] = stock;
        });

        // Fetch from Yahoo Finance in batches to avoid rate limiting
        const batchSize = 10; // Increased batch size
        const batches = [];
        for (let i = 0; i < symbols.length; i += batchSize) {
            batches.push(symbols.slice(i, i + batchSize));
        }

        let allQuotes = [];

        // Process batches in parallel - with a concurrency limit
        const concurrencyLimit = 2; // Process 2 batches at a time
        for (let i = 0; i < batches.length; i += concurrencyLimit) {
            const batchesToProcess = batches.slice(i, i + concurrencyLimit);
            const batchResults = await Promise.all(
                batchesToProcess.map(async (batch) => {
                    return Promise.all(
                        batch.map(async (symbol) => {
                            try {
                                const cleanSymbol = symbol.replace('.NS', '');

                                // If we have this stock in DB and it was updated recently, use that
                                if (dbStocksMap[cleanSymbol]) {
                                    const stock = dbStocksMap[cleanSymbol];
                                    return {
                                        symbol: cleanSymbol,
                                        name: stock.companyName,
                                        price: stock.currentPrice,
                                        change: stock.currentPrice - stock.previousClose,
                                        changePercent: ((stock.currentPrice - stock.previousClose) / stock.previousClose) * 100,
                                        volume: stock.volume,
                                        marketCap: stock.marketCap,
                                        exchange: 'NSE',
                                        timestamp: Date.now()
                                    };
                                }

                                // Otherwise fetch from Yahoo Finance
                                const quote = await yahooFinance.quote(symbol);
                                if (quote) {
                                    return {
                                        symbol: cleanSymbol,
                                        name: quote.shortName || quote.longName || cleanSymbol,
                                        price: quote.regularMarketPrice || 0,
                                        change: quote.regularMarketChange || 0,
                                        changePercent: quote.regularMarketChangePercent || 0,
                                        volume: quote.regularMarketVolume || 0,
                                        marketCap: quote.marketCap || 0,
                                        exchange: 'NSE',
                                        timestamp: Date.now()
                                    };
                                }
                                return null;
                            } catch (error) {
                                console.error(`Error fetching quote for ${symbol}:`, error.message);
                                return null;
                            }
                        })
                    );
                })
            );

            // Flatten results
            allQuotes = [...allQuotes, ...batchResults.flat()];

            // Add a smaller delay between batch groups
            if (i + concurrencyLimit < batches.length) {
                await new Promise(resolve => setTimeout(resolve, 200)); // Reduced delay
            }
        }

        // Filter out null values
        const validQuotes = allQuotes.filter(quote => quote !== null);

        // Cache the results with longer expiry (5 minutes)
        if (validQuotes.length > 0) {
            await marketDataCacheService.cacheTopStocks('nse', validQuotes, 300);
        }

        res.json(validQuotes);
    } catch (error) {
        console.error('Error fetching NSE stocks:', error.message);
        res.status(500).json({ error: 'Failed to fetch NSE stocks' });
    }
});

// @desc    Get BSE stocks
// @route   GET /api/market/bse
// @access  Private
const getBSEStocks = asyncHandler(async (req, res) => {
    try {
        // Check cache first - use longer cache duration
        const cachedStocks = await marketDataCacheService.getTopStocks('bse');
        if (cachedStocks) {
            return res.json(cachedStocks);
        }

        // Expanded list of popular BSE stocks
        const symbols = [
            'RELIANCE.BO', 'TCS.BO', 'HDFCBANK.BO', 'INFY.BO', 'ICICIBANK.BO',
            'HINDUNILVR.BO', 'SBIN.BO', 'BHARTIARTL.BO', 'ITC.BO', 'KOTAKBANK.BO',
            'LT.BO', 'AXISBANK.BO', 'BAJFINANCE.BO', 'ASIANPAINT.BO', 'MARUTI.BO',
            'TITAN.BO', 'SUNPHARMA.BO', 'WIPRO.BO', 'HCLTECH.BO', 'ULTRACEMCO.BO',
            'TATAMOTORS.BO', 'ADANIENT.BO', 'NTPC.BO', 'POWERGRID.BO', 'TATASTEEL.BO',
            'ONGC.BO', 'JSWSTEEL.BO', 'ADANIPORTS.BO', 'BAJAJFINSV.BO', 'NESTLEIND.BO'
        ];

        // Optimize DB query with projection to only get needed fields
        const dbStocks = await Stock.find(
            {
                symbol: { $in: symbols.map(s => s.replace('.BO', '')) },
                exchange: 'BSE',
                lastUpdated: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            },
            {
                symbol: 1,
                companyName: 1,
                currentPrice: 1,
                previousClose: 1,
                volume: 1,
                marketCap: 1,
                lastUpdated: 1
            }
        ).lean(); // Use lean for better performance

        // Create a map for quick lookup
        const dbStocksMap = {};
        dbStocks.forEach(stock => {
            dbStocksMap[stock.symbol] = stock;
        });

        // Fetch from Yahoo Finance in batches to avoid rate limiting
        const batchSize = 10; // Increased batch size
        const batches = [];
        for (let i = 0; i < symbols.length; i += batchSize) {
            batches.push(symbols.slice(i, i + batchSize));
        }

        let allQuotes = [];

        // Process batches in parallel - with a concurrency limit
        const concurrencyLimit = 2; // Process 2 batches at a time
        for (let i = 0; i < batches.length; i += concurrencyLimit) {
            const batchesToProcess = batches.slice(i, i + concurrencyLimit);
            const batchResults = await Promise.all(
                batchesToProcess.map(async (batch) => {
                    return Promise.all(
                        batch.map(async (symbol) => {
                            try {
                                const cleanSymbol = symbol.replace('.BO', '');

                                // If we have this stock in DB and it was updated recently, use that
                                if (dbStocksMap[cleanSymbol]) {
                                    const stock = dbStocksMap[cleanSymbol];
                                    return {
                                        symbol: cleanSymbol,
                                        name: stock.companyName,
                                        price: stock.currentPrice,
                                        change: stock.currentPrice - stock.previousClose,
                                        changePercent: ((stock.currentPrice - stock.previousClose) / stock.previousClose) * 100,
                                        volume: stock.volume,
                                        marketCap: stock.marketCap,
                                        exchange: 'BSE',
                                        timestamp: Date.now()
                                    };
                                }

                                // Otherwise fetch from Yahoo Finance
                                const quote = await yahooFinance.quote(symbol);
                                if (quote) {
                                    return {
                                        symbol: cleanSymbol,
                                        name: quote.shortName || quote.longName || cleanSymbol,
                                        price: quote.regularMarketPrice || 0,
                                        change: quote.regularMarketChange || 0,
                                        changePercent: quote.regularMarketChangePercent || 0,
                                        volume: quote.regularMarketVolume || 0,
                                        marketCap: quote.marketCap || 0,
                                        exchange: 'BSE',
                                        timestamp: Date.now()
                                    };
                                }
                                return null;
                            } catch (error) {
                                console.error(`Error fetching quote for ${symbol}:`, error.message);
                                return null;
                            }
                        })
                    );
                })
            );

            // Flatten results
            allQuotes = [...allQuotes, ...batchResults.flat()];

            // Add a smaller delay between batch groups
            if (i + concurrencyLimit < batches.length) {
                await new Promise(resolve => setTimeout(resolve, 200)); // Reduced delay
            }
        }

        // Filter out null values
        const validQuotes = allQuotes.filter(quote => quote !== null);

        // Cache the results with longer expiry (5 minutes)
        if (validQuotes.length > 0) {
            await marketDataCacheService.cacheTopStocks('bse', validQuotes, 300);
        }

        res.json(validQuotes);
    } catch (error) {
        console.error('Error fetching BSE stocks:', error.message);
        res.status(500).json({ error: 'Failed to fetch BSE stocks' });
    }
});

// @desc    Get stock history
// @route   GET /api/market/history/:symbol
// @access  Private
const getStockHistory = asyncHandler(async (req, res) => {
    const { symbol } = req.params;
    const { range = '1d', interval = '5m' } = req.query;

    try {
        // Clean the symbol (remove any existing exchange suffix)
        const cleanSymbol = symbol.replace(/\.(NS|BO)$/i, '');

        // Check cache first
        const cacheKey = `stock_history:${cleanSymbol}:${range}:${interval}`;
        const cachedHistory = await marketDataCacheService.getCustomCache(cacheKey);
        if (cachedHistory) {
            return res.json(cachedHistory);
        }

        // Calculate appropriate time periods based on range
        let period1 = new Date();
        const period2 = new Date(); // Current time

        // Set period1 based on the requested range
        switch(range) {
            case '1d':
                period1 = new Date(period2.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '5d':
                period1 = new Date(period2.getTime() - 5 * 24 * 60 * 60 * 1000);
                break;
            case '1mo':
                period1 = new Date(period2.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '3mo':
                period1 = new Date(period2.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '6mo':
                period1 = new Date(period2.getTime() - 180 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                period1 = new Date(period2.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            case '5y':
                period1 = new Date(period2.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                period1 = new Date(period2.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days
        }

        console.log(`Fetching history for ${cleanSymbol} with range: ${range}, interval: ${interval}`);
        console.log(`Time period: ${period1.toISOString()} to ${period2.toISOString()}`);

        // Try both NSE and BSE suffixes
        const suffixes = ['.NS', '.BO'];
        let result = null;
        let lastError = null;

        for (const suffix of suffixes) {
            try {
                // Use the chart method for historical data
                result = await yahooFinance.chart(cleanSymbol + suffix, {
                    period1,
                    period2,
                    interval,
                    events: 'history',
                    includeAdjustedClose: true
                });

                if (result && result.quotes && result.quotes.length > 0) {
                    console.log(`Successfully fetched ${result.quotes.length} data points for ${cleanSymbol}${suffix}`);
                    break; // Break the loop if we got valid data
                }
            } catch (error) {
                console.error(`Error fetching history for ${cleanSymbol}${suffix}:`, error);
                lastError = error;
            }
        }

        if (!result || !result.quotes || result.quotes.length === 0) {
            console.log(`No data found, generating dummy data for ${cleanSymbol} with range ${range}, interval ${interval}`);
            // Generate dummy data if no real data found
            const dummyHistory = generateDummyStockHistory(cleanSymbol, interval, range);

            const response = {
                symbol: cleanSymbol,
                history: dummyHistory,
                note: 'Using simulated data'
            };

            // Cache the results but with shorter TTL
            await marketDataCacheService.setCustomCache(cacheKey, response, 5 * 60); // Cache for 5 minutes

            return res.json(response);
        }

        // Ensure all data points have all required fields and format timestamps consistently
        const formattedHistory = result.quotes.map(quote => {
            // Convert timestamp to milliseconds if it's in seconds
            const timestamp = typeof quote.timestamp === 'number'
                ? (quote.timestamp > 10000000000 ? quote.timestamp : quote.timestamp * 1000)
                : new Date(quote.date).getTime();

            return {
                date: quote.date,
                timestamp: timestamp,
                open: quote.open || quote.close || 0,
                high: quote.high || quote.close || 0,
                low: quote.low || quote.close || 0,
                close: quote.close || 0,
                volume: quote.volume || 0,
                adjclose: quote.adjclose || quote.close || 0
            };
        });

        const response = {
            symbol: cleanSymbol,
            history: formattedHistory,
            range: range,
            interval: interval
        };

        // Cache the results
        await marketDataCacheService.setCustomCache(cacheKey, response, 15 * 60); // Cache for 15 minutes

        res.json(response);
    } catch (error) {
        console.error(`Error fetching history for ${symbol}:`, error);

        // Generate dummy data as fallback
        const cleanSymbol = symbol.replace(/\.(NS|BO)$/i, '');
        const dummyHistory = generateDummyStockHistory(cleanSymbol, interval, range);

        const response = {
            symbol: cleanSymbol,
            history: dummyHistory,
            note: 'Using simulated data due to error'
        };

        res.json(response);
    }
});

// Helper function to generate dummy stock history data
const generateDummyStockHistory = (symbol, interval, range) => {
    const now = new Date();
    const data = [];

    // Use a consistent seed based on symbol name to get the same price range
    const symbolSeed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Common stocks with their approximate market prices
    const knownStockPrices = {
        'MOBIKWIK': 302,
        'RELIANCE': 2500,
        'TCS': 3800,
        'INFY': 1526,
        'HDFCBANK': 1600,
        'ICICIBANK': 980,
        'SBIN': 650,
        'TATAMOTORS': 950,
        'MARUTI': 10900,
        'WIPRO': 450,
        'ITC': 450,
        'BHARTIARTL': 1200,
        'ADANIENT': 2400,
        'TATASTEEL': 140,
        'ZOMATO': 140,
        'POLICYBZR': 700,
        'PAYTM': 650,
        'NYKAA': 180,
        'LIC': 650
    };

    // Use the actual stock price if known, otherwise use a seed-based price
    let basePrice = knownStockPrices[symbol] || (symbolSeed % 500) + 500;

    // Starting price with some variation but ensure ending matches current price
    let endPrice = basePrice;
    let startPrice = basePrice * (0.9 + (symbolSeed % 20) / 100);

    // Determine number of data points based on interval and range
    let dataPoints = 50;
    let timeStep = 24 * 60 * 60 * 1000; // Default daily

    if (range === '1d') {
        if (interval === '5m') dataPoints = 78; // 6.5 hours / 5min
        else if (interval === '15m') dataPoints = 26;
        else if (interval === '60m' || interval === '1h') dataPoints = 7;

        timeStep = (24 * 60 * 60 * 1000) / dataPoints; // Intraday steps
    } else if (range === '5d' || range === '5d') {
        dataPoints = 5; // 5 days
        if (interval === '60m' || interval === '1h') dataPoints = 5 * 7; // 5 days x 7 hours
    } else if (range === '1mo' || range === '1mo') {
        dataPoints = 30; // 30 days for 1 month
    } else if (range === '3mo' || range === '3mo') {
        dataPoints = 90; // 90 days for 3 months
    } else if (range === '6mo' || range === '6mo') {
        dataPoints = 180; // 180 days for 6 months
    } else if (range === '1y' || range === '1y') {
        dataPoints = 365; // 365 days for 1 year
    } else if (range === '5y' || range === '5y') {
        dataPoints = 365 * 5; // 5 years of data
        if (interval === '1wk') dataPoints = 52 * 5; // 5 years of weekly data
    }

    // Create a trend direction (up or down) based on symbol
    const trendBias = (symbolSeed % 100 > 45) ? 0.1 : -0.1; // 55% chance of uptrend

    // Generate data points
    for (let i = dataPoints - 1; i >= 0; i--) {
        // Calculate date
        const date = new Date(now.getTime() - i * timeStep);

        // Calculate price based on linear interpolation from start to end price
        // with some random noise to make it look more realistic
        let progress = (dataPoints - 1 - i) / (dataPoints - 1); // 0 to 1 over time period
        let baseProgressPrice = startPrice + (endPrice - startPrice) * progress;

        // Add random noise that gets smaller as we approach the end
        const volatility = basePrice * 0.01 * (1 - progress * 0.7); // Less volatility as we approach current price
        const noise = ((Math.random() - 0.5) + trendBias) * volatility;
        let price = baseProgressPrice + noise;

        // Ensure price doesn't go below a minimum
        price = Math.max(price, basePrice * 0.5);

        // Make sure the last data point (i=0) exactly matches the current price
        if (i === 0) {
            price = endPrice;
        }

        const open = price - (Math.random() * volatility * 0.5);
        const close = price;
        const high = Math.max(open, close) + (Math.random() * volatility * 0.3);
        const low = Math.min(open, close) - (Math.random() * volatility * 0.3);

        data.push({
            date,
            timestamp: date.getTime(),
            open,
            high,
            low,
            close,
            volume: Math.floor(100000 + Math.random() * 900000),
            adjclose: close // Add adjusted close for compatibility
        });
    }

    return data;
};

// @desc    Get company information for a stock
// @route   GET /api/market/info/:symbol
// @access  Private/Public (with optional auth)
const getCompanyInfo = asyncHandler(async (req, res) => {
    const { symbol } = req.params;

    try {
        // Check cache first
        const cacheKey = `company_info:${symbol}`;
        const cachedInfo = await marketDataCacheService.getCustomCache(cacheKey);
        if (cachedInfo) {
            return res.json(cachedInfo);
        }

        // First check if we have this stock in our database
        const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '');
        const stockInDb = await Stock.findOne({ symbol: cleanSymbol });

        // Try both NSE and BSE suffixes with Yahoo Finance
        const suffixes = ['.NS', '.BO'];
        let lastError = null;
        let companyInfo = null;
        let quote = null;

        for (const suffix of suffixes) {
            try {
                // Get quote for current price info
                quote = await yahooFinance.quote(cleanSymbol + suffix);

                // Get company profile if available
                try {
                    companyInfo = await yahooFinance.quoteSummary(cleanSymbol + suffix, {
                        modules: ['assetProfile', 'summaryDetail', 'price', 'defaultKeyStatistics', 'financialData']
                    });
                    break; // Break if successful
                } catch (profileError) {
                    console.error(`Error fetching profile for ${cleanSymbol + suffix}:`, profileError.message);
                    lastError = profileError;
                }
            } catch (quoteError) {
                console.error(`Error fetching quote for ${cleanSymbol + suffix}:`, quoteError.message);
                lastError = quoteError;
            }
        }

        // If real data can't be fetched, generate dummy data for testing
        if (!quote || !companyInfo) {
            const dummyInfo = generateDummyCompanyInfo(cleanSymbol);

            // Cache the dummy data but with shorter TTL
            await marketDataCacheService.setCustomCache(cacheKey, dummyInfo, 60); // 1 minute cache for dummy data

            return res.json(dummyInfo);
        }

        // Extract relevant information from the response
        const assetProfile = companyInfo.assetProfile || {};
        const summaryDetail = companyInfo.summaryDetail || {};
        const price = companyInfo.price || {};
        const keyStats = companyInfo.defaultKeyStatistics || {};
        const financialData = companyInfo.financialData || {};

        // Create response object
        const companyResponse = {
            symbol: cleanSymbol,
            name: price.shortName || price.longName || cleanSymbol,
            description: assetProfile.longBusinessSummary || "No description available",
            sector: assetProfile.sector || "N/A",
            industry: assetProfile.industry || "N/A",
            website: assetProfile.website || "N/A",
            marketCap: summaryDetail.marketCap || 0,
            peRatio: summaryDetail.trailingPE || keyStats.trailingPE || 0,
            eps: keyStats.trailingEps || 0,
            dividendYield: summaryDetail.dividendYield || 0,
            fiftyTwoWeekHigh: summaryDetail.fiftyTwoWeekHigh || 0,
            fiftyTwoWeekLow: summaryDetail.fiftyTwoWeekLow || 0,
            currentPrice: quote.regularMarketPrice || 0,
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
            volume: quote.regularMarketVolume || 0,
            averageVolume: summaryDetail.averageVolume || 0,
            employees: assetProfile.fullTimeEmployees || 0,
            city: assetProfile.city || "N/A",
            country: assetProfile.country || "India",
        };

        // Cache the result
        await marketDataCacheService.setCustomCache(cacheKey, companyResponse, 60 * 60); // 1 hour cache

        res.json(companyResponse);
    } catch (error) {
        console.error('Company info error:', error);

        // Fallback to dummy data
        const dummyInfo = generateDummyCompanyInfo(symbol);
        res.json(dummyInfo);
    }
});

// Generate dummy company info for testing
const generateDummyCompanyInfo = (symbol) => {
    const sectors = ['Technology', 'Financial Services', 'Healthcare', 'Consumer Goods', 'Energy', 'Telecom'];
    const industries = ['Software', 'Banking', 'Pharmaceuticals', 'FMCG', 'Oil & Gas', 'Telecommunications'];

    const randomIndex = Math.floor(Math.random() * sectors.length);
    const randomPrice = Math.random() * 2000 + 500; // Between 500 and 2500
    const randomChange = (Math.random() - 0.5) * 50; // Between -25 and 25
    const randomPercentChange = (randomChange / randomPrice) * 100;

    return {
        symbol: symbol,
        name: `${symbol} ${['Inc.', 'Ltd.', 'Limited', 'Corporation'][Math.floor(Math.random() * 4)]}`,
        description: `${symbol} is a leading company in the ${sectors[randomIndex]} sector, providing innovative solutions to customers in India and globally. The company has a strong market position and continues to invest in growth opportunities.`,
        sector: sectors[randomIndex],
        industry: industries[randomIndex],
        website: `https://www.${symbol.toLowerCase()}.com`,
        marketCap: Math.random() * 100000 * 10000000, // Random large number
        peRatio: Math.random() * 30 + 5, // Between 5 and 35
        eps: randomPrice / (Math.random() * 20 + 5), // Derived from price and random PE
        dividendYield: Math.random() * 0.05, // 0-5%
        fiftyTwoWeekHigh: randomPrice * (1 + Math.random() * 0.3), // 0-30% higher than current
        fiftyTwoWeekLow: randomPrice * (1 - Math.random() * 0.3), // 0-30% lower than current
        currentPrice: randomPrice,
        change: randomChange,
        changePercent: randomPercentChange,
        volume: Math.floor(Math.random() * 10000000), // Random large volume
        averageVolume: Math.floor(Math.random() * 5000000),
        employees: Math.floor(Math.random() * 50000),
        city: ['Mumbai', 'Bangalore', 'Delhi', 'Hyderabad', 'Chennai'][Math.floor(Math.random() * 5)],
        country: 'India',
    };
};

// @desc    Get news for a stock
// @route   GET /api/market/news/:symbol
// @access  Private/Public (with optional auth)
const getStockNews = asyncHandler(async (req, res) => {
    const { symbol } = req.params;
    const { count = 10 } = req.query;

    try {
        // Check cache first
        const cacheKey = `stock_news:${symbol}`;
        const cachedNews = await marketDataCacheService.getCustomCache(cacheKey);

        if (cachedNews) {
            return res.json(cachedNews);
        }

        // Fetch news from service
        const news = await stockNewsService.getStockNews(symbol, parseInt(count));

        // Cache the results
        await marketDataCacheService.setCustomCache(cacheKey, news, 15 * 60); // Cache for 15 minutes

        res.json(news);
    } catch (error) {
        console.error('Stock news error:', error);
        res.status(500).json({ error: 'Failed to fetch stock news' });
    }
});

// @desc    Get related stocks based on sector/industry
// @route   GET /api/market/related/:symbol
// @access  Private/Public (with optional auth)
const getRelatedStocks = asyncHandler(async (req, res) => {
    const { symbol } = req.params;
    const { limit = 4 } = req.query;

    try {
        // Check cache first
        const cacheKey = `related_stocks:${symbol}`;
        const cachedStocks = await marketDataCacheService.getCustomCache(cacheKey);

        if (cachedStocks) {
            return res.json(cachedStocks);
        }

        // First get the stock info to find its sector/industry
        const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '');
        const stockInfo = await getCompanyInfoObject(cleanSymbol);

        if (!stockInfo || !stockInfo.sector) {
            return res.status(404).json({ error: 'Stock information not found' });
        }

        // Find stocks in the same sector/industry
        const relatedStocks = await Stock.find({
            $and: [
                { symbol: { $ne: cleanSymbol } }, // Exclude the current stock
                {
                    $or: [
                        { sector: stockInfo.sector },
                        { industry: stockInfo.industry }
                    ]
                }
            ]
        }).limit(parseInt(limit) + 5); // Get a few extra in case we need to filter

        // If we found enough related stocks in the database
        if (relatedStocks.length >= parseInt(limit)) {
            const formattedStocks = relatedStocks.slice(0, parseInt(limit)).map(stock => ({
                symbol: stock.symbol,
                name: stock.companyName || stock.name,
                price: stock.currentPrice || 0,
                change: stock.currentPrice - stock.previousClose || 0,
                changePercent: ((stock.currentPrice - stock.previousClose) / stock.previousClose) * 100 || 0
            }));

            // Cache the results
            await marketDataCacheService.setCustomCache(cacheKey, formattedStocks, 60 * 60); // Cache for 1 hour

            return res.json(formattedStocks);
        }

        // If not enough in DB, search via Yahoo Finance
        try {
            // First get quotes for top stocks in the sector
            const sectorSearch = await yahooFinance.search(stockInfo.sector, {
                newsCount: 0,
                quotesCount: 20,
                enableNavLinks: false,
                enableEnhancedTrivialQuery: true
            });

            if (sectorSearch && sectorSearch.quotes && sectorSearch.quotes.length > 0) {
                const filteredStocks = sectorSearch.quotes
                    .filter(quote => {
                        // Filter for Indian stocks
                        if (!quote || !quote.symbol) return false;
                        const quoteSymbol = quote.symbol.toUpperCase();
                        return quoteSymbol !== cleanSymbol.toUpperCase() && // Exclude current stock
                               (quoteSymbol.endsWith('.NS') || quoteSymbol.endsWith('.BO') ||
                                quote.exchange === 'NSE' || quote.exchange === 'BSE');
                    })
                    .map(quote => {
                        // Format for frontend
                        return {
                            symbol: quote.symbol.replace('.NS', '').replace('.BO', ''),
                            name: quote.shortName || quote.longName || quote.symbol,
                            price: quote.regularMarketPrice || 0,
                            change: quote.regularMarketChange || 0,
                            changePercent: quote.regularMarketChangePercent || 0
                        };
                    });

                const finalStocks = filteredStocks.slice(0, parseInt(limit));

                if (finalStocks.length > 0) {
                    // Cache the results
                    await marketDataCacheService.setCustomCache(cacheKey, finalStocks, 60 * 60); // Cache for 1 hour

                    return res.json(finalStocks);
                }
            }
        } catch (yahooError) {
            console.error('Yahoo Finance search error:', yahooError);
            // Continue to fallback
        }

        // Fallback to generate dummy related stocks
        const dummyStocks = generateDummyRelatedStocks(cleanSymbol, parseInt(limit));
        await marketDataCacheService.setCustomCache(cacheKey, dummyStocks, 30 * 60); // Cache for 30 minutes

        res.json(dummyStocks);
    } catch (error) {
        console.error('Related stocks error:', error);
        res.status(500).json({ error: 'Failed to fetch related stocks' });
    }
});

// Helper function to get company info object
const getCompanyInfoObject = async (symbol) => {
    // Try to get from cache first
    const cacheKey = `company_info:${symbol}`;
    const cachedInfo = await marketDataCacheService.getCustomCache(cacheKey);
    if (cachedInfo) {
        return cachedInfo;
    }

    // Check database
    const stockInDb = await Stock.findOne({ symbol });
    if (stockInDb && stockInDb.sector) {
        return {
            symbol: stockInDb.symbol,
            name: stockInDb.companyName || stockInDb.name,
            sector: stockInDb.sector,
            industry: stockInDb.industry
        };
    }

    // Try to get from Yahoo Finance
    try {
        const suffixes = ['.NS', '.BO'];

        for (const suffix of suffixes) {
            try {
                const info = await yahooFinance.quoteSummary(symbol + suffix, {
                    modules: ['assetProfile']
                });

                if (info && info.assetProfile) {
                    const companyInfo = {
                        symbol,
                        name: info.price?.shortName || info.price?.longName || symbol,
                        sector: info.assetProfile.sector || 'Unknown',
                        industry: info.assetProfile.industry || 'Unknown'
                    };

                    // Cache the result
                    await marketDataCacheService.setCustomCache(cacheKey, companyInfo, 24 * 60 * 60); // Cache for 1 day

                    return companyInfo;
                }
            } catch (error) {
                console.error(`Error getting company info for ${symbol + suffix}:`, error.message);
                // Try next suffix
            }
        }
    } catch (error) {
        console.error(`Error in getCompanyInfoObject for ${symbol}:`, error);
    }

    // Return fallback data
    return {
        symbol,
        name: symbol,
        sector: 'Unknown',
        industry: 'Unknown'
    };
};

// Helper function to generate dummy related stocks
const generateDummyRelatedStocks = (symbol, limit = 4) => {
    const sectors = ['Technology', 'Financial Services', 'Healthcare', 'Consumer Goods'];
    const randomSector = sectors[Math.floor(Math.random() * sectors.length)];

    const companies = [
        { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy' },
        { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'Technology' },
        { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Financial Services' },
        { symbol: 'INFY', name: 'Infosys', sector: 'Technology' },
        { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', sector: 'Consumer Goods' },
        { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Financial Services' },
        { symbol: 'SBIN', name: 'State Bank of India', sector: 'Financial Services' },
        { symbol: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecom' },
        { symbol: 'ITC', name: 'ITC Limited', sector: 'Consumer Goods' },
        { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Financial Services' },
        { symbol: 'WIPRO', name: 'Wipro', sector: 'Technology' },
        { symbol: 'BAJFINANCE', name: 'Bajaj Finance', sector: 'Financial Services' },
        { symbol: 'HCLTECH', name: 'HCL Technologies', sector: 'Technology' },
        { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', sector: 'Healthcare' },
        { symbol: 'ASIANPAINT', name: 'Asian Paints', sector: 'Consumer Goods' }
    ];

    // Filter by randomSector and exclude current symbol
    const sectorCompanies = companies
        .filter(company => company.sector === randomSector && company.symbol !== symbol)
        .slice(0, limit);

    // If not enough companies in the sector, add some random ones
    const remainingCount = limit - sectorCompanies.length;
    if (remainingCount > 0) {
        const otherCompanies = companies
            .filter(company => company.sector !== randomSector && company.symbol !== symbol)
            .sort(() => 0.5 - Math.random()) // Shuffle
            .slice(0, remainingCount);

        sectorCompanies.push(...otherCompanies);
    }

    // Return with random prices and changes
    return sectorCompanies.map(company => ({
        symbol: company.symbol,
        name: company.name,
        price: Math.random() * 3000 + 500, // Between 500 and 3500
        change: (Math.random() - 0.3) * 5, // Between -1.5% and +3.5%
        changePercent: (Math.random() - 0.3) * 5 // Between -1.5% and +3.5%
    }));
};

// @desc    Get Indian market news
// @route   GET /api/market/market-news
// @access  Private/Public (with optional auth)
const getMarketNews = asyncHandler(async (req, res) => {
    const { count = 10, refresh = 'false' } = req.query;
    const forceRefresh = refresh === 'true';

    try {
        // Check if we should force refresh
        if (forceRefresh) {
            console.log('Force refreshing market news data');
            // Clear cache
            await marketDataCacheService.delete('market_news');
        } else {
            // Check cache first
            const cacheKey = 'market_news';
            const cachedNews = await marketDataCacheService.getCustomCache(cacheKey);

            if (cachedNews) {
                console.log('Returning cached market news data');
                return res.json(cachedNews);
            }
        }

        // Fetch news from service with forceRefresh parameter
        const news = await marketNewsService.getIndianMarketNews(parseInt(count), forceRefresh);

        // Cache the results
        await marketDataCacheService.setCustomCache('market_news', news, 30 * 60); // Cache for 30 minutes

        res.json(news);
    } catch (error) {
        console.error('Market news error:', error);
        res.status(500).json({ error: 'Failed to fetch market news' });
    }
});

export {
    searchStocks,
    getQuote,
    getMarketIndices,
    setupSocketHandlers,
    getNSEStocks,
    getBSEStocks,
    getStockHistory,
    getCompanyInfo,
    getStockNews,
    getRelatedStocks,
    getMarketNews
};