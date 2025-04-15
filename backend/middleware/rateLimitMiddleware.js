import { rateLimit } from 'express-rate-limit';
import { logInfo } from '../utils/logger.js';

/**
 * Rate limiting middleware factory
 * Creates rate limiters with different configurations for different endpoint types
 * 
 * @param {Object} options - Rate limiter options
 * @returns {Function} Express middleware function
 */
const createRateLimiter = (options) => {
  return rateLimit({
    // Default options
    windowMs: 15 * 60 * 1000, // 15 minutes (default)
    max: 100, // Limit each IP to 100 requests per windowMs (default)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    
    // Handler for when a client hits the rate limit
    handler: (req, res, next, options) => {
      logInfo(`Rate limit exceeded for IP: ${req.ip} on route: ${req.originalUrl}`);
      res.status(options.statusCode).json({
        message: options.message || 'Too many requests, please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    },
    
    // Skip rate limiting for trusted IPs or in development
    skip: (req) => {
      // Allow internal requests (e.g., from load balancers)
      const trustedProxies = (process.env.TRUSTED_PROXIES || '').split(',').map(ip => ip.trim());
      if (trustedProxies.includes(req.ip)) {
        return true;
      }
      
      // Skip rate limiting in development
      return process.env.NODE_ENV === 'development' && process.env.ENABLE_RATE_LIMIT !== 'true';
    },

    // Store with custom storage to use Redis in production
    // We're not implementing this here, but would be added for Redis-based storage
    
    // Override defaults with options
    ...options
  });
};

/**
 * Standard rate limiter
 * For most API endpoints - moderate limits
 */
export const standardLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Authentication rate limiter
 * Stricter limits for auth endpoints to prevent brute force attacks
 */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Public endpoints rate limiter
 * Higher limits for public endpoints that don't require authentication
 */
export const publicLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Market data rate limiter
 * Moderate limits for market data endpoints
 */
export const marketLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Too many market data requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Trading endpoints rate limiter
 * Moderate limits for trading-related endpoints
 */
export const tradingLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: 'Too many trading requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Premium tier rate limiter
 * Higher limits for premium tier users
 */
export const premiumLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes
  message: 'Premium tier rate limit exceeded, please try again after 15 minutes',
  
  // Only apply rate limiting if user is not premium
  skip: (req) => {
    return req.user && req.user.membership === 'premium';
  }
});

/**
 * Brutal rate limiter for high-security endpoints
 * Very strict limits for sensitive operations
 */
export const brutalLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 60 minutes
  max: 5, // 5 requests per hour
  message: 'Too many sensitive operations, please try again after an hour'
});

export default {
  standardLimiter,
  authLimiter,
  publicLimiter,
  marketLimiter,
  tradingLimiter,
  premiumLimiter,
  brutalLimiter,
  createRateLimiter // Export factory function for custom rate limiters
};