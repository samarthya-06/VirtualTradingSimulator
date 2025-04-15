import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getWalletBalance,
  getWalletTransactions,
  addFunds,
  withdrawFunds,
  createRechargeOrder,
  verifyPayment
} from '../controllers/walletController.js';
import { walletValidationRules, validate } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Protect all routes
router.use(protect);

// Get wallet balance
router.get('/balance', getWalletBalance);

// Get wallet transactions
router.get('/transactions', getWalletTransactions);

// Add funds to wallet (direct method, no payment gateway)
router.post('/add', walletValidationRules.addFunds, validate, addFunds);

// Withdraw funds from wallet
router.post('/withdraw', walletValidationRules.withdrawFunds, validate, withdrawFunds);

// Create a recharge order (using Razorpay)
router.post('/recharge', walletValidationRules.addFunds, validate, createRechargeOrder);

// Verify payment and update wallet
router.post('/verify', verifyPayment);

export default router;