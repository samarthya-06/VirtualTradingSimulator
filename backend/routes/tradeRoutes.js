import express from 'express';
import {
    placeTrade,
    getUserTrades,
    cancelTrade,
    getTradeDetails,
    processPendingOrders,
    processPartialFill
} from '../controllers/tradeController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { tradeValidationRules, validate } from '../middleware/validationMiddleware.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.route('/')
    .post(tradeValidationRules.placeTrade, validate, placeTrade)
    .get(tradeValidationRules.getTradeHistory, validate, getUserTrades);

router.route('/:id')
    .get(getTradeDetails);

router.put('/:id/cancel', cancelTrade);

// Admin routes
router.post('/process-pending', protect, admin, processPendingOrders);
router.post('/:id/partial-fill', protect, admin, processPartialFill);

export default router;