import compression from 'compression';
import { logInfo } from '../utils/logger.js';

/**
 * Enhanced compression middleware with optimized settings
 * Uses compression library with custom configuration for better performance
 */
const compressionMiddleware = compression({
  // Set compression level (1 = fastest, 9 = best compression)
  level: 6,
  
  // Minimum size in bytes to compress response (smaller responses aren't worth compressing)
  threshold: 1024, // 1KB
  
  // Skip compression for known binary file types
  filter: (req, res) => {
    // Don't compress if client specifically requests no compression
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Use compression built-in default filter (compresses text-based responses)
    return compression.filter(req, res);
  },
  
  // Custom GZIP options for fine-tuning
  chunkSize: 16384, // 16KB - optimal for most responses
  memLevel: 8, // Memory level (1-9): higher values use more memory but are faster
  
  // Log compression statistics when in development
  ...((process.env.NODE_ENV === 'development') ? {
    onAfterCompress: (req, res, compressed, uncompressed) => {
      if (uncompressed > 0) {
        const ratio = Math.round((compressed / uncompressed) * 100);
        logInfo(`Compressed: ${uncompressed} → ${compressed} bytes (${ratio}%)`);
      }
    }
  } : {})
});

export default compressionMiddleware;