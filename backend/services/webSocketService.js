import WebSocket from 'ws';
import { logInfo, logError } from '../utils/logger.js';
import marketDataCacheService from './marketDataCacheService.js';
import yahooFinance from 'yahoo-finance2';
import indianStockUtils from '../utils/indianStockUtils.js';

class WebSocketService {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = parseInt(process.env.WS_MAX_RECONNECT_ATTEMPTS) || 5;
        this.reconnectDelay = parseInt(process.env.WS_RECONNECT_DELAY) || 1000;
        this.heartbeatInterval = parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000;
        this.subscriptions = new Set();
        this.messageHandlers = new Map();
        this.activeStreams = new Map(); // Track active real-time streams
        this.updateInterval = process.env.REALTIME_UPDATE_INTERVAL || 5000; // Increased to 5 seconds by default
        this.dataUpdateTimers = new Map(); // Timers for regular data fetching
        this.errorCounts = new Map(); // Track errors by symbol to prevent excessive retries
        this.maxErrorCount = 5; // Maximum errors before applying recovery strategy
        this.activeSymbolsLimit = parseInt(process.env.MAX_ACTIVE_SYMBOLS) || 100; // Limit active symbols to prevent overload
        this.lastActivity = {}; // Track last activity for each symbol
        this.prioritySymbols = new Set(); // Symbols that should always be kept active
        this.lastYahooFinanceCall = 0; // Track last API call time for rate limiting
        this.handlerReferences = new Map(); // Store references to handlers for proper cleanup
        
        // Set up error tracking cleanup
        setInterval(() => this.cleanupErrorCounts(), 60000); // Cleanup error counts every minute
        
        // Set up inactive symbol cleanup
        setInterval(() => this.cleanupInactiveSymbols(), 300000); // Cleanup inactive symbols every 5 minutes
        
        // Set up handler cleanup to prevent memory leaks
        setInterval(() => this.cleanupStaleHandlers(), 600000); // Cleanup stale handlers every 10 minutes
    }

    // Clean up stale handlers that may be causing memory leaks
    cleanupStaleHandlers() {
        try {
            let cleanupCount = 0;
            const now = Date.now();
            
            // Check each handler reference for staleness
            for (const [key, handlerData] of this.handlerReferences.entries()) {
                const { lastActive, type, handler, socketId } = handlerData;
                
                // If handler hasn't been active in 1 hour, remove it
                if (now - lastActive > 3600000) {
                    if (this.messageHandlers.has(type)) {
                        this.messageHandlers.get(type).delete(handler);
                    }
                    this.handlerReferences.delete(key);
                    cleanupCount++;
                }
            }
            
            if (cleanupCount > 0) {
                logInfo(`Cleaned up ${cleanupCount} stale message handlers`);
            }
        } catch (error) {
            logError('Error cleaning up stale handlers:', error);
        }
    }

    connect() {
        try {
            this.ws = new WebSocket(process.env.MARKET_DATA_WS_URL);

            this.ws.on('open', () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                logInfo('WebSocket connected successfully');
                this.startHeartbeat();
                this.resubscribe();
            });

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleMessage(message);
                } catch (error) {
                    logError('Error parsing WebSocket message:', error);
                }
            });

            this.ws.on('close', () => {
                this.isConnected = false;
                logInfo('WebSocket connection closed');
                this.reconnect();
            });

            this.ws.on('error', (error) => {
                logError('WebSocket error:', error);
                this.reconnect();
            });

        } catch (error) {
            logError('Error creating WebSocket connection:', error);
            this.reconnect();
        }
    }

    reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logError('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        logInfo(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
        setTimeout(() => this.connect(), delay);
    }

    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected) {
                this.send({ type: 'ping' });
            }
        }, this.heartbeatInterval);
    }

    subscribe(symbol) {
        if (!symbol) return;
        
        // Store the base symbol for tracking subscriptions
        const baseSymbol = indianStockUtils.getBaseSymbol(symbol);
        this.subscriptions.add(baseSymbol);
        
        // Start real-time updates for this symbol
        this.startRealTimeUpdates(baseSymbol);
        
        if (this.isConnected) {
            this.send({
                type: 'subscribe',
                symbol: baseSymbol
            });
        }
    }

    unsubscribe(symbol) {
        if (!symbol) return;

        // Get the base symbol
        const baseSymbol = indianStockUtils.getBaseSymbol(symbol);
        this.subscriptions.delete(baseSymbol);
        
        // Stop real-time updates for this symbol
        this.stopRealTimeUpdates(baseSymbol);
        
        if (this.isConnected) {
            this.send({
                type: 'unsubscribe',
                symbol: baseSymbol
            });
        }
    }

    resubscribe() {
        for (const symbol of this.subscriptions) {
            this.subscribe(symbol);
        }
    }

    send(data) {
        if (!this.isConnected) {
            logError('Cannot send message: WebSocket is not connected');
            return;
        }

        try {
            this.ws.send(JSON.stringify(data));
        } catch (error) {
            logError('Error sending WebSocket message:', error);
        }
    }

    handleMessage(message) {
        if (!message || !message.type) return;

        // Handle heartbeat response
        if (message.type === 'pong') {
            return;
        }

        // Cache market data
        if (message.type === 'quote' && message.symbol) {
            marketDataCacheService.set(`quote:${message.symbol}`, message.data);
        }

        // Notify handlers
        const handlers = this.messageHandlers.get(message.type) || [];
        handlers.forEach(handler => {
            try {
                handler(message);
            } catch (error) {
                logError('Error in message handler:', error);
            }
        });
    }

    addMessageHandler(type, handler, socketId = 'system') {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, new Set());
        }
        
        this.messageHandlers.get(type).add(handler);
        
        // Store reference with metadata for cleanup
        const handlerKey = `${type}:${socketId}:${Date.now()}`;
        this.handlerReferences.set(handlerKey, {
            type,
            handler,
            socketId,
            lastActive: Date.now()
        });
        
        return handlerKey; // Return key for later reference
    }

    removeMessageHandler(type, handler, handlerKey = null) {
        if (this.messageHandlers.has(type)) {
            this.messageHandlers.get(type).delete(handler);
            
            // If handler set is empty, delete the key
            if (this.messageHandlers.get(type).size === 0) {
                this.messageHandlers.delete(type);
            }
        }
        
        // Remove from references if key provided
        if (handlerKey && this.handlerReferences.has(handlerKey)) {
            this.handlerReferences.delete(handlerKey);
        } else if (!handlerKey) {
            // Try to find and remove by handler reference
            for (const [key, data] of this.handlerReferences.entries()) {
                if (data.handler === handler && data.type === type) {
                    this.handlerReferences.delete(key);
                    break;
                }
            }
        }
    }

    // Start fetching real-time data for a symbol
    startRealTimeUpdates(symbol) {
        if (!symbol) return;
        
        // Check active symbols limit to prevent server overload
        if (this.dataUpdateTimers.size >= this.activeSymbolsLimit && !this.prioritySymbols.has(symbol)) {
            logError(`Cannot start updates for ${symbol}: active symbols limit (${this.activeSymbolsLimit}) reached`);
            return;
        }
        
        if (this.dataUpdateTimers.has(symbol)) {
            // Already updating this symbol, just track activity
            this.trackSymbolActivity(symbol);
            return;
        }

        // Make sure symbol has proper suffix for Indian stocks using the utility function
        const fullSymbol = indianStockUtils.standardizeSymbol(symbol);
        
        // Track activity
        this.trackSymbolActivity(symbol);
        
        // Add a small random initial delay to stagger updates and avoid bursts of API calls
        const initialDelay = Math.floor(Math.random() * this.updateInterval);
        
        // Wait for the initial delay before fetching the first data
        setTimeout(() => {
            // Immediately fetch initial data after stagger delay
            this.fetchStockData(fullSymbol);
            
            // Set up timer for regular updates
            const timerId = setInterval(() => {
                // Skip this update if there have been too many errors
                const errorCount = this.errorCounts.get(symbol) || 0;
                if (errorCount >= this.maxErrorCount) {
                    // Use exponential backoff for problematic symbols
                    const backoffFactor = Math.min(errorCount - this.maxErrorCount + 1, 5);
                    const shouldSkip = Math.random() < (1 - 1/backoffFactor);
                    
                    if (shouldSkip) {
                        return; // Skip this update cycle
                    }
                }
                
                this.fetchStockData(fullSymbol);
            }, this.updateInterval);
            
            this.dataUpdateTimers.set(symbol, timerId);
            logInfo(`Started real-time updates for ${fullSymbol} (base: ${symbol})`);
        }, initialDelay);
    }
    
    // Stop real-time updates for a symbol
    stopRealTimeUpdates(symbol) {
        if (this.dataUpdateTimers.has(symbol)) {
            clearInterval(this.dataUpdateTimers.get(symbol));
            this.dataUpdateTimers.delete(symbol);
            logInfo(`Stopped real-time updates for ${symbol}`);
        }
    }
    
    // Fetch latest stock data from Yahoo Finance
    async fetchStockData(symbol) {
        try {
            // Track activity when fetching data
            const baseSymbol = indianStockUtils.getBaseSymbol(symbol);
            this.trackSymbolActivity(baseSymbol);
            
            // Special handling for market indices which are causing the most errors
            const isMarketIndex = baseSymbol.startsWith('^');
            
            // Check if we already have cached data
            const cachedData = await marketDataCacheService.getQuote(baseSymbol);
            const now = Date.now();
            
            // For indices, use the cached data with an even longer TTL (20 seconds)
            // since indices don't change as rapidly as individual stocks
            if (isMarketIndex && cachedData && (now - cachedData.timestamp < 20000)) {
                // Broadcast the cached data again
                this.broadcastQuoteUpdate(baseSymbol, cachedData);
                return;
            }
            
            // For regular stocks, use fresh cached data if available
            if (!isMarketIndex && cachedData && (now - cachedData.timestamp < 10000)) {
                // Broadcast the cached data again
                this.broadcastQuoteUpdate(baseSymbol, cachedData);
                return;
            }
            
            // Use the standardize function to ensure correct format
            const correctedSymbol = indianStockUtils.standardizeSymbol(symbol);
            
            // Add rate limiting to prevent "Too Many Requests" errors
            const timeSinceLastCall = now - this.lastYahooFinanceCall;
            
            // Ensure at least 1000ms between API calls across all symbols (increased from 500ms)
            if (timeSinceLastCall < 1000) {
                const waitTime = 1000 - timeSinceLastCall + Math.floor(Math.random() * 500);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            
            // For indices, add extra delay to further space out requests
            if (isMarketIndex) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Update the last call timestamp before making the request
            this.lastYahooFinanceCall = Date.now();
            
            // Special case for market indices (they don't have BSE equivalent)
            if (isMarketIndex) {
                // For market indices, try with direct symbol, no exchange suffix
                try {
                    // Apply retry logic with exponential backoff for indices
                    let retryCount = 0;
                    const maxRetries = 3;
                    
                    while (retryCount < maxRetries) {
                        try {
                            const quote = await yahooFinance.quote(baseSymbol, { validateResult: false });
                            
                            if (quote && quote.regularMarketPrice) {
                                // Process and cache the market index data
                                const indexData = {
                                    symbol: baseSymbol,
                                    name: quote.shortName || quote.longName || indianStockUtils.INDEX_NAMES[baseSymbol] || baseSymbol,
                                    price: quote.regularMarketPrice,
                                    change: quote.regularMarketChange || 0,
                                    changePercent: quote.regularMarketChangePercent || 0,
                                    dayHigh: quote.regularMarketDayHigh || quote.regularMarketPrice,
                                    dayLow: quote.regularMarketDayLow || quote.regularMarketPrice,
                                    volume: quote.regularMarketVolume || 0,
                                    previousClose: quote.regularMarketPreviousClose || 0,
                                    exchange: 'INDEX',
                                    timestamp: Date.now()
                                };
                                
                                // Store in cache with longer TTL for indices (45 seconds)
                                await marketDataCacheService.cacheQuote(baseSymbol, indexData, 45);
                                
                                // Broadcast the index data
                                this.broadcastQuoteUpdate(baseSymbol, indexData);
                                
                                // Reset error count on success
                                this.errorCounts.set(baseSymbol, 0);
                                return;
                            }
                            break; // Success but no data, exit retry loop
                        } catch (retryError) {
                            retryCount++;
                            if (retryError.message && retryError.message.includes("Too Many Requests")) {
                                // If rate limited, wait with exponential backoff
                                const backoffTime = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
                                logInfo(`Rate limited for ${baseSymbol}, retry ${retryCount}/${maxRetries} after ${backoffTime}ms`);
                                await new Promise(resolve => setTimeout(resolve, backoffTime));
                                this.lastYahooFinanceCall = Date.now(); // Update timestamp after wait
                            } else if (retryCount >= maxRetries) {
                                throw retryError; // Re-throw if all retries failed
                            } else {
                                // For other errors, retry with shorter backoff
                                await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
                            }
                        }
                    }
                } catch (indexError) {
                    // If Yahoo Finance failed for this index, 
                    // generate fallback data or use cached data if available
                    
                    // Increment error count
                    const currentErrorCount = this.errorCounts.get(baseSymbol) || 0;
                    this.errorCounts.set(baseSymbol, currentErrorCount + 1);
                    
                    // Use cached data if available, otherwise generate fallback data
                    if (cachedData) {
                        // Update timestamp to show it's been refreshed
                        cachedData.timestamp = Date.now();
                        cachedData.isApproximate = true;
                        
                        // Broadcast the cached data
                        this.broadcastQuoteUpdate(baseSymbol, cachedData);
                        return;
                    } else {
                        // Generate fallback data for this index
                        const fallbackData = indianStockUtils.generateFallbackData(baseSymbol, true);
                        
                        // Cache the fallback data
                        await marketDataCacheService.cacheQuote(baseSymbol, fallbackData, 45);
                        
                        // Broadcast the fallback data
                        this.broadcastQuoteUpdate(baseSymbol, fallbackData);
                        return;
                    }
                }
            }
            
            // For regular stocks (not indices), proceed with normal logic
            // Try both NSE and BSE suffixes for more accurate data
            const nseSuffix = `${baseSymbol}.NS`;
            const bseSuffix = `${baseSymbol}.BO`;
            
            let quote = null;
            let errors = [];
            let isNSE = true;
            let retryDelay = 2000; // Start with 2s delay for rate limit retries
            let rateLimited = false;
            
            // Apply retry logic with exponential backoff
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries && !quote) {
                try {
                    // Try NSE first then BSE to find the most accurate quote
                    try {
                        quote = await yahooFinance.quote(nseSuffix, { validateResult: false });
                        isNSE = true;
                    } catch (nseError) {
                        // Check if this is a rate limiting error
                        if (nseError.message && nseError.message.includes("Too Many Requests")) {
                            rateLimited = true;
                            // Wait longer before retrying if we hit rate limits
                            const backoffTime = Math.pow(2, retryCount) * 2000 + Math.random() * 1000;
                            logInfo(`Rate limited for ${baseSymbol}, retry ${retryCount}/${maxRetries} after ${backoffTime}ms`);
                            await new Promise(resolve => setTimeout(resolve, backoffTime));
                            this.lastYahooFinanceCall = Date.now(); // Update timestamp after wait
                        }
                        
                        errors.push(nseError);
                        try {
                            quote = await yahooFinance.quote(bseSuffix, { validateResult: false });
                            isNSE = false;
                        } catch (bseError) {
                            errors.push(bseError);
                            
                            // Both exchanges failed, increment retry count
                            retryCount++;
                            
                            // If both exchanges failed and we're rate limited, use cached data with longer TTL
                            if ((rateLimited || bseError.message && bseError.message.includes("Too Many Requests")) && retryCount >= maxRetries) {
                                if (cachedData) {
                                    // Update the cached data timestamp slightly to show it's been refreshed
                                    cachedData.timestamp = Date.now();
                                    // Mark it as approximate (from cache) for UI indicators
                                    cachedData.isApproximate = true;
                                    
                                    // Update the cache with a longer TTL
                                    await marketDataCacheService.cacheQuote(baseSymbol, cachedData, 45); // 45 second TTL
                                    
                                    // Broadcast the cached data
                                    this.broadcastQuoteUpdate(baseSymbol, cachedData);
                                    
                                    // Increment error count, but less severely for rate limiting
                                    const currentErrorCount = this.errorCounts.get(baseSymbol) || 0;
                                    this.errorCounts.set(baseSymbol, currentErrorCount + 0.5);
                                    
                                    return; // Exit early with cached data
                                }
                            }
                            
                            // Wait before retrying if we haven't reached max retries
                            if (retryCount < maxRetries) {
                                const backoffTime = Math.pow(2, retryCount) * 1000;
                                await new Promise(resolve => setTimeout(resolve, backoffTime));
                            }
                        }
                    }
                } catch (outerError) {
                    retryCount++;
                    if (retryCount >= maxRetries) {
                        throw outerError; // Re-throw if all retries failed
                    }
                }
            }
            
            if (!quote || !quote.regularMarketPrice) {
                // Increment error count for this symbol
                const currentErrorCount = this.errorCounts.get(baseSymbol) || 0;
                this.errorCounts.set(baseSymbol, currentErrorCount + 1);
                
                // If we have cached data, use it as fallback
                if (cachedData) {
                    // Update timestamp to show it's been refreshed
                    cachedData.timestamp = Date.now();
                    cachedData.isApproximate = true;
                    
                    // Broadcast the cached data
                    this.broadcastQuoteUpdate(baseSymbol, cachedData);
                    return;
                }
                
                throw new Error(`Could not fetch valid data for ${baseSymbol} (tried both NSE and BSE)`);
            }
            
            // Reset error count on success
            this.errorCounts.set(baseSymbol, 0);
            
            // Get previous data for price adjustment and comparison
            const previousData = await marketDataCacheService.getQuote(baseSymbol);
            let previousPrice = previousData?.price;
            
            // Apply specific Indian market adjustments to improve accuracy
            let adjustedPrice = indianStockUtils.adjustIndianStockPrice(
                quote.regularMarketPrice,
                baseSymbol,
                previousPrice,
                isNSE
            );
            
            // Additional validation for extreme price changes
            if (previousPrice && previousPrice > 0) {
                const priceChange = Math.abs(adjustedPrice - previousPrice);
                const changePercent = (priceChange / previousPrice) * 100;
                
                // If change is still suspiciously large (>5% in 1 second), validate further
                if (changePercent > 5 && (Date.now() - previousData.timestamp < 5000)) {
                    // Try the other exchange as a secondary confirmation
                    try {
                        const confirmQuote = await yahooFinance.quote(
                            isNSE ? bseSuffix : nseSuffix,
                            { validateResult: false }
                        );
                        
                        if (confirmQuote && confirmQuote.regularMarketPrice) {
                            // Adjust the confirmation price too
                            const confirmAdjustedPrice = indianStockUtils.adjustIndianStockPrice(
                                confirmQuote.regularMarketPrice,
                                baseSymbol,
                                previousPrice,
                                !isNSE
                            );
                            
                            // Calculate which price is closer to previous
                            const mainDiff = Math.abs(adjustedPrice - previousPrice);
                            const confirmDiff = Math.abs(confirmAdjustedPrice - previousPrice);
                            
                            // If confirmation price is closer to previous value, use it
                            if (confirmDiff < mainDiff) {
                                adjustedPrice = confirmAdjustedPrice;
                                quote = confirmQuote;
                                isNSE = !isNSE;
                            }
                        }
                    } catch (confirmError) {
                        // If confirmation fails, we'll stick with our adjusted price
                    }
                }
            }
            
            if (quote) {
                // Calculate change values based on the adjusted price
                let change = 0;
                let changePercent = 0;
                
                if (quote.regularMarketPreviousClose) {
                    change = adjustedPrice - quote.regularMarketPreviousClose;
                    changePercent = (change / quote.regularMarketPreviousClose) * 100;
                }
                
                const stockData = {
                    symbol: baseSymbol,
                    name: quote.shortName || quote.longName || baseSymbol,
                    price: adjustedPrice,
                    change: change,
                    changePercent: changePercent,
                    dayHigh: quote.regularMarketDayHigh || adjustedPrice,
                    dayLow: quote.regularMarketDayLow || adjustedPrice,
                    volume: quote.regularMarketVolume || 0,
                    marketCap: quote.marketCap || 0,
                    exchange: isNSE ? 'NSE' : 'BSE',
                    timestamp: Date.now(),
                    previousClose: quote.regularMarketPreviousClose || 0
                };
                
                // Cache the data with just the base symbol for consistency
                await marketDataCacheService.cacheQuote(baseSymbol, stockData, 2);
                
                // Broadcast to all connected clients using base symbol
                this.broadcastQuoteUpdate(baseSymbol, stockData);
            }
        } catch (error) {
            // Increment error count for rate limiting
            const baseSymbol = indianStockUtils.getBaseSymbol(symbol);
            const currentErrorCount = this.errorCounts.get(baseSymbol) || 0;
            this.errorCounts.set(baseSymbol, currentErrorCount + 1);
            
            logError(`Error fetching data for ${symbol}:`, error);
            
            // Don't generate fallback data for every error - only if we don't have recent data
            try {
                const existingData = await marketDataCacheService.getQuote(baseSymbol);
                
                // Only generate fallback if we don't have data or it's older than 30 seconds
                if (!existingData || (Date.now() - existingData.timestamp > 30000)) {
                    const fallbackData = indianStockUtils.generateFallbackData(baseSymbol, false);
                    await marketDataCacheService.cacheQuote(baseSymbol, fallbackData, 2);
                    this.broadcastQuoteUpdate(baseSymbol, fallbackData);
                }
            } catch (fallbackError) {
                logError(`Failed to handle fallback for ${symbol}:`, fallbackError);
                // Don't crash the server or stop other updates
            }
        }
    }
    
    // Broadcast quote update to connected clients
    broadcastQuoteUpdate(symbol, data) {
        const message = {
            type: 'quote_update',
            symbol: symbol,
            data: data
        };
        
        // Handle the message with registered handlers
        this.handleMessage(message);
    }
    
    disconnect() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }
        
        // Clear all real-time update timers
        for (const [symbol, timerId] of this.dataUpdateTimers.entries()) {
            clearInterval(timerId);
        }
        this.dataUpdateTimers.clear();

        if (this.ws) {
            this.ws.close();
        }

        this.isConnected = false;
        this.subscriptions.clear();
        this.messageHandlers.clear();
    }

    // Clean up error tracking data to prevent memory leaks
    cleanupErrorCounts() {
        try {
            for (const [symbol, count] of this.errorCounts.entries()) {
                // Reset error count if it's been accumulating
                if (count > 0) {
                    this.errorCounts.set(symbol, 0);
                }
            }
        } catch (error) {
            logError('Error cleaning up error counts:', error);
        }
    }

    // Clean up inactive symbols to prevent resource overuse
    cleanupInactiveSymbols() {
        try {
            const now = Date.now();
            const inactiveThreshold = 30 * 60 * 1000; // 30 minutes
            
            // Keep track of how many symbols we're monitoring
            const activeSymbolsCount = this.dataUpdateTimers.size;
            
            // If we're approaching the limit, aggressively clean up
            if (activeSymbolsCount > this.activeSymbolsLimit * 0.8) {
                for (const [symbol, lastTime] of Object.entries(this.lastActivity)) {
                    // Skip priority symbols
                    if (this.prioritySymbols.has(symbol)) {
                        continue;
                    }
                    
                    // If inactive for more than the threshold, unsubscribe
                    if (now - lastTime > inactiveThreshold) {
                        this.unsubscribe(symbol);
                    }
                }
            }
        } catch (error) {
            logError('Error cleaning up inactive symbols:', error);
        }
    }

    // Track symbol activity - call this whenever a symbol is accessed
    trackSymbolActivity(symbol) {
        if (!symbol) return;
        this.lastActivity[symbol] = Date.now();
    }

    // Set a symbol as high priority (will not be auto-cleaned)
    setPrioritySymbol(symbol) {
        if (!symbol) return;
        this.prioritySymbols.add(symbol);
        this.trackSymbolActivity(symbol);
    }
}

export default new WebSocketService();