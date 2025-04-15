import request from 'supertest';
import express from 'express';
import { setupDB, teardownDB, clearDB } from './setup.js';
import tradeRoutes from '../backend/routes/tradeRoutes.js';
import { errorHandler } from '../backend/middleware/errorMiddleware.js';
import User from '../backend/models/userModel.js';
import Stock from '../backend/models/stockModel.js';
import Trade from '../backend/models/tradeModel.js';
import Wallet from '../backend/models/walletModel.js';
import { protect } from '../backend/middleware/authMiddleware.js';
import jwt from 'jsonwebtoken';

// Mock the auth middleware
jest.mock('../backend/middleware/authMiddleware.js', () => ({
  protect: jest.fn((req, res, next) => {
    req.user = {
      _id: '60d0fe4f5311236168a109ca',
      name: 'Test User',
      email: 'test@example.com'
    };
    next();
  }),
  admin: jest.fn((req, res, next) => next())
}));

// Create a test app
const app = express();
app.use(express.json());
app.use('/api/trades', tradeRoutes);
app.use(errorHandler);

// Setup and teardown
beforeAll(async () => await setupDB());
afterAll(async () => await teardownDB());
afterEach(async () => await clearDB());

describe('Trade API', () => {
  const testUser = {
    _id: '60d0fe4f5311236168a109ca',
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123'
  };

  const testStock = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    currentPrice: 150.00,
    previousClose: 148.50,
    change: 1.50,
    changePercent: 1.01,
    volume: 1000000
  };

  beforeEach(async () => {
    // Create test user and stock
    await User.create(testUser);
    await Stock.create(testStock);
    
    // Create a wallet for the user
    await Wallet.create({
      user: testUser._id,
      balance: 10000.00
    });
  });

  describe('Place Trade', () => {
    it('should place a buy trade with valid data', async () => {
      const tradeData = {
        symbol: 'AAPL',
        quantity: 5,
        type: 'buy',
        price: 150.00
      };

      const res = await request(app)
        .post('/api/trades')
        .send(tradeData);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('trade');
      expect(res.body.trade).toHaveProperty('symbol', tradeData.symbol);
      expect(res.body.trade).toHaveProperty('quantity', tradeData.quantity);
      expect(res.body.trade).toHaveProperty('type', tradeData.type);
      expect(res.body.trade).toHaveProperty('status', 'completed');
      
      // Check wallet balance was updated
      const wallet = await Wallet.findOne({ user: testUser._id });
      expect(wallet.balance).toBe(10000 - (tradeData.quantity * tradeData.price));
    });

    it('should not place a trade with invalid data', async () => {
      const tradeData = {
        symbol: 'AAPL',
        quantity: -5, // Invalid quantity
        type: 'buy',
        price: 150.00
      };

      const res = await request(app)
        .post('/api/trades')
        .send(tradeData);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should not place a buy trade with insufficient funds', async () => {
      // Update wallet to have insufficient funds
      await Wallet.findOneAndUpdate(
        { user: testUser._id },
        { balance: 100.00 }
      );

      const tradeData = {
        symbol: 'AAPL',
        quantity: 5,
        type: 'buy',
        price: 150.00
      };

      const res = await request(app)
        .post('/api/trades')
        .send(tradeData);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should not place a sell trade for stocks not owned', async () => {
      const tradeData = {
        symbol: 'AAPL',
        quantity: 5,
        type: 'sell',
        price: 150.00
      };

      const res = await request(app)
        .post('/api/trades')
        .send(tradeData);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Get User Trades', () => {
    beforeEach(async () => {
      // Create some trades for the user
      await Trade.create([
        {
          user: testUser._id,
          symbol: 'AAPL',
          quantity: 5,
          type: 'buy',
          price: 150.00,
          status: 'completed',
          total: 750.00
        },
        {
          user: testUser._id,
          symbol: 'MSFT',
          quantity: 3,
          type: 'buy',
          price: 250.00,
          status: 'completed',
          total: 750.00
        }
      ]);
    });

    it('should get all trades for the user', async () => {
      const res = await request(app)
        .get('/api/trades');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('trades');
      expect(res.body.trades).toHaveLength(2);
    });
  });
}); 