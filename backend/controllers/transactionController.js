import asyncHandler from 'express-async-handler';
import Transaction from '../models/transactionModel.js';

// @desc    Get user's transactions
// @route   GET /api/transactions
// @access  Private
export const getTransactions = asyncHandler(async (req, res) => {
    const transactions = await Transaction.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .limit(50);

    res.json(transactions);
});

// @desc    Get transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
export const getTransactionById = asyncHandler(async (req, res) => {
    const transaction = await Transaction.findOne({
        _id: req.params.id,
        user: req.user.id
    });

    if (!transaction) {
        res.status(404);
        throw new Error('Transaction not found');
    }

    res.json(transaction);
});