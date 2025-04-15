import express from 'express';
import {
    getPortfolio,
    getPortfolioHistory,
    getPortfolioPerformance,
    getHistoricalPerformance,
    getSectorBreakdown,
    getRiskAssessment,
    createPortfolio
} from '../controllers/portfolioController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/', getPortfolio);
router.post('/', createPortfolio);
router.get('/history', getPortfolioHistory);
router.get('/performance', getPortfolioPerformance);
router.get('/historical', getHistoricalPerformance);
router.get('/sectors', getSectorBreakdown);
router.get('/risk', getRiskAssessment);

export default router;