import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createOrder, verifyPayment } from '../controllers/paymentController.js';
import { paymentValidationRules, validate } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.post('/create-order', protect, paymentValidationRules.createOrder, validate, createOrder);
router.post('/verify', protect, paymentValidationRules.verifyPayment, validate, verifyPayment);

export default router;