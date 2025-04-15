import asyncHandler from 'express-async-handler';
import paymentService from '../services/paymentService.js';
import Transaction from '../models/transactionModel.js';
import User from '../models/userModel.js';

// @desc    Create a new payment order
// @route   POST /api/payment/create-order
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error('Please enter a valid amount');
  }

  try {
    const order = await paymentService.createOrder(amount);
    console.log('Created Razorpay order:', order);

    // Create a pending transaction with proper order details
    const transaction = await Transaction.create({
      user: req.user.id,
      amount: amount, // Keep original amount as it will be converted to paise later
      type: 'credit',
      status: 'pending',
      description: 'Payment initiated',
      balance: (await User.findById(req.user.id)).walletBalance || 0,
      razorpayOrderId: order.id,
      metadata: {
        orderAmount: amount,
        orderCurrency: order.currency,
        paymentMode: 'razorpay'
      }
    });

    console.log('Created transaction record:', transaction);

    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500);
    throw new Error('Failed to create payment order: ' + error.message);
  }
});

// @desc    Verify payment and update wallet
// @route   POST /api/payment/verify
// @access  Private
const verifyPayment = asyncHandler(async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    console.log('Payment verification request received:', {
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature ? `${razorpaySignature.substring(0, 10)}...` : 'Missing',
      userId: req.user.id
    });

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      console.error('Missing verification parameters:', { 
        hasOrderId: !!razorpayOrderId, 
        hasPaymentId: !!razorpayPaymentId, 
        hasSignature: !!razorpaySignature 
      });
      
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification parameters',
        error: {
          code: 'MISSING_PARAMS',
          details: {
            hasOrderId: !!razorpayOrderId,
            hasPaymentId: !!razorpayPaymentId,
            hasSignature: !!razorpaySignature
          }
        }
      });
    }

    // Find the pending transaction with the Razorpay order ID
    const transaction = await Transaction.findOne({
      razorpayOrderId: razorpayOrderId
    });

    if (!transaction) {
      console.error('Transaction not found for order:', razorpayOrderId);
      
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
        error: {
          code: 'TRANSACTION_NOT_FOUND',
          details: { orderId: razorpayOrderId }
        }
      });
    }

    console.log('Found transaction for verification:', {
      id: transaction._id,
      amount: transaction.amount,
      status: transaction.status,
      userId: transaction.user.toString()
    });

    // Verify that the transaction belongs to the current user
    if (transaction.user.toString() !== req.user.id) {
      console.error('Transaction user mismatch:', {
        transactionUser: transaction.user.toString(),
        requestUser: req.user.id
      });
      
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to transaction',
        error: {
          code: 'UNAUTHORIZED_ACCESS'
        }
      });
    }

    // If transaction is already completed, return success
    if (transaction.status === 'completed') {
      console.log('Transaction already completed:', transaction._id);
      
      return res.status(200).json({
        success: true,
        message: 'Payment already verified',
        balance: (await User.findById(req.user.id)).walletBalance,
        transaction: {
          id: transaction._id,
          amount: transaction.amount,
          type: transaction.type,
          status: transaction.status,
          timestamp: transaction.createdAt
        }
      });
    }

    // Verify payment signature
    let isValid = false;
    try {
      isValid = paymentService.verifyPayment(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      );
      
      console.log('Signature verification result:', isValid);
    } catch (error) {
      console.error('Signature verification error:', error);
      
      // Update transaction with error details
      transaction.status = 'failed';
      transaction.razorpayPaymentId = razorpayPaymentId;
      transaction.metadata = {
        ...transaction.metadata,
        error: error.message,
        verificationAttempt: new Date()
      };
      await transaction.save();
      
      return res.status(400).json({
        success: false,
        message: `Payment verification failed: ${error.message}`,
        error: {
          code: 'SIGNATURE_VERIFICATION_ERROR',
          details: error.message
        }
      });
    }

    if (!isValid) {
      // Update transaction status to failed if signature is invalid
      transaction.status = 'failed';
      transaction.razorpayPaymentId = razorpayPaymentId;
      transaction.metadata = {
        ...transaction.metadata,
        razorpaySignature,
        failureReason: 'Invalid payment signature',
        verificationAttempt: new Date()
      };
      await transaction.save();
      
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
        error: {
          code: 'INVALID_SIGNATURE'
        }
      });
    }

    // Update transaction status
    transaction.status = 'completed';
    transaction.razorpayPaymentId = razorpayPaymentId;
    transaction.metadata = {
      ...transaction.metadata,
      razorpaySignature,
      verificationTime: new Date()
    };
    await transaction.save();

    // Update user's wallet balance
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: {
          code: 'USER_NOT_FOUND'
        }
      });
    }

    const currentBalance = user.walletBalance || 0;
    user.walletBalance = currentBalance + transaction.amount;
    
    // Add transaction to user's transactions array if not already present
    if (!user.transactions) {
      user.transactions = [];
    }
    
    if (!user.transactions.includes(transaction._id)) {
      user.transactions.push(transaction._id);
    }
    
    await user.save();

    console.log('Payment verification successful:', {
      userId: user._id,
      transactionId: transaction._id,
      newBalance: user.walletBalance
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      balance: user.walletBalance,
      transaction: {
        id: transaction._id,
        amount: transaction.amount,
        type: transaction.type,
        status: transaction.status,
        timestamp: transaction.createdAt
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during payment verification',
      error: {
        code: 'SERVER_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
});

export {
  createOrder,
  verifyPayment
};