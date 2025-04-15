import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getCurrentMembership,
  createMembershipOrder,
  verifyMembershipPayment,
  cancelMembership
} from '../controllers/membershipController.js';
import { validate } from '../middleware/validationMiddleware.js';
import { body } from 'express-validator';

const router = express.Router();

// Validation rules
const membershipValidationRules = {
  createOrder: [
    body('plan').isIn(['pro']).withMessage('Invalid plan selected'),
    body('billingCycle').isIn(['monthly', 'annual']).withMessage('Invalid billing cycle')
  ],
  verifyPayment: [
    body('razorpayOrderId').notEmpty().withMessage('Order ID is required'),
    body('razorpayPaymentId').notEmpty().withMessage('Payment ID is required'),
    body('razorpaySignature').notEmpty().withMessage('Signature is required'),
    body('plan').isIn(['pro']).withMessage('Invalid plan selected'),
    body('billingCycle').isIn(['monthly', 'annual']).withMessage('Invalid billing cycle')
  ]
};

// Routes
router.get('/', protect, getCurrentMembership);
router.post('/create-order', protect, membershipValidationRules.createOrder, validate, createMembershipOrder);
router.post('/verify', protect, membershipValidationRules.verifyPayment, validate, verifyMembershipPayment);
router.post('/cancel', protect, cancelMembership);

export default router;