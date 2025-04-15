import express from 'express';
import {
    getWatchlists,
    createWatchlist,
    addStockToWatchlist,
    removeStockFromWatchlist,
    addStockAlert,
    removeStockAlert,
} from '../controllers/watchlistController.js';
import { protect } from '../middleware/authMiddleware.js';
import { watchlistValidationRules, validate } from '../middleware/validationMiddleware.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.route('/')
    .get(getWatchlists)
    .post(createWatchlist);

router.route('/:id/stocks')
    .post(watchlistValidationRules.addStock, validate, addStockToWatchlist);

router.route('/:id/stocks/:stockId')
    .delete(removeStockFromWatchlist);

router.route('/:id/stocks/:stockId/alerts')
    .post(addStockAlert);

router.route('/:id/stocks/:stockId/alerts/:alertId')
    .delete(removeStockAlert);

export default router;