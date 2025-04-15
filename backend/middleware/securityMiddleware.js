import helmet from 'helmet';
import xss from 'xss-clean';
import hpp from 'hpp';
import cors from 'cors';

/**
 * Security middleware collection
 * Provides various security enhancements for the API
 */
const securityMiddleware = {
  /**
   * Helmet middleware
   * Sets various HTTP headers to improve security
   */
  helmet: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.market-data-provider.com"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }),

  /**
   * XSS Clean middleware
   * Sanitizes user input to prevent cross-site scripting attacks
   */
  xss: xss(),

  /**
   * HTTP Parameter Pollution protection
   * Prevents parameter pollution attacks
   */
  hpp: hpp(),

  /**
   * Enhanced CORS middleware
   * Configure Cross-Origin Resource Sharing with more secure options
   */
  cors: cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 600 // Cache preflight requests for 10 minutes
  }),
  
  /**
   * Content-Security-Policy middleware
   * Define a more restrictive CSP for sensitive routes
   */
  strictCSP: (req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.market-data-provider.com"
    );
    next();
  }
};

export default securityMiddleware; 