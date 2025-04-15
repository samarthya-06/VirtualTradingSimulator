import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import Transaction from '../models/transactionModel.js';
import paymentService from '../services/paymentService.js';

// @desc    Get wallet balance
// @route   GET /api/wallet/balance
// @access  Private
export const getWalletBalance = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json({
    balance: user.walletBalance || 0,
    heldBalance: user.heldBalance || 0,
    availableBalance: (user.walletBalance || 0) - (user.heldBalance || 0),
    virtualBalance: user.virtualBalance || 0
  });
});

// @desc    Get wallet transactions
// @route   GET /api/wallet/transactions
// @access  Private
export const getWalletTransactions = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('transactions');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json(user.transactions || []);
});

// @desc    Add funds to wallet
// @route   POST /api/wallet/add
// @access  Private
export const addFunds = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error('Please enter a valid amount');
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Update real wallet balance
  user.walletBalance = (user.walletBalance || 0) + amount;

  // Update virtual balance (1 INR = 50 virtual coins)
  const virtualAmount = amount * 50;
  user.virtualBalance = (user.virtualBalance || 0) + virtualAmount;

  // Create a new transaction
  const transaction = new Transaction({
    user: user._id,
    type: 'credit',
    amount: amount,
    description: 'Funds added to wallet',
    balance: user.walletBalance,
    metadata: {
      virtualAmount: virtualAmount,
      virtualBalance: user.virtualBalance
    }
  });

  // Save transaction and update user
  await transaction.save();
  user.transactions.push(transaction._id);
  await user.save();

  res.json({
    balance: user.walletBalance,
    virtualBalance: user.virtualBalance,
    transaction
  });
});

// @desc    Withdraw funds from wallet
// @route   POST /api/wallet/withdraw
// @access  Private
export const withdrawFunds = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error('Please enter a valid amount');
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.walletBalance < amount) {
    res.status(400);
    throw new Error('Insufficient funds');
  }

  user.walletBalance -= amount;

  // Create a new transaction
  const transaction = new Transaction({
    user: user._id,
    type: 'debit',
    amount: amount,
    description: 'Funds withdrawn from wallet',
    balance: user.walletBalance
  });

  // Save transaction and update user
  await transaction.save();
  user.transactions.push(transaction._id);
  await user.save();

  res.json({ balance: user.walletBalance, transaction });
});

// @desc    Create a recharge order for wallet
// @route   POST /api/wallet/recharge
// @access  Private
export const createRechargeOrder = asyncHandler(async (req, res) => {
  const { amount } = req.body;

  if (!amount || amount < 10) {
    res.status(400);
    throw new Error('Please enter a valid amount (minimum ₹10)');
  }

  try {
    // Check if Razorpay is initialized
    if (!paymentService.isInitialized()) {
      throw new Error('Payment service is not available at the moment');
    }

    // Create a Razorpay order
    const order = await paymentService.createOrder(amount);

    // Create a pending transaction
    const transaction = await Transaction.create({
      user: req.user.id,
      amount: amount,
      type: 'credit',
      status: 'pending',
      description: 'Wallet recharge initiated',
      balance: (await User.findById(req.user.id)).walletBalance || 0,
      razorpayOrderId: order.id,
      metadata: {
        orderAmount: amount,
        orderCurrency: order.currency,
        paymentMode: 'razorpay'
      }
    });

    // Add transaction to user's transactions array
    const user = await User.findById(req.user.id);
    if (!user.transactions) {
      user.transactions = [];
    }
    user.transactions.push(transaction._id);
    await user.save();

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error creating recharge order:', error);
    res.status(500);
    throw new Error('Failed to create recharge order: ' + error.message);
  }
});

// @desc    Verify payment and update wallet
// @route   POST /api/wallet/verify
// @access  Private
export const verifyPayment = asyncHandler(async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    console.log('Payment verification request received at wallet/verify:', {
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

    // Find the transaction (not necessarily pending)
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

    // Update virtual balance (1 INR = 50 virtual coins)
    const virtualAmount = transaction.amount * 50;
    user.virtualBalance = (user.virtualBalance || 0) + virtualAmount;

    // Update transaction metadata with virtual currency info
    transaction.metadata = {
      ...transaction.metadata,
      virtualAmount: virtualAmount,
      virtualBalance: user.virtualBalance
    };

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
      virtualBalance: user.virtualBalance,
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