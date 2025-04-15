import express from 'express';
import { getStocksByFilter, getSectors } from '../controllers/stockScreenerController.js';
import { protect } from '../middleware/authMiddleware.js';
import { publicLimiter as apiLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// Apply rate limiting to public routes
// const apiLimiter = rateLimiter(15, 60); // 15 requests per minute

// @route   GET /api/stock-screener
// @desc    Filter stocks based on criteria
// @access  Private
router.get('/', protect, apiLimiter, getStocksByFilter);

// @route   GET /api/stock-screener/sectors
// @desc    Get all available sectors
// @access  Private
router.get('/sectors', protect, apiLimiter, getSectors);

export default router; 