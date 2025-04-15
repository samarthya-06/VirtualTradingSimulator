import Redis from 'ioredis';
import { logError, logInfo } from '../utils/logger.js';

// Check if Redis is enabled
const isRedisEnabled = process.env.REDIS_ENABLED === 'true';

// Create a mock Redis client if Redis is disabled
let redisClient;

if (!isRedisEnabled) {
  logInfo('Redis is disabled, using in-memory cache');
  
  // Create a mock Redis implementation
  redisClient = {
    get: async (key) => null,
    set: async (key, value, options) => 'OK',
    del: async (key) => 1,
    exists: async (key) => 0,
    flushall: async () => 'OK',
    ping: async () => 'PONG',
    connect: async () => logInfo('Mock Redis connect called'),
    on: () => redisClient, // Return self for chaining
    // Add any other methods you need
  };
} else {
  logInfo(`Attempting to connect to Redis at ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}...`);

  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    showFriendlyErrorStack: true,
    // Add connection timeout
    connectTimeout: 5000, // 5 seconds timeout
    // Don't wait for ready check to complete (faster startup)
    lazyConnect: true
  };

  redisClient = new Redis(redisConfig);

  redisClient.on('connect', () => {
    logInfo('Redis connected successfully');
  });

  redisClient.on('error', (error) => {
    logError('Redis connection error:', error);
  });

  redisClient.on('reconnecting', (times) => {
    logInfo(`Redis reconnecting... Attempt ${times}`);
  });

  redisClient.on('ready', () => {
    logInfo('Redis is ready to accept connections');
  });

  redisClient.on('close', () => {
    logInfo('Redis connection closed');
  });

  // Test connection
  redisClient.on('ready', () => {
    redisClient.ping().then(() => {
      logInfo('Redis ping successful');
    }).catch((error) => {
      logError('Redis ping failed:', error);
    });
  });
}

export default redisClient; 