import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import { logInfo, logError } from '../utils/logger.js';

// Import all models
import User from '../models/userModel.js';
import Stock from '../models/stockModel.js';
import Trade from '../models/tradeModel.js';
import Portfolio from '../models/portfolioModel.js';
import Watchlist from '../models/watchlistModel.js';
import Wallet from '../models/walletModel.js';
import Transaction from '../models/transactionModel.js';
import Membership from '../models/membershipModel.js';
import Order from '../models/orderModel.js';
import PriceAlert from '../models/priceAlertModel.js';
import Notification from '../models/Notification.js';
// Leaderboard model removed
import UserProgress from '../models/userProgressModel.js';
import Module from '../models/moduleModel.js';
import Lesson from '../models/lessonModel.js';

// Load environment variables
dotenv.config();

// Function to create and verify indexes
const createIndexes = async () => {
  try {
    logInfo('Starting creation of database indexes...');

    // Connect to the database
    await connectDB();

    // Create indexes for each model

    // User model indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ isAdmin: 1 });
    await User.collection.createIndex({ 'profile.phone': 1 });
    await User.collection.createIndex({ createdAt: -1 });
    await User.collection.createIndex({ membership: 1 });

    // Trade model indexes
    await Trade.collection.createIndex({ user: 1, stock: 1, createdAt: -1 });
    await Trade.collection.createIndex({ user: 1, createdAt: -1 });
    await Trade.collection.createIndex({ stock: 1, createdAt: -1 });
    await Trade.collection.createIndex({ status: 1 });
    await Trade.collection.createIndex({ orderType: 1, status: 1 });
    await Trade.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    // Portfolio model indexes
    await Portfolio.collection.createIndex({ user: 1 });
    await Portfolio.collection.createIndex({ user: 1, 'holdings.stock': 1 });

    // Stock model indexes
    await Stock.collection.createIndex({ symbol: 1 }, { unique: true });
    await Stock.collection.createIndex({ companyName: 'text', symbol: 'text' });
    await Stock.collection.createIndex({ sector: 1 });
    await Stock.collection.createIndex({ industry: 1 });

    // Watchlist model indexes
    await Watchlist.collection.createIndex({ user: 1 });
    await Watchlist.collection.createIndex({ 'stocks.stock': 1 });

    // Wallet model indexes
    await Wallet.collection.createIndex({ user: 1 }, { unique: true });

    // Transaction model indexes
    await Transaction.collection.createIndex({ user: 1, createdAt: -1 });
    await Transaction.collection.createIndex({ type: 1 });

    // Order model indexes
    await Order.collection.createIndex({ user: 1, createdAt: -1 });
    await Order.collection.createIndex({ status: 1 });
    await Order.collection.createIndex({ expiresAt: 1 });

    // Notification model indexes
    await Notification.collection.createIndex({ user: 1, read: 1 });
    await Notification.collection.createIndex({ createdAt: -1 });

    // PriceAlert model indexes
    await PriceAlert.collection.createIndex({ user: 1, stock: 1 });
    await PriceAlert.collection.createIndex({ price: 1, condition: 1 });

    // Leaderboard model removed

    // Learning content indexes
    await Module.collection.createIndex({ order: 1 });
    await Lesson.collection.createIndex({ module: 1, order: 1 });
    await UserProgress.collection.createIndex({ user: 1, lesson: 1 }, { unique: true });

    // Membership model indexes
    await Membership.collection.createIndex({ user: 1 }, { unique: true });
    await Membership.collection.createIndex({ type: 1 });
    await Membership.collection.createIndex({ expiresAt: 1 });

    logInfo('All database indexes created successfully!');

    // List all created indexes
    const collections = await mongoose.connection.db.collections();

    for (const collection of collections) {
      const indexes = await collection.indexes();
      logInfo(`Collection ${collection.collectionName} has these indexes:`);
      console.log(indexes);
    }

    mongoose.connection.close();
    logInfo('Database connection closed.');

  } catch (error) {
    logError('Error creating indexes:', error);
    process.exit(1);
  }
};

// Run the function
createIndexes();