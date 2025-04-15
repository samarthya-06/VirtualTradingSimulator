import asyncHandler from 'express-async-handler';
import Membership from '../models/membershipModel.js';
import User from '../models/userModel.js';
import paymentService from '../services/paymentService.js';
import Transaction from '../models/transactionModel.js';

// Helper function to calculate membership end date
const calculateEndDate = (billingCycle) => {
  const now = new Date();
  if (billingCycle === 'monthly') {
    return new Date(now.setMonth(now.getMonth() + 1));
  } else {
    return new Date(now.setFullYear(now.getFullYear() + 1));
  }
};

// Helper function to get plan price
const getPlanPrice = (plan, billingCycle) => {
  const prices = {
    free: { monthly: 0, annual: 0 },
    pro: { monthly: 499, annual: 4999 }
  };

  return prices[plan][billingCycle];
};

// @desc    Get current user's membership
// @route   GET /api/membership
// @access  Private
const getCurrentMembership = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('membershipDetails');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    membership: user.membership,
    details: user.membershipDetails || null
  });
});

// @desc    Create a membership order
// @route   POST /api/membership/create-order
// @access  Private
const createMembershipOrder = asyncHandler(async (req, res) => {
  const { plan, billingCycle } = req.body;

  // Validate plan
  if (plan !== 'pro') {
    res.status(400);
    throw new Error('Invalid plan selected');
  }

  // Validate billing cycle
  if (!['monthly', 'annual'].includes(billingCycle)) {
    res.status(400);
    throw new Error('Invalid billing cycle');
  }

  // Get plan price
  const amount = getPlanPrice(plan, billingCycle);

  if (!amount) {
    res.status(400);
    throw new Error('Invalid plan or billing cycle');
  }

  try {
    // Create Razorpay order
    const order = await paymentService.createOrder(amount);

    // Create a pending transaction
    const transaction = await Transaction.create({
      user: req.user.id,
      amount: amount,
      type: 'debit',
      status: 'pending',
      description: `Membership purchase: ${plan} (${billingCycle})`,
      balance: (await User.findById(req.user.id)).walletBalance || 0,
      razorpayOrderId: order.id,
      metadata: {
        orderAmount: amount,
        orderCurrency: order.currency,
        paymentMode: 'razorpay',
        plan,
        billingCycle
      }
    });

    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      plan,
      billingCycle
    });
  } catch (error) {
    console.error('Error creating membership order:', error);
    res.status(500);
    throw new Error('Failed to create membership order: ' + error.message);
  }
});

// @desc    Verify membership payment and activate membership
// @route   POST /api/membership/verify
// @access  Private
const verifyMembershipPayment = asyncHandler(async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, plan, billingCycle } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !plan || !billingCycle) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification parameters',
      });
    }

    // Find the pending transaction
    const transaction = await Transaction.findOne({
      razorpayOrderId: razorpayOrderId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    // Verify that the transaction belongs to the current user
    if (transaction.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to transaction',
      });
    }

    // If transaction is already completed, return success
    if (transaction.status === 'completed') {
      const user = await User.findById(req.user.id).populate('membershipDetails');

      return res.status(200).json({
        success: true,
        message: 'Payment already verified',
        membership: user.membership,
        details: user.membershipDetails
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
    } catch (error) {
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

    // Get the user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Calculate end date based on billing cycle
    const endDate = calculateEndDate(billingCycle);

    // Create or update membership
    let membership;
    if (user.membershipDetails) {
      membership = await Membership.findById(user.membershipDetails);
      if (membership) {
        membership.plan = plan;
        membership.billingCycle = billingCycle;
        membership.startDate = new Date();
        membership.endDate = endDate;
        membership.isActive = true;
        membership.paymentId = razorpayPaymentId;
        membership.orderId = razorpayOrderId;
        membership.amount = getPlanPrice(plan, billingCycle);
        await membership.save();
      } else {
        // Create new membership if the reference exists but the document doesn't
        membership = await Membership.create({
          user: user._id,
          plan,
          billingCycle,
          startDate: new Date(),
          endDate,
          isActive: true,
          paymentId: razorpayPaymentId,
          orderId: razorpayOrderId,
          amount: getPlanPrice(plan, billingCycle),
        });
        user.membershipDetails = membership._id;
      }
    } else {
      // Create new membership
      membership = await Membership.create({
        user: user._id,
        plan,
        billingCycle,
        startDate: new Date(),
        endDate,
        isActive: true,
        paymentId: razorpayPaymentId,
        orderId: razorpayOrderId,
        amount: getPlanPrice(plan, billingCycle),
      });
      user.membershipDetails = membership._id;
    }

    // Update user's membership status
    user.membership = plan;

    // Add 25,000 virtual coins for pro membership upgrade
    if (plan === 'pro') {
      user.virtualBalance += 25000;

      // Create a transaction record for the virtual coins
      const virtualCoinsTransaction = await Transaction.create({
        user: user._id,
        type: 'credit',
        amount: 0, // No real money involved
        description: 'Pro membership bonus: 25,000 virtual coins',
        status: 'completed',
        balance: user.walletBalance,
        metadata: {
          virtualAmount: 25000,
          virtualBalance: user.virtualBalance,
          reason: 'membership_upgrade',
          plan: 'pro'
        }
      });

      // Add transaction to user's transactions array
      if (!user.transactions.includes(virtualCoinsTransaction._id)) {
        user.transactions.push(virtualCoinsTransaction._id);
      }
    }

    // Add transaction to user's transactions array if not already present
    if (!user.transactions) {
      user.transactions = [];
    }

    if (!user.transactions.includes(transaction._id)) {
      user.transactions.push(transaction._id);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Membership activated successfully',
      membership: user.membership,
      details: membership
    });
  } catch (error) {
    console.error('Error verifying membership payment:', error);
    res.status(500);
    throw new Error('Failed to verify membership payment: ' + error.message);
  }
});

// @desc    Cancel membership
// @route   POST /api/membership/cancel
// @access  Private
const cancelMembership = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('membershipDetails');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (!user.membershipDetails) {
    return res.status(400).json({
      success: false,
      message: 'No active membership found',
    });
  }

  // Update membership
  const membership = await Membership.findById(user.membershipDetails._id);
  if (membership) {
    membership.isActive = false;
    membership.autoRenew = false;
    await membership.save();
  }

  // Keep the membership active until the end date
  // We'll just disable auto-renewal

  return res.status(200).json({
    success: true,
    message: 'Membership auto-renewal cancelled. Your membership will remain active until the end date.',
    details: membership
  });
});

export {
  getCurrentMembership,
  createMembershipOrder,
  verifyMembershipPayment,
  cancelMembership
};