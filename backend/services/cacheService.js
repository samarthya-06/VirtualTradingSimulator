import Redis from 'ioredis';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { logInfo, logError } from '../utils/logger.js';

// Load environment variables
dotenv.config();

// Default cache expiration time in seconds
const DEFAULT_EXPIRY = 3600; // 1 hour

// Cache statistics to monitor performance
const cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  errors: 0,
  lastReset: Date.now(),
  mockCacheUsed: false,
};

// Create a mock cache for when Redis is not available
const mockCache = new Map();

// Flag to track if we're using the mock cache
let usingMockCache = false;

// Create Redis client with fallback to mock cache
let redisClient = null;
try {
  // Check if Redis is enabled in environment
  const redisEnabled = process.env.REDIS_ENABLED === 'true';
  
  if (!redisEnabled) {
    logInfo('Redis is disabled in environment, using in-memory cache');
    usingMockCache = true;
    cacheStats.mockCacheUsed = true;
  } else {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT || 6379;
    
    // Check if we should use Redis Cluster
    const useCluster = process.env.REDIS_CLUSTER_ENABLED === 'true';
    
    logInfo(`Attempting to connect to Redis${useCluster ? ' cluster' : ''} at ${redisHost}:${redisPort}...`);
    
    if (useCluster) {
      // Parse cluster nodes from environment variable
      const clusterNodes = process.env.REDIS_CLUSTER_NODES 
        ? process.env.REDIS_CLUSTER_NODES.split(',').map(node => {
            const [host, port] = node.trim().split(':');
            return { host, port: parseInt(port, 10) };
          })
        : [{ host: redisHost, port: parseInt(redisPort, 10) }];
      
      redisClient = new Redis.Cluster(clusterNodes, {
        redisOptions: {
          password: process.env.REDIS_PASSWORD || '',
          connectTimeout: 10000,
          maxRetriesPerRequest: 3,
        },
        clusterRetryStrategy: (times) => {
          // Only retry a few times, then give up
          if (times > 3) {
            logInfo('Redis cluster connection failed after multiple attempts, using in-memory cache instead');
            usingMockCache = true;
            cacheStats.mockCacheUsed = true;
            return null; // Stop retrying
          }
          // Retry connection with exponential backoff
          const delay = Math.min(times * 200, 5000);
          logInfo(`Redis cluster connection attempt ${times} failed, retrying in ${delay}ms...`);
          return delay;
        },
      });
    } else {
      // Use single Redis instance
      redisClient = new Redis({
        host: redisHost,
        port: parseInt(redisPort, 10),
        password: process.env.REDIS_PASSWORD || '',
        retryStrategy: (times) => {
          // Only retry a few times, then give up
          if (times > 3) {
            logInfo('Redis connection failed after multiple attempts, using in-memory cache instead');
            usingMockCache = true;
            cacheStats.mockCacheUsed = true;
            return null; // Stop retrying
          }
          // Retry connection with exponential backoff
          const delay = Math.min(times * 100, 3000);
          logInfo(`Redis connection attempt ${times} failed, retrying in ${delay}ms...`);
          return delay;
        },
        maxRetriesPerRequest: 3,
        connectTimeout: 10000, // 10 seconds
        enableOfflineQueue: false,
        reconnectOnError: (err) => {
          const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET'];
          const shouldReconnect = targetErrors.some(e => err.message.includes(e));
          return shouldReconnect;
        },
      });
    }

    // Handle Redis connection events
    redisClient.on('connect', () => {
      logInfo(`Redis ${useCluster ? 'cluster' : 'client'} connected successfully`);
      usingMockCache = false;
      cacheStats.mockCacheUsed = false;
    });

    redisClient.on('ready', () => {
      logInfo(`Redis ${useCluster ? 'cluster' : 'client'} is ready to use`);
    });

    redisClient.on('error', (err) => {
      if (!usingMockCache) {
        logError('Redis error:', err.message);
        logInfo('Falling back to in-memory cache');
        usingMockCache = true;
        cacheStats.mockCacheUsed = true;
        cacheStats.errors++;
      }
    });
    
    redisClient.on('end', () => {
      logInfo('Redis connection closed');
      usingMockCache = true;
      cacheStats.mockCacheUsed = true;
    });
  }
} catch (error) {
  logError('Failed to initialize Redis client:', error);
  logInfo('Using in-memory cache instead');
  usingMockCache = true;
  cacheStats.mockCacheUsed = true;
  cacheStats.errors++;
}

// Helper function to safely execute Redis commands
const safeRedisOperation = async (operation, fallback) => {
  try {
    if (usingMockCache || !redisClient) {
      return fallback();
    }
    return await operation();
  } catch (error) {
    logError('Redis operation error:', error);
    cacheStats.errors++;
    return fallback();
  }
};

// Cache key namespace helper to segment cache by environment or application
const namespace = process.env.CACHE_NAMESPACE || 'vts';
const namespaceKey = (key) => `${namespace}:${key}`;

/**
 * Cache service for storing and retrieving data
 * Falls back to in-memory cache if Redis is unavailable
 */
const cacheService = {
  /**
   * Set a value in the cache
   * 
   * @param {string} key - The cache key
   * @param {any} value - The value to cache (will be JSON stringified)
   * @param {number} expiry - Expiry time in seconds (default: 1 hour)
   * @returns {Promise<string>} - Redis response
   */
  set: async (key, value, expiry = DEFAULT_EXPIRY) => {
    const namespacedKey = namespaceKey(key);
    cacheStats.sets++;
    
    return safeRedisOperation(
      async () => await redisClient.set(namespacedKey, JSON.stringify(value), 'EX', expiry),
      () => {
        mockCache.set(namespacedKey, {
          value: JSON.stringify(value),
          expiry: Date.now() + (expiry * 1000)
        });
        return 'OK';
      }
    );
  },
  
  /**
   * Get a value from the cache
   * 
   * @param {string} key - The cache key
   * @returns {Promise<any>} - The cached value or null if not found
   */
  get: async (key) => {
    const namespacedKey = namespaceKey(key);
    
    const result = await safeRedisOperation(
      async () => {
        const data = await redisClient.get(namespacedKey);
        if (data) {
          cacheStats.hits++;
          return JSON.parse(data);
        } else {
          cacheStats.misses++;
          return null;
        }
      },
      () => {
        const item = mockCache.get(namespacedKey);
        if (!item) {
          cacheStats.misses++;
          return null;
        }
        
        // Check if expired
        if (item.expiry < Date.now()) {
          mockCache.delete(namespacedKey);
          cacheStats.misses++;
          return null;
        }
        
        cacheStats.hits++;
        return JSON.parse(item.value);
      }
    );
    
    return result;
  },
  
  /**
   * Delete a value from the cache
   * 
   * @param {string} key - The cache key
   * @returns {Promise<number>} - Number of keys removed
   */
  del: async (key) => {
    const namespacedKey = namespaceKey(key);
    
    return safeRedisOperation(
      async () => await redisClient.del(namespacedKey),
      () => mockCache.delete(namespacedKey) ? 1 : 0
    );
  },
  
  /**
   * Delete multiple values from the cache by pattern
   * 
   * @param {string} pattern - The pattern to match keys (e.g., "user:*")
   * @returns {Promise<number>} - Number of keys removed
   */
  delByPattern: async (pattern) => {
    const namespacedPattern = namespaceKey(pattern);
    
    return safeRedisOperation(
      async () => {
        const keys = await redisClient.keys(namespacedPattern);
        if (keys.length > 0) {
          return await redisClient.del(keys);
        }
        return 0;
      },
      () => {
        let count = 0;
        const searchPattern = namespacedPattern.replace(/\*/g, '');
        for (const key of mockCache.keys()) {
          if (key.includes(searchPattern)) {
            mockCache.delete(key);
            count++;
          }
        }
        return count;
      }
    );
  },
  
  /**
   * Check if a key exists in the cache
   * 
   * @param {string} key - The cache key
   * @returns {Promise<boolean>} - True if key exists, false otherwise
   */
  exists: async (key) => {
    const namespacedKey = namespaceKey(key);
    
    return safeRedisOperation(
      async () => {
        const result = await redisClient.exists(namespacedKey);
        return result === 1;
      },
      () => mockCache.has(namespacedKey)
    );
  },
  
  /**
   * Set expiry time for a key
   * 
   * @param {string} key - The cache key
   * @param {number} expiry - Expiry time in seconds
   * @returns {Promise<number>} - 1 if successful, 0 if key doesn't exist
   */
  expire: async (key, expiry) => {
    const namespacedKey = namespaceKey(key);
    
    return safeRedisOperation(
      async () => await redisClient.expire(namespacedKey, expiry),
      () => {
        const item = mockCache.get(namespacedKey);
        if (!item) return 0;
        
        item.expiry = Date.now() + (expiry * 1000);
        mockCache.set(namespacedKey, item);
        return 1;
      }
    );
  },
  
  /**
   * Flush all data from the cache
   * 
   * @returns {Promise<string>} - Redis response
   */
  flush: async () => {
    try {
      if (usingMockCache) {
        mockCache.clear();
        return 'OK';
      }
      // Only flush keys with our namespace
      const keys = await redisClient.keys(`${namespace}:*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return 'OK';
    } catch (error) {
      console.error('Cache flush error:', error.message);
      mockCache.clear();
      cacheStats.errors++;
      return 'OK';
    }
  },
  
  /**
   * Set multiple values in the cache (batch operation)
   * 
   * @param {Object} items - Object with key-value pairs to cache
   * @param {number} expiry - Expiry time in seconds (default: 1 hour)
   * @returns {Promise<string>} - Redis response
   */
  mset: async (items, expiry = DEFAULT_EXPIRY) => {
    if (!items || Object.keys(items).length === 0) {
      return 'OK';
    }
    
    cacheStats.sets += Object.keys(items).length;
    
    return safeRedisOperation(
      async () => {
        const pipeline = redisClient.pipeline();
        
        for (const [key, value] of Object.entries(items)) {
          const namespacedKey = namespaceKey(key);
          pipeline.set(namespacedKey, JSON.stringify(value), 'EX', expiry);
        }
        
        await pipeline.exec();
        return 'OK';
      },
      () => {
        for (const [key, value] of Object.entries(items)) {
          const namespacedKey = namespaceKey(key);
          mockCache.set(namespacedKey, {
            value: JSON.stringify(value),
            expiry: Date.now() + (expiry * 1000)
          });
        }
        return 'OK';
      }
    );
  },
  
  /**
   * Get cache stats
   * @returns {Object} - Cache statistics
   */
  getStats: () => ({
    ...cacheStats,
    hitRate: cacheStats.hits + cacheStats.misses > 0 
      ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses)).toFixed(2) 
      : 0,
    uptime: Math.floor((Date.now() - cacheStats.lastReset) / 1000),
    mockCacheSize: usingMockCache ? mockCache.size : 0,
    usingMockCache
  }),
  
  /**
   * Reset cache stats
   */
  resetStats: () => {
    cacheStats.hits = 0;
    cacheStats.misses = 0;
    cacheStats.sets = 0;
    cacheStats.errors = 0;
    cacheStats.lastReset = Date.now();
  },

  /**
   * Check if Redis is connected and available
   * @returns {Promise<boolean>} - True if Redis is connected
   */
  isRedisConnected: async () => {
    if (usingMockCache) {
      return false;
    }
    
    try {
      await redisClient.ping();
      return true;
    } catch (error) {
      return false;
    }
  },
  
  /**
   * Get the Redis client instance
   * 
   * @returns {Redis} - Redis client instance or null if using mock cache
   */
  getRedisClient: () => {
    if (usingMockCache) {
      return null;
    }
    return redisClient;
  }
};

export default cacheService; 