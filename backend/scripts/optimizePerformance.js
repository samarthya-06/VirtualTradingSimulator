import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import cacheService from '../services/cacheService.js';
import { logInfo, logError } from '../utils/logger.js';
import os from 'os';

// Load environment variables
dotenv.config();

// Helper to format memory size
const formatMemorySize = (bytes) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
};

/**
 * Performance optimization script
 * Runs all optimization steps during server startup
 */
const optimizePerformance = async () => {
  // Configure Node.js performance optimizations
  try {
    // Increase event loop listeners
    process.setMaxListeners(20);

    // Configure garbage collection
    if (global.gc) {
      // Schedule periodic garbage collection
      setInterval(() => {
        try {
          global.gc();
        } catch (error) {
          // Ignore GC errors
        }
      }, 30000); // Run every 30 seconds
    }

    // Set up performance monitoring
    const startTime = process.hrtime();
    const memoryUsage = process.memoryUsage();

    // Log initial performance metrics
    logInfo('Performance optimization initialized', {
      memoryUsage: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB'
      },
      uptime: process.uptime() + ' seconds'
    });

    // Step 1: Check and optimize database connection
    await connectDB();
    logInfo('Database connection established and optimized');

    // Step 3: Verify and optimize Redis connection
    const redisConnected = await cacheService.isRedisConnected();
    logInfo(`Redis cache service status: ${redisConnected ? 'Connected' : 'Using fallback in-memory cache'}`);

    // Reset cache stats
    cacheService.resetStats();
    logInfo('Cache statistics reset');

    // Step 4: Check database indexes
    await optimizeIndexes(mongoose.connection.db);

    // Step 5: Warm up cache for frequently accessed data
    logInfo('Warming up cache for frequently accessed data...');

    // Import services needed for cache warming
    const stockMarketService = (await import('../services/stockMarketService.js')).default;

    // Warm up market index data
    try {
      await stockMarketService.getMarketIndices();
      logInfo('Market indices cached successfully');
    } catch (error) {
      logError('Error warming up market indices cache:', error);
    }

    // Warm up top traded stocks
    try {
      await stockMarketService.getTopStocks();
      logInfo('Top volume stocks cached successfully');
    } catch (error) {
      logError('Error warming up top stocks cache:', error);
    }

    // Final report
    logInfo('Performance optimization completed successfully');

    return {
      success: true,
      message: 'Performance optimizations applied successfully',
      metrics: {
        startTime,
        initialMemoryUsage: memoryUsage
      }
    };
  } catch (error) {
    logError('Performance optimization error:', error);

    return {
      success: false,
      message: 'Error applying performance optimizations',
      error: error.message
    };
  }
};

// Ensure proper indexing for frequently queried fields
const optimizeIndexes = async (db) => {
  try {
    logInfo('Checking database indexes...');

    if (!db || !db.collections) {
      logError('Database connection not fully established for index optimization');
      return;
    }

    if (mongoose.connection.readyState !== 1) {
      logError('MongoDB connection is not ready. Current state:', mongoose.connection.readyState);
      return;
    }

    const collections = [
      { name: 'users', indexes: [
        { key: { email: 1 }, options: { unique: true, name: 'email_unique' } },
        { key: { username: 1 }, options: { name: 'username_index' } }
      ] },
      { name: 'stocks', indexes: [
        { key: { symbol: 1 }, options: { unique: true, name: 'symbol_unique' } },
        { key: { sector: 1 }, options: { name: 'sector_index' } }
      ] },
      { name: 'orders', indexes: [
        { key: { userId: 1, createdAt: -1 }, options: { name: 'user_createdAt_index' } },
        { key: { status: 1 }, options: { name: 'status_index' } }
      ] },
      { name: 'portfolios', indexes: [
        { key: { user: 1 }, options: { unique: true, name: 'user_unique' } }
      ] }
    ];

    for (const { name, indexes } of collections) {
      const collection = db.collection(name);
      if (!collection) continue;

      for (const { key, options } of indexes) {
        try {
          const existingIndexes = await collection.indexes();
          const conflictingIndex = existingIndexes.find(index => index.name === options.name);

          if (conflictingIndex) {
            logInfo(`Dropping conflicting index: ${options.name}`);
            await collection.dropIndex(options.name);
          }

          await collection.createIndex(key, options);
          logInfo(`Created index: ${options.name}`);
        } catch (error) {
          if (error.code === 85 || error.message.includes('already exists')) {
            logInfo(`Index already exists, skipping: ${options.name}`);
          } else {
            logError(`Error creating index ${options.name}:`, error);
          }
        }
      }
    }

    logInfo('Database indexes optimized');
  } catch (error) {
    logError('Error optimizing database indexes', error);
  }
};

// Run the optimization
optimizePerformance()
  .then((result) => {
    logInfo('Optimization result:', result);
    // Don't exit process as this script will be imported by server.js
  })
  .catch((error) => {
    logError('Optimization script error:', error);
  });

export default optimizePerformance;