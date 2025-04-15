import Redis from 'ioredis';
import { logInfo, logError } from '../utils/logger.js';

class MarketDataCacheService {
  constructor() {
    this.redis = null;
    this.fallbackCache = new Map();
    this.isRedisEnabled = process.env.REDIS_ENABLED === 'true';
    this.quoteUpdateCallbacks = new Map(); // Callbacks for real-time updates
    this.init();
  }

  async init() {
    if (this.isRedisEnabled) {
      try {
        this.redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD || '',
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          }
        });

        this.redis.on('connect', () => {
          logInfo('Redis connected successfully');
        });

        this.redis.on('error', (err) => {
          logError('Redis connection error:', err);
          this.fallbackToMemory();
        });
      } catch (error) {
        logError('Redis initialization error:', error);
        this.fallbackToMemory();
      }
    } else {
      logInfo('Redis is disabled, using in-memory cache');
    }
  }

  fallbackToMemory() {
    this.redis = null;
    logInfo('Falling back to in-memory cache');
  }

  async set(key, value, expirySeconds = 300) {
    try {
      if (this.redis) {
        // Use pipeline for faster Redis operations
        const pipeline = this.redis.pipeline();
        pipeline.setex(key, expirySeconds, JSON.stringify(value));
        
        // For frequently updated keys (like quotes), maintain a list of recently updated symbols
        if (key.startsWith('quote_')) {
          pipeline.zadd('recently_updated_quotes', Date.now(), key);
          
          // Clean old entries from the sorted set (keep last 1000)
          pipeline.zremrangebyrank('recently_updated_quotes', 0, -1001);
        }
        
        await pipeline.exec();
      } else {
        this.fallbackCache.set(key, {
          value: value,
          expiry: Date.now() + (expirySeconds * 1000)
        });
        
        // Periodically clean expired items from fallback cache
        if (this.fallbackCache.size > 5000) {
          this._cleanExpiredEntries();
        }
      }
    } catch (error) {
      logError('Error setting cache:', error);
      this.fallbackToMemory();
    }
  }

  async get(key) {
    try {
      if (this.redis) {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        const item = this.fallbackCache.get(key);
        if (item && item.expiry > Date.now()) {
          return item.value;
        }
        this.fallbackCache.delete(key);
        return null;
      }
    } catch (error) {
      logError('Error getting from cache:', error);
      this.fallbackToMemory();
      return null;
    }
  }

  async delete(key) {
    try {
      if (this.redis) {
        await this.redis.del(key);
      } else {
        this.fallbackCache.delete(key);
      }
    } catch (error) {
      logError('Error deleting from cache:', error);
      this.fallbackToMemory();
    }
  }

  async clear() {
    try {
      if (this.redis) {
        await this.redis.flushall();
      } else {
        this.fallbackCache.clear();
      }
    } catch (error) {
      logError('Error clearing cache:', error);
      this.fallbackToMemory();
    }
  }

  getStats() {
    return {
      type: this.redis ? 'redis' : 'memory',
      size: this.redis ? 'N/A' : this.fallbackCache.size,
      status: this.redis ? 'connected' : 'using fallback'
    };
  }
  
  // Add missing methods
  
  // Cache and retrieve top stocks by exchange
  async cacheTopStocks(exchange, stocks, expirySeconds = 600) {
    const key = `topStocks_${exchange.toLowerCase()}`;
    await this.set(key, stocks, expirySeconds);
  }
  
  async getTopStocks(exchange) {
    const key = `topStocks_${exchange.toLowerCase()}`;
    return await this.get(key);
  }
  
  // Cache and retrieve market indices
  async cacheIndices(indices, expirySeconds = 300) {
    const key = 'market_indices';
    await this.set(key, indices, expirySeconds);
  }
  
  async getIndices() {
    const key = 'market_indices';
    return await this.get(key);
  }
  
  // Methods for search results and quotes that are used in the controller
  async cacheSearchResults(query, results, expirySeconds = 300) {
    const key = `search_${query.toLowerCase()}`;
    await this.set(key, results, expirySeconds);
  }
  
  async getSearchResults(query) {
    const key = `search_${query.toLowerCase()}`;
    return await this.get(key);
  }
  
  async cacheQuote(symbol, quote, expirySeconds = 2) {
    const key = `quote_${symbol.toUpperCase()}`;
    
    try {
      // Get previous quote data if available for smoothing
      const previousQuote = await this.get(key);
      
      // Apply data smoothing for more consistent updates
      if (previousQuote && typeof previousQuote === 'object') {
        const now = Date.now();
        const prevTime = previousQuote.timestamp || now;
        const timeDiff = now - prevTime;
        
        // Only apply smoothing for rapid updates within 2 seconds
        if (timeDiff < 2000) {
          // If the price change is too extreme in a short time, smooth it
          const priceChange = Math.abs(quote.price - previousQuote.price);
          const changePercent = (priceChange / previousQuote.price) * 100;
          
          // For small changes or normal market movement, use new data directly
          // For excessive changes in short time, apply smoothing
          if (changePercent > 2) {
            // Apply weighted average for smoother transitions (70% previous, 30% new)
            quote.price = (previousQuote.price * 0.7) + (quote.price * 0.3);
            
            // Recalculate change values
            if (quote.previousClose && quote.previousClose > 0) {
              quote.change = quote.price - quote.previousClose;
              quote.changePercent = (quote.change / quote.previousClose) * 100;
            }
          }
        }
      }
      
      // Always include a timestamp for tracking data freshness
      quote.timestamp = Date.now();
      
      // Set shorter expiry for real-time data (1 second)
      await this.set(key, quote, 1);
      
      // Notify any registered callbacks
      if (this.quoteUpdateCallbacks.has(symbol)) {
        const callbacks = this.quoteUpdateCallbacks.get(symbol);
        callbacks.forEach(callback => {
          try {
            callback(quote);
          } catch (error) {
            logError(`Error in quote update callback for ${symbol}:`, error);
          }
        });
      }
    } catch (error) {
      logError(`Error caching quote for ${symbol}:`, error);
      // Still try to set the cache even if processing failed
      await this.set(key, quote, 1);
    }
  }
  
  async getQuote(symbol) {
    const key = `quote_${symbol.toUpperCase()}`;
    return await this.get(key);
  }
  
  // Register for real-time updates
  onQuoteUpdate(symbol, callback) {
    if (!this.quoteUpdateCallbacks.has(symbol)) {
      this.quoteUpdateCallbacks.set(symbol, new Set());
    }
    this.quoteUpdateCallbacks.get(symbol).add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.quoteUpdateCallbacks.get(symbol);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.quoteUpdateCallbacks.delete(symbol);
        }
      }
    };
  }
  
  // Clean expired entries from fallback cache
  _cleanExpiredEntries() {
    const now = Date.now();
    for (const [key, item] of this.fallbackCache.entries()) {
      if (item.expiry < now) {
        this.fallbackCache.delete(key);
      }
    }
  }

  // Get recently updated quotes (useful for identifying active symbols)
  async getRecentlyUpdatedQuotes(limit = 20) {
    try {
      if (this.redis) {
        const keys = await this.redis.zrevrange('recently_updated_quotes', 0, limit - 1);
        if (!keys || keys.length === 0) return [];
        
        // Get all values in one multi-get operation
        const values = await this.redis.mget(keys);
        
        // Parse JSON and add symbol info
        return values
          .map((value, index) => {
            if (!value) return null;
            try {
              const data = JSON.parse(value);
              return data;
            } catch (e) {
              return null;
            }
          })
          .filter(item => item !== null);
      } else {
        // With in-memory cache, sort by timestamp and return most recent
        const quotes = Array.from(this.fallbackCache.entries())
          .filter(([key, _]) => key.startsWith('quote_'))
          .map(([key, item]) => ({
            ...item.value,
            cacheKey: key
          }))
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
          .slice(0, limit);
          
        return quotes;
      }
    } catch (error) {
      logError('Error getting recently updated quotes:', error);
      return [];
    }
  }
  
  // Custom cache methods for any type of data
  async setCustomCache(key, value, expirySeconds = 300) {
    await this.set(key, value, expirySeconds);
  }
  
  async getCustomCache(key) {
    return await this.get(key);
  }
}

export default new MarketDataCacheService(); 