import express from 'express';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';
import Stock from '../models/stockModel.js';
import asyncHandler from 'express-async-handler';
import {
    searchStocks,
    getQuote,
    getMarketIndices,
    getNSEStocks,
    getBSEStocks,
    getStockHistory,
    getCompanyInfo,
    getStockNews,
    getRelatedStocks,
    getMarketNews
} from '../controllers/marketController.js';
import yahooFinance from 'yahoo-finance2';

const router = express.Router();

// Remove the blanket protection for all routes
// router.use(protect);

// Public market data routes
router.get('/indices', asyncHandler(getMarketIndices));
router.get('/nse', asyncHandler(getNSEStocks));
router.get('/bse', asyncHandler(getBSEStocks));

// Routes with optional authentication
router.get('/quote/:symbol', optionalAuth, asyncHandler(getQuote));
router.get('/history/:symbol', optionalAuth, asyncHandler(getStockHistory));
router.get('/info/:symbol', optionalAuth, asyncHandler(getCompanyInfo));

// Protected routes that require authentication
router.get('/search', protect, asyncHandler(searchStocks));

// @desc    Get news for a stock
// @route   GET /api/market/news/:symbol
// @access  Private/Public (with optional auth)
router.get('/news/:symbol', optionalAuth, asyncHandler(getStockNews));

// @desc    Get Indian market news
// @route   GET /api/market/market-news
// @access  Private/Public (with optional auth)
router.get('/market-news', optionalAuth, asyncHandler(getMarketNews));

// @desc    Get related stocks for a symbol
// @route   GET /api/market/related/:symbol
// @access  Private/Public (with optional auth)
router.get('/related/:symbol', optionalAuth, asyncHandler(getRelatedStocks));

export default router;