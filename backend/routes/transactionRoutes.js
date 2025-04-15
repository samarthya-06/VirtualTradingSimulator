import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getTransactions, getTransactionById } from '../controllers/transactionController.js';

const router = express.Router();

router.route('/').get(protect, getTransactions);
router.route('/:id').get(protect, getTransactionById);

export default router;