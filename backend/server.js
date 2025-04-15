import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { errorHandler } from './middleware/errorMiddleware.js';
import compressionMiddleware from './middleware/compressionMiddleware.js';
import securityMiddleware from './middleware/securityMiddleware.js';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './controllers/marketController.js';
import userRoutes from './routes/userRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
import tradeRoutes from './routes/tradeRoutes.js';
import watchlistRoutes from './routes/watchlistRoutes.js';
import portfolioRoutes from './routes/portfolioRoutes.js';
import marketRoutes from './routes/marketRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import learnRoutes from './routes/learnRoutes.js';
// Leaderboard routes removed
import transactionRoutes from './routes/transactionRoutes.js';
import membershipRoutes from './routes/membershipRoutes.js';
import indicatorRoutes from './routes/indicatorRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import stockScreenerRoutes from './routes/stockScreenerRoutes.js';
import schedulerService from './services/schedulerService.js';
import colors from 'colors';
import helmet from 'helmet';
import xss from 'xss-clean';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import http from 'http';
import marketDataCacheService from './services/marketDataCacheService.js';
import webSocketService from './services/webSocketService.js';
import cronService from './services/cronService.js';
import { logInfo, logError } from './utils/logger.js';
import redisClient from './config/redis.js';
import { fileURLToPath } from 'url';
import events from 'events';
import passport from 'passport';
import session from 'express-session';
import { configurePassport } from './config/passport.js';

// Increase default EventEmitter max listeners to prevent warnings
// This addresses the MaxListenersExceededWarning
events.defaultMaxListeners = 30;

// Import performance optimization script
import optimizePerformance from './scripts/optimizePerformance.js';

// Import Yahoo Finance configuration
import { configureYahooFinance } from './utils/yahooFinanceConfig.js';

// Get current file path (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Configure environment variables with defaults for real-time updates
process.env.REALTIME_UPDATE_INTERVAL = process.env.REALTIME_UPDATE_INTERVAL || '1000'; // 1 second update interval
process.env.MAX_ACTIVE_SYMBOLS = process.env.MAX_ACTIVE_SYMBOLS || '150'; // Limit active symbols
process.env.WS_MAX_RECONNECT_ATTEMPTS = process.env.WS_MAX_RECONNECT_ATTEMPTS || '5';
process.env.WS_RECONNECT_DELAY = process.env.WS_RECONNECT_DELAY || '1000'; // 1 second delay
process.env.WS_HEARTBEAT_INTERVAL = process.env.WS_HEARTBEAT_INTERVAL || '30000'; // 30 second heartbeat

// Debug JWT Secret
console.log(`Loading JWT_SECRET of length: ${process.env.JWT_SECRET?.length || 'undefined'}`);

const app = express();
// Create HTTP server
const server = http.createServer(app);

// Trust proxy for rate limiting to work correctly with X-Forwarded-For headers
app.set('trust proxy', 1);

// Apply security middlewares
app.use(securityMiddleware.helmet);
app.use(securityMiddleware.xss);
app.use(securityMiddleware.hpp);
app.use(securityMiddleware.strictCSP);

// Apply CORS middleware with enhanced security
app.use(securityMiddleware.cors);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(compressionMiddleware); // Add compression middleware to improve API response times

// Configure session middleware
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Initialize Passport and session
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport strategies
configurePassport();

// Import rate limiters
import { standardLimiter, publicLimiter, authLimiter, marketLimiter, tradingLimiter } from './middleware/rateLimitMiddleware.js';

// Routes with rate limiting
app.use('/api/users', authLimiter, userRoutes); // Stricter limits for auth endpoints
app.use('/api/stocks', publicLimiter, stockRoutes); // Higher limits for public endpoints
app.use('/api/trades', tradingLimiter, tradeRoutes); // Use trading-specific limiter
app.use('/api/watchlist', standardLimiter, watchlistRoutes);
app.use('/api/portfolio', standardLimiter, portfolioRoutes);
app.use('/api/market', marketLimiter, marketRoutes); // Use market-specific limiter
app.use('/api/wallet', standardLimiter, walletRoutes);
app.use('/api/payment', standardLimiter, paymentRoutes); // Payment routes under dedicated path
app.use('/api/learn', standardLimiter, learnRoutes); // Educational content routes
// Leaderboard routes removed
app.use('/api/transactions', standardLimiter, transactionRoutes); // Transaction routes
app.use('/api/membership', standardLimiter, membershipRoutes); // Membership routes
app.use('/api/indicators', marketLimiter, indicatorRoutes); // Technical indicators routes with market-specific rate limits
app.use('/api/notifications', standardLimiter, notificationRoutes); // Notification routes
app.use('/api/stock-screener', marketLimiter, stockScreenerRoutes); // Stock screener routes with market-specific rate limits

// Add system status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// Add cache status endpoint (admin only)
app.get('/api/admin/cache/status', async (req, res) => {
  // This would be protected by authentication middleware in a real implementation
  try {
    const cacheService = (await import('./services/cacheService.js')).default;
    const stats = cacheService.getStats();
    res.json({
      status: 'ok',
      stats
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('frontend/build'));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend', 'build', 'index.html'));
  });
} else {
  // Development mode - handle undefined routes
  app.use((req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
  });
}

// Error handler middleware
app.use(errorHandler);

// Main async function to run the server
const startServer = async () => {
  try {
    // Configure Yahoo Finance for Indian markets
    configureYahooFinance();

    // Flag to track MongoDB connection status
    let databaseConnected = false;

    // Connect to MongoDB with retry logic
    const connectWithRetry = async (retries = 5, delay = 5000) => {
      let lastError;
      for (let i = 0; i < retries; i++) {
        try {
          await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
          });
          console.log('MongoDB Connected');
          databaseConnected = true;
          return true;
        } catch (err) {
          lastError = err;
          console.error(`MongoDB connection attempt ${i+1} failed:`, err.message);
          if (i < retries - 1) {
            console.log(`Retrying in ${delay/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      console.error('All MongoDB connection attempts failed. Starting without MongoDB:', lastError.message);
      return false;
    };

    // Wait for database connection before proceeding
    await connectWithRetry();

    // Initialize Redis if enabled
    let redisConnected = false;
    if (process.env.REDIS_ENABLED === 'true') {
      try {
        // Now we await Redis to ensure it's connected before proceeding
        await redisClient.connect();
        console.log('Redis connected successfully');
        redisConnected = true;
      } catch (redisError) {
        console.error('Redis connection failed:', redisError.message);
        console.log('Running without Redis...');
      }
    } else {
      console.log('Redis is disabled in configuration');
    }

    // Start the HTTP server
    const PORT = process.env.PORT || 5001;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Socket.IO setup with CORS configuration
    const io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
      },
      transports: ['websocket', 'polling'],
      // Performance optimizations for socket.io
      pingTimeout: 30000,
      pingInterval: 25000,
      upgradeTimeout: 10000,
      maxHttpBufferSize: 1e6, // 1 MB
      // Compression options
      perMessageDeflate: {
        threshold: 1024, // Only compress messages larger than 1KB
        zlibDeflateOptions: {
          chunkSize: 16 * 1024, // 16KB
          level: 6, // Compression level (6 is default)
          memLevel: 8 // Memory level (8 is default)
        }
      },
      // Additional performance settings for high-frequency updates
      allowEIO3: true, // Allow older clients
      connectTimeout: 15000 // Longer timeout for initial connection
    });

    // Set up socket.io cluster mode if using redis (as a separate step after creating the server)
    if (redisConnected && redisClient) {
      // Import the adapter constructor for socket.io-redis
      const { createAdapter } = await import('@socket.io/redis-adapter');

      // Create a duplicate client for the pub/sub pattern
      const subClient = redisClient.duplicate();

      // Set the adapter only if Redis is connected
      io.adapter(createAdapter(redisClient, subClient));
      console.log('Socket.IO Redis adapter configured');
    } else {
      console.log('Socket.IO running without Redis adapter');
    }

    // Initialize the WebSocket service with the proper frequency
    webSocketService.updateInterval = parseInt(process.env.REALTIME_UPDATE_INTERVAL) || 1000;

    // Setup WebSocket handlers with rate limiting for high message throughput
    setupSocketHandlers(io);

    // Run WebSocket cleanup task periodically to prevent memory leaks
    setInterval(() => {
      webSocketService.cleanupErrorCounts();
      webSocketService.cleanupInactiveSymbols();
    }, 60000); // Run every minute

    // Initialize cron jobs with error handling
    try {
      cronService.startAllTasks();
      console.log('Cron jobs initialized successfully');
    } catch (cronError) {
      console.error('Failed to start cron jobs:', cronError.message);
    }

    // Initialize performance optimizations with error handling -
    // only attempt if database is connected
    try {
      if (databaseConnected) {
        await optimizePerformance();
        console.log('Performance optimizations applied');
      } else {
        console.log('Skipping performance optimizations due to database connection issues');
      }
    } catch (optError) {
      console.error('Performance optimization failed:', optError.message);
    }
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
};

// Start the server
startServer();