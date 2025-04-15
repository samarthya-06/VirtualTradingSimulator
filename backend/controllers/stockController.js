import asyncHandler from 'express-async-handler';
import yahooFinance from 'yahoo-finance2';
import Stock from '../models/stockModel.js';
import cacheService from '../services/cacheService.js';
import { clearCache } from '../middleware/cacheMiddleware.js';

// @desc    Get all stocks
// @route   GET /api/stocks
// @access  Public
const getStocks = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, exchange, sector } = req.query;
    const query = {};

    if (exchange) query.exchange = exchange;
    if (sector) query.sector = sector;

    const stocks = await Stock.find(query)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ symbol: 1 });

    const count = await Stock.countDocuments(query);

    res.json({
        stocks,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
    });
});

// @desc    Get stock by symbol
// @route   GET /api/stocks/:symbol
// @access  Public
const getStockBySymbol = asyncHandler(async (req, res) => {
    const { symbol } = req.params;

    // Get stock from database
    let stock = await Stock.findOne({ symbol });

    if (!stock) {
        res.status(404);
        throw new Error('Stock not found');
    }

    // Update real-time data from Yahoo Finance
    try {
        const quote = await yahooFinance.quote(symbol + '.NS', {
            fields: ['regularMarketPrice', 'regularMarketDayHigh', 'regularMarketDayLow', 'regularMarketVolume', 'marketCap']
        });
        
        stock.currentPrice = quote.regularMarketPrice;
        stock.dayHigh = quote.regularMarketDayHigh;
        stock.dayLow = quote.regularMarketDayLow;
        stock.volume = quote.regularMarketVolume;
        stock.marketCap = quote.marketCap;
        stock.lastUpdated = new Date();

        await stock.save();

        // Clear cache for this stock
        await clearCache(`__express__/api/stocks/${symbol}`);

        res.json({
            stock
        });
    } catch (error) {
        console.error(`Error fetching real-time data for ${symbol}:`, error);
        res.json({
            stock
        }); // Return existing data if real-time update fails
    }
});

// @desc    Search stocks
// @route   GET /api/stocks/search
// @access  Public
const searchStocks = asyncHandler(async (req, res) => {
    const { query } = req.query;
    
    if (!query || query.trim().length < 1) {
        res.status(400);
        throw new Error('Search query is required');
    }

    try {
        const stockMarketService = (await import('../services/stockMarketService.js')).default;
        const stocks = await stockMarketService.searchStocks(query);
        res.json({
            stocks
        });
    } catch (error) {
        console.error('Error in stock search:', error);
        res.status(500).json({ message: error.message || 'Failed to search stocks' });
    }
});

// @desc    Get stock history
// @route   GET /api/stocks/:symbol/history
// @access  Public
const getStockHistory = asyncHandler(async (req, res) => {
    const { symbol } = req.params;
    const { period = '1d', interval = '5m' } = req.query;

    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (period === '1d' ? 1 : 7));

        const queryOptions = {
            period1: startDate,
            period2: endDate,
            interval: interval,
            events: 'history',
            includeAdjustedClose: true
        };
        
        // Use chart method instead of historical (which is deprecated)
        const result = await yahooFinance.chart(symbol + '.NS', queryOptions);
        
        res.json({
            history: result.quotes || []
        });
    } catch (error) {
        console.error(`Error fetching history for ${symbol}:`, error);
        res.status(500);
        throw new Error('Error fetching stock history');
    }
});

// @desc    Update stock data from Yahoo Finance
// @route   PUT /api/stocks/:symbol
// @access  Private/Admin
const updateStockData = asyncHandler(async (req, res) => {
    const { symbol } = req.params;

    try {
        const quote = await yahooFinance.quote(symbol + '.NS', {
            fields: ['regularMarketPrice', 'regularMarketDayHigh', 'regularMarketDayLow', 'regularMarketVolume', 'marketCap']
        });
        
        const updatedStock = await Stock.findOneAndUpdate(
            { symbol },
            {
                currentPrice: quote.regularMarketPrice,
                dayHigh: quote.regularMarketDayHigh,
                dayLow: quote.regularMarketDayLow,
                volume: quote.regularMarketVolume,
                marketCap: quote.marketCap,
                lastUpdated: new Date(),
            },
            { new: true }
        );

        if (!updatedStock) {
            res.status(404);
            throw new Error('Stock not found');
        }

        // Clear all caches related to this stock
        await clearCache(`__express__/api/stocks/${symbol}*`);
        await clearCache(`__express__/api/stocks`);

        res.json({
            stock: updatedStock
        });
    } catch (error) {
        res.status(500);
        throw new Error('Error updating stock data');
    }
});

export {
    getStocks,
    getStockBySymbol,
    searchStocks,
    getStockHistory,
    updateStockData,
};