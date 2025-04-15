import express from 'express';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';
import { 
  getRSI,
  getMACD,
  getBollingerBands,
  getMovingAverage,
  getMultipleIndicators,
  getPriceChart
} from '../controllers/technicalIndicatorsController.js';

const router = express.Router();

// @route   GET /api/indicators/rsi/:symbol
// @desc    Get RSI for a stock
// @access  Public/Private
router.get('/rsi/:symbol', optionalAuth, getRSI);

// @route   GET /api/indicators/macd/:symbol
// @desc    Get MACD for a stock
// @access  Public/Private
router.get('/macd/:symbol', optionalAuth, getMACD);

// @route   GET /api/indicators/bollinger/:symbol
// @desc    Get Bollinger Bands for a stock
// @access  Public/Private
router.get('/bollinger/:symbol', optionalAuth, getBollingerBands);

// @route   GET /api/indicators/ma/:symbol
// @desc    Get Moving Averages (SMA/EMA) for a stock
// @access  Public/Private
router.get('/ma/:symbol', optionalAuth, getMovingAverage);

// @route   GET /api/indicators/multiple/:symbol
// @desc    Get multiple indicators for a stock
// @access  Public/Private
router.get('/multiple/:symbol', optionalAuth, getMultipleIndicators);

// @route   GET /api/indicators/chart/:symbol
// @desc    Get price chart data for a stock
// @access  Public/Private
router.get('/chart/:symbol', optionalAuth, getPriceChart);

export default router; 