import asyncHandler from 'express-async-handler';
import Trade from '../models/tradeModel.js';
import User from '../models/userModel.js';
import Stock from '../models/stockModel.js';
import Portfolio from '../models/portfolioModel.js';
import tradeService from '../services/tradeService.js';
import cacheService from '../services/cacheService.js';
import { logInfo } from '../utils/logger.js';

// @desc    Place a new trade
// @route   POST /api/trades
// @access  Private
export const placeTrade = asyncHandler(async (req, res) => {
    const {
        symbol,
        type,
        quantity,
        orderType,
        limitPrice,
        stopPrice,
        trailingPercent,
        timeInForce = 'DAY',
        isPartialFillAllowed = false
    } = req.body;

    // Normalize type and orderType to uppercase
    const normalizedType = type.toUpperCase();
    const normalizedOrderType = orderType.toUpperCase();

    // First try to find the stock in the database
    let stock = await Stock.findOne({ symbol });

    // If stock not found in database, try to fetch it from Yahoo Finance
    if (!stock) {
        try {
            // Import the stockMarketService dynamically
            const stockMarketService = (await import('../services/stockMarketService.js')).default;

            // Fetch the stock data from Yahoo Finance
            const stockData = await stockMarketService.getQuote(symbol);

            if (!stockData) {
                res.status(404);
                throw new Error('Stock not found');
            }

            // Create a new stock entry in the database
            stock = await Stock.create({
                symbol: stockData.baseSymbol || symbol,
                companyName: stockData.name || symbol,
                exchange: stockData.exchange || 'NSE',
                currentPrice: stockData.price || 100,
                dayHigh: stockData.dayHigh || stockData.price || 100,
                dayLow: stockData.dayLow || stockData.price || 100,
                volume: stockData.volume || 0,
                marketCap: stockData.marketCap || 0,
                lastUpdated: new Date()
            });
        } catch (error) {
            console.error(`Error fetching stock data for ${symbol}:`, error);
            res.status(404);
            throw new Error(`Stock not found: ${error.message}`);
        }
    }

    const user = await User.findById(req.user.id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Calculate total amount
    const totalAmount = quantity * (normalizedOrderType === 'LIMIT' ? limitPrice : stock.currentPrice);

    // Validate order parameters
    if (!['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT', 'TRAILING_STOP'].includes(normalizedOrderType)) {
        res.status(400);
        throw new Error('Invalid order type');
    }

    if (!['BUY', 'SELL'].includes(normalizedType)) {
        res.status(400);
        throw new Error('Invalid trade type');
    }

    if (quantity <= 0 || !Number.isInteger(quantity)) {
        res.status(400);
        throw new Error('Quantity must be a positive integer');
    }

    if (normalizedOrderType === 'LIMIT' && (!limitPrice || limitPrice <= 0)) {
        res.status(400);
        throw new Error('Limit price is required for limit orders and must be positive');
    }

    if ((normalizedOrderType === 'STOP' || normalizedOrderType === 'STOP_LIMIT') && (!stopPrice || stopPrice <= 0)) {
        res.status(400);
        throw new Error('Stop price is required for stop orders and must be positive');
    }

    if (normalizedOrderType === 'STOP_LIMIT' && (!limitPrice || limitPrice <= 0)) {
        res.status(400);
        throw new Error('Limit price is required for stop-limit orders and must be positive');
    }

    if (normalizedOrderType === 'TRAILING_STOP' && (!trailingPercent || trailingPercent <= 0)) {
        res.status(400);
        throw new Error('Trailing percent is required for trailing stop orders and must be positive');
    }

    // Additional validation for trailing stop orders
    if (normalizedOrderType === 'TRAILING_STOP' && (trailingPercent < 0.1 || trailingPercent > 20)) {
        res.status(400);
        throw new Error('Trailing percent must be between 0.1 and 20');
    }

    if (!['DAY', 'GTC', 'IOC', 'FOK'].includes(timeInForce)) {
        res.status(400);
        throw new Error('Invalid time in force value');
    }

    // All trading is done with virtual currency

    // Check if user has enough balance for buying
    if (normalizedType === 'BUY') {
        // Using virtual currency
        // Log the values for debugging
        console.log(`Virtual trade attempt - Required: ${totalAmount} VC, Available: ${user.virtualBalance} VC, User: ${req.user.id}`);

        if (totalAmount > user.virtualBalance) {
            res.status(400);
            throw new Error(`Insufficient virtual balance. Required: ${totalAmount.toLocaleString()} VC, Available: ${user.virtualBalance.toLocaleString()} VC`);
        }

        // Double-check to ensure sufficient funds
        if (user.virtualBalance < 100) { // Minimum 100 VC
            res.status(400);
            throw new Error('Insufficient virtual currency for trading. Please add funds to your wallet.');
        }
    }

    // For selling, check if user has enough stocks
    if (normalizedType === 'SELL') {
        const portfolio = await Portfolio.findOne({ user: req.user.id });
        const holding = portfolio.holdings.find(h => h.stock.toString() === stock._id.toString());

        if (!holding || holding.quantity < quantity) {
            res.status(400);
            throw new Error('Insufficient stocks');
        }
    }

    // Set expiry date based on timeInForce
    let expiresAt = null;
    if (timeInForce === 'DAY') {
        // Set expiry to end of trading day (3:30 PM IST)
        expiresAt = new Date();
        expiresAt.setUTCHours(10, 0, 0, 0); // 3:30 PM IST = 10:00 AM UTC
    } else if (timeInForce === 'GTC') {
        // Good Till Cancelled - set to 30 days from now
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
    }

    // Create trade with enhanced order details
    const trade = await Trade.create({
        user: req.user.id,
        stock: stock._id,
        type: normalizedType,
        quantity,
        orderType: normalizedOrderType,
        limitPrice,
        stopPrice,
        trailingPercent,
        timeInForce,
        isPartialFillAllowed,
        price: stock.currentPrice,
        totalAmount,
        status: normalizedOrderType === 'MARKET' ? 'COMPLETED' : 'PENDING',
        executedAt: normalizedOrderType === 'MARKET' ? Date.now() : null,
        filledQuantity: normalizedOrderType === 'MARKET' ? quantity : 0,
        remainingQuantity: normalizedOrderType === 'MARKET' ? 0 : quantity,
        expiresAt,
        lastUpdated: Date.now()
    });

    // All trades are virtual
    trade.isVirtual = true;
    await trade.save();

    // Process the order based on order type
    if (normalizedOrderType === 'MARKET') {
        // Update user's balance for market orders (immediate execution)
        if (normalizedType === 'BUY') {
            // Deduct from virtual balance
            user.virtualBalance -= totalAmount;
        } else { // SELL
            // Add to virtual balance
            user.virtualBalance += totalAmount;
        }

        // Update portfolio for market orders
        await tradeService.updatePortfolio(trade);
    } else if (normalizedType === 'BUY') {
        // For pending buy orders, hold the funds
        // TODO: Implement virtual held balance in the future
    }

    await user.save();

    // Invalidate portfolio cache to ensure fresh data on next fetch
    const portfolioCacheKey = `portfolio:${req.user.id}`;
    await cacheService.del(portfolioCacheKey);
    logInfo(`Invalidated portfolio cache for user ${req.user.id} after trade execution`);

    res.status(201).json(trade);
});

// @desc    Get user's trades
// @route   GET /api/trades
// @access  Private
export const getUserTrades = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;
    const query = { user: req.user.id };

    if (status) query.status = status;

    const trades = await Trade.find(query)
        .populate('stock', 'symbol companyName')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });

    const count = await Trade.countDocuments(query);

    res.json({
        trades,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
    });
});

// @desc    Cancel a pending trade
// @route   PUT /api/trades/:id/cancel
// @access  Private
export const cancelTrade = asyncHandler(async (req, res) => {
    const trade = await Trade.findById(req.params.id);

    if (!trade) {
        res.status(404);
        throw new Error('Trade not found');
    }

    // Check if trade belongs to user
    if (trade.user.toString() !== req.user.id) {
        res.status(401);
        throw new Error('Not authorized');
    }

    // Check if trade can be cancelled
    if (trade.status !== 'PENDING' && trade.status !== 'PARTIALLY_FILLED') {
        res.status(400);
        throw new Error('Only pending or partially filled trades can be cancelled');
    }

    // Release held funds if it's a buy order
    if (trade.type === 'BUY') {
        const user = await User.findById(req.user.id);
        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        // Calculate remaining held amount based on remaining quantity
        const remainingHeldAmount = (trade.remainingQuantity / trade.quantity) * trade.totalAmount;

        // Release the held amount
        user.heldBalance -= remainingHeldAmount;
        // Ensure heldBalance doesn't go negative
        if (user.heldBalance < 0) user.heldBalance = 0;
        await user.save();
    }

    trade.status = 'CANCELLED';
    await trade.save();

    res.json(trade);
});

// @desc    Get trade details
// @route   GET /api/trades/:id
// @access  Private
export const getTradeDetails = asyncHandler(async (req, res) => {
    const trade = await Trade.findById(req.params.id)
        .populate('stock', 'symbol companyName currentPrice');

    if (!trade) {
        res.status(404);
        throw new Error('Trade not found');
    }

    // Check if trade belongs to user
    if (trade.user.toString() !== req.user.id) {
        res.status(401);
        throw new Error('Not authorized');
    }

    res.json(trade);
});

// @desc    Process pending orders (for admin or scheduled job)
// @route   POST /api/trades/process-pending
// @access  Private/Admin
export const processPendingOrders = asyncHandler(async (req, res) => {
    const result = await tradeService.processPendingOrders();
    res.json(result);
});

// @desc    Process partial fill for an order
// @route   POST /api/trades/:id/partial-fill
// @access  Private/Admin
export const processPartialFill = asyncHandler(async (req, res) => {
    const { fillQuantity, fillPrice } = req.body;

    if (!fillQuantity || !fillPrice) {
        res.status(400);
        throw new Error('Fill quantity and price are required');
    }

    const trade = await Trade.findById(req.params.id);

    if (!trade) {
        res.status(404);
        throw new Error('Trade not found');
    }

    // Only admin can manually fill orders
    if (req.user.role !== 'admin') {
        res.status(401);
        throw new Error('Not authorized');
    }

    const result = await tradeService.processPartialFill(trade, fillQuantity, fillPrice);
    res.json(result);
});