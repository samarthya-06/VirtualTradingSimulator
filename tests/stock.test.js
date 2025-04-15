import request from 'supertest';
import express from 'express';
import { setupDB, teardownDB, clearDB } from './setup.js';
import stockRoutes from '../backend/routes/stockRoutes.js';
import { errorHandler } from '../backend/middleware/errorMiddleware.js';
import Stock from '../backend/models/stockModel.js';
import { protect, admin } from '../backend/middleware/authMiddleware.js';

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
  admin: jest.fn((req, res, next) => {
    req.user.isAdmin = true;
    next();
  })
}));

// Create a test app
const app = express();
app.use(express.json());
app.use('/api/stocks', stockRoutes);
app.use(errorHandler);

// Setup and teardown
beforeAll(async () => await setupDB());
afterAll(async () => await teardownDB());
afterEach(async () => await clearDB());

describe('Stock API', () => {
  const testStocks = [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      currentPrice: 150.00,
      previousClose: 148.50,
      change: 1.50,
      changePercent: 1.01,
      volume: 1000000
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      currentPrice: 250.00,
      previousClose: 248.00,
      change: 2.00,
      changePercent: 0.81,
      volume: 800000
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      currentPrice: 2500.00,
      previousClose: 2480.00,
      change: 20.00,
      changePercent: 0.81,
      volume: 500000
    }
  ];

  beforeEach(async () => {
    // Create test stocks
    await Stock.create(testStocks);
  });

  describe('Get Stocks', () => {
    it('should get all stocks', async () => {
      const res = await request(app)
        .get('/api/stocks');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('stocks');
      expect(res.body.stocks).toHaveLength(3);
    });
  });

  describe('Get Stock by Symbol', () => {
    it('should get a stock by symbol', async () => {
      const res = await request(app)
        .get('/api/stocks/AAPL');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('stock');
      expect(res.body.stock).toHaveProperty('symbol', 'AAPL');
      expect(res.body.stock).toHaveProperty('name', 'Apple Inc.');
    });

    it('should return 404 for non-existent stock', async () => {
      const res = await request(app)
        .get('/api/stocks/NONEXISTENT');

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Search Stocks', () => {
    it('should search stocks by query', async () => {
      const res = await request(app)
        .get('/api/stocks/search?query=Apple');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('stocks');
      expect(res.body.stocks).toHaveLength(1);
      expect(res.body.stocks[0]).toHaveProperty('symbol', 'AAPL');
    });

    it('should return empty array for no matches', async () => {
      const res = await request(app)
        .get('/api/stocks/search?query=NonExistentCompany');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('stocks');
      expect(res.body.stocks).toHaveLength(0);
    });
  });

  describe('Update Stock Data (Admin)', () => {
    it('should update stock data as admin', async () => {
      const updatedData = {
        currentPrice: 155.00,
        previousClose: 150.00,
        change: 5.00,
        changePercent: 3.33,
        volume: 1200000
      };

      const res = await request(app)
        .put('/api/stocks/AAPL')
        .send(updatedData);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('stock');
      expect(res.body.stock).toHaveProperty('currentPrice', 155.00);
      expect(res.body.stock).toHaveProperty('change', 5.00);
    });
  });
}); 