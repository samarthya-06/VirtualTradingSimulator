import express from 'express';
import {
    getStocks,
    getStockBySymbol,
    searchStocks,
    getStockHistory,
    updateStockData,
} from '../controllers/stockController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { stockValidationRules, validate } from '../middleware/validationMiddleware.js';
import { cacheMiddleware } from '../middleware/cacheMiddleware.js';

const router = express.Router();

// Public routes with caching
router.get('/', cacheMiddleware(300), getStocks); // Cache for 5 minutes
router.get('/search', stockValidationRules.searchStocks, validate, cacheMiddleware(60), searchStocks); // Cache for 1 minute
router.get('/:symbol', stockValidationRules.getStockDetails, validate, cacheMiddleware(60), getStockBySymbol); // Cache for 1 minute
router.get('/:symbol/history', stockValidationRules.getStockDetails, validate, cacheMiddleware(300), getStockHistory); // Cache for 5 minutes

// Protected routes
router.put('/:symbol', protect, admin, stockValidationRules.getStockDetails, validate, updateStockData);

export default router;