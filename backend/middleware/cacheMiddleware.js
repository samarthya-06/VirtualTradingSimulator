import cacheService from '../services/cacheService.js';

/**
 * Cache middleware for Express routes
 * Caches the response of GET requests
 * 
 * @param {number} duration - Cache duration in seconds
 * @returns {Function} - Express middleware function
 */
export const cacheMiddleware = (duration = 3600) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create a unique cache key based on the URL and query parameters
    const key = `__express__${req.originalUrl || req.url}`;
    
    try {
      // Try to get cached response
      const cachedResponse = await cacheService.get(key);
      
      if (cachedResponse) {
        // Return cached response
        return res.json(cachedResponse);
      }
      
      // Store the original res.json method
      const originalJson = res.json;
      
      // Override res.json method to cache the response
      res.json = function(data) {
        // Cache the response data
        cacheService.set(key, data, duration);
        
        // Call the original json method
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Clear cache by pattern
 * Utility function to clear cache entries matching a pattern
 * 
 * @param {string} pattern - The pattern to match keys (e.g., "user:*")
 * @returns {Promise<number>} - Number of keys removed
 */
export const clearCache = async (pattern) => {
  return await cacheService.delByPattern(pattern);
};

export default { cacheMiddleware, clearCache }; 