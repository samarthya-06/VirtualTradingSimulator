import mongoose from 'mongoose';
import { setupDB, teardownDB, clearDB } from './setup.js';
import tradeService from '../backend/services/tradeService.js';
import User from '../backend/models/userModel.js';
import Stock from '../backend/models/stockModel.js';
import Trade from '../backend/models/tradeModel.js';
import Portfolio from '../backend/models/portfolioModel.js';

// Setup and teardown DB
beforeAll(async () => await setupDB());
afterAll(async () => await teardownDB());
afterEach(async () => await clearDB());

describe('Trailing Stop Order Tests', () => {
  let testUser;
  let testStock;
  let order;

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      name: 'Test User',
      email: 'trailstop@example.com',
      password: 'password123',
      walletBalance: 10000.00,
      heldBalance: 1000.00
    });

    // Create test stock
    testStock = await Stock.create({
      symbol: 'RELIANCE',
      name: 'Reliance Industries',
      exchange: 'NSE',
      currentPrice: 2500.00,
      previousClose: 2450.00,
      volume: 1000000
    });

    // Create a portfolio for the user
    await Portfolio.create({
      user: testUser._id,
      holdings: [{
        stock: testStock._id,
        quantity: 10,
        averageBuyPrice: 2400.00,
        currentValue: 25000.00,
        profitLoss: 1000.00
      }],
      totalValue: 25000.00,
      totalProfitLoss: 1000.00
    });
  });

  describe('Buy Trailing Stop Orders', () => {
    beforeEach(async () => {
      // Create buy trailing stop order
      order = await Trade.create({
        user: testUser._id,
        stock: testStock._id,
        type: 'BUY',
        quantity: 2,
        orderType: 'TRAILING_STOP',
        trailingPercent: 5,
        status: 'PENDING',
        totalAmount: 5000.00, // Amount held for the order
        remainingQuantity: 2,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
      });
    });

    it('should initialize trailing stop price when processing for the first time', async () => {
      // Process the order one time
      await tradeService.processPendingOrders();
      
      // Refresh the order from DB
      const updatedOrder = await Trade.findById(order._id);
      
      // Verify trailing stop price was initialized
      expect(updatedOrder.trailingStopPrice).toBeDefined();
      expect(updatedOrder.highestPrice).toBe(2500.00); // Current price of the stock
      
      // Expected trailing stop price is 5% below current price
      const expectedStopPrice = 2500 * (1 - 5/100);
      expect(updatedOrder.trailingStopPrice).toBe(expectedStopPrice);
      
      // Order should still be pending
      expect(updatedOrder.status).toBe('PENDING');
    });

    it('should adjust trailing stop price when stock price increases', async () => {
      // First process to initialize
      await tradeService.processPendingOrders();
      
      // Update stock price to a higher value (10% increase)
      await Stock.findByIdAndUpdate(testStock._id, {
        currentPrice: 2750.00
      });
      
      // Process the order again
      await tradeService.processPendingOrders();
      
      // Refresh the order from DB
      const updatedOrder = await Trade.findById(order._id);
      
      // Verify trailing stop price was adjusted
      expect(updatedOrder.highestPrice).toBe(2750.00);
      
      // Expected trailing stop price is 5% below new high
      const expectedStopPrice = 2750 * (1 - 5/100);
      expect(updatedOrder.trailingStopPrice).toBe(expectedStopPrice);
      
      // Order should still be pending
      expect(updatedOrder.status).toBe('PENDING');
    });

    it('should execute order when price falls below trailing stop', async () => {
      // First process to initialize
      await tradeService.processPendingOrders();
      
      // Capture initial trailing stop price
      const initialOrder = await Trade.findById(order._id);
      const initialStopPrice = initialOrder.trailingStopPrice;
      
      // Update stock price to fall below trailing stop
      await Stock.findByIdAndUpdate(testStock._id, {
        currentPrice: initialStopPrice - 10
      });
      
      // Process the order again
      await tradeService.processPendingOrders();
      
      // Refresh the order from DB
      const updatedOrder = await Trade.findById(order._id);
      
      // Order should be completed
      expect(updatedOrder.status).toBe('COMPLETED');
      expect(updatedOrder.executedAt).toBeDefined();
      expect(updatedOrder.filledQuantity).toBe(2);
      expect(updatedOrder.remainingQuantity).toBe(0);
      
      // Verify user wallet balance was updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.heldBalance).toBeLessThan(1000.00); // Some held balance was used
    });
  });

  describe('Sell Trailing Stop Orders', () => {
    beforeEach(async () => {
      // Create sell trailing stop order
      order = await Trade.create({
        user: testUser._id,
        stock: testStock._id,
        type: 'SELL',
        quantity: 3,
        orderType: 'TRAILING_STOP',
        trailingPercent: 5,
        status: 'PENDING',
        totalAmount: 0, // No amount is held for sell orders
        remainingQuantity: 3,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
      });
    });

    it('should initialize trailing stop price when processing for the first time', async () => {
      // Process the order one time
      await tradeService.processPendingOrders();
      
      // Refresh the order from DB
      const updatedOrder = await Trade.findById(order._id);
      
      // Verify trailing stop price was initialized
      expect(updatedOrder.trailingStopPrice).toBeDefined();
      expect(updatedOrder.lowestPrice).toBe(2500.00); // Current price of the stock
      
      // Expected trailing stop price is 5% above current price
      const expectedStopPrice = 2500 * (1 + 5/100);
      expect(updatedOrder.trailingStopPrice).toBe(expectedStopPrice);
      
      // Order should still be pending
      expect(updatedOrder.status).toBe('PENDING');
    });

    it('should adjust trailing stop price when stock price decreases', async () => {
      // First process to initialize
      await tradeService.processPendingOrders();
      
      // Update stock price to a lower value (10% decrease)
      await Stock.findByIdAndUpdate(testStock._id, {
        currentPrice: 2250.00
      });
      
      // Process the order again
      await tradeService.processPendingOrders();
      
      // Refresh the order from DB
      const updatedOrder = await Trade.findById(order._id);
      
      // Verify trailing stop price was adjusted
      expect(updatedOrder.lowestPrice).toBe(2250.00);
      
      // Expected trailing stop price is 5% above new low
      const expectedStopPrice = 2250 * (1 + 5/100);
      expect(updatedOrder.trailingStopPrice).toBe(expectedStopPrice);
      
      // Order should still be pending
      expect(updatedOrder.status).toBe('PENDING');
    });

    it('should execute order when price rises above trailing stop', async () => {
      // First process to initialize
      await tradeService.processPendingOrders();
      
      // Update stock price slightly down
      await Stock.findByIdAndUpdate(testStock._id, {
        currentPrice: 2400.00
      });
      
      // Process to adjust trailing stop
      await tradeService.processPendingOrders();
      
      // Capture trailing stop price
      const midOrder = await Trade.findById(order._id);
      const stopPrice = midOrder.trailingStopPrice;
      
      // Update stock price to rise above trailing stop
      await Stock.findByIdAndUpdate(testStock._id, {
        currentPrice: stopPrice + 10
      });
      
      // Process the order again
      await tradeService.processPendingOrders();
      
      // Refresh the order from DB
      const updatedOrder = await Trade.findById(order._id);
      
      // Order should be completed
      expect(updatedOrder.status).toBe('COMPLETED');
      expect(updatedOrder.executedAt).toBeDefined();
      expect(updatedOrder.filledQuantity).toBe(3);
      expect(updatedOrder.remainingQuantity).toBe(0);
      
      // Verify portfolio was updated
      const portfolio = await Portfolio.findOne({ user: testUser._id });
      // Should have 7 shares left after selling 3
      const holding = portfolio.holdings.find(h => h.stock.toString() === testStock._id.toString());
      expect(holding.quantity).toBe(7);
    });
  });

  describe('Edge Cases', () => {
    it('should handle order expiration', async () => {
      // Create an expired trailing stop order
      const expiredOrder = await Trade.create({
        user: testUser._id,
        stock: testStock._id,
        type: 'BUY',
        quantity: 1,
        orderType: 'TRAILING_STOP',
        trailingPercent: 5,
        status: 'PENDING',
        totalAmount: 2500.00,
        remainingQuantity: 1,
        expiresAt: new Date(Date.now() - 1000) // Already expired
      });
      
      // Process orders
      await tradeService.processPendingOrders();
      
      // Refresh the order
      const updatedOrder = await Trade.findById(expiredOrder._id);
      
      // Order should be expired
      expect(updatedOrder.status).toBe('EXPIRED');
      
      // Held balance should be released
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.heldBalance).toBe(1000.00 - 2500.00);
    });

    it('should handle insufficient funds for buy orders', async () => {
      // Reduce user's held balance
      await User.findByIdAndUpdate(testUser._id, {
        heldBalance: 100.00
      });
      
      // Create a buy trailing stop order
      const insufficientOrder = await Trade.create({
        user: testUser._id,
        stock: testStock._id,
        type: 'BUY',
        quantity: 5,
        orderType: 'TRAILING_STOP',
        trailingPercent: 3,
        status: 'PENDING',
        totalAmount: 12500.00, // More than held balance
        remainingQuantity: 5,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      
      // Initialize the trailing stop
      await tradeService.processPendingOrders();
      
      // Update stock price to fall below the expected stop price
      await Stock.findByIdAndUpdate(testStock._id, {
        currentPrice: 2000.00
      });
      
      // Process the order again
      await tradeService.processPendingOrders();
      
      // Refresh the order
      const updatedOrder = await Trade.findById(insufficientOrder._id);
      
      // Order should be rejected
      expect(updatedOrder.status).toBe('REJECTED');
    });
  });
}); 