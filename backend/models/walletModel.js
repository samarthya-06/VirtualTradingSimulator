import mongoose from 'mongoose';

const walletSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        balance: {
            type: Number,
            required: true,
            default: 0
        },
        transactions: [{
            type: {
                type: String,
                required: true,
                enum: ['credit', 'debit']
            },
            amount: {
                type: Number,
                required: true
            },
            razorpayPaymentId: {
                type: String,
                sparse: true
            },
            razorpayOrderId: {
                type: String,
                sparse: true
            },
            status: {
                type: String,
                required: true,
                enum: ['pending', 'completed', 'failed'],
                default: 'pending'
            },
            description: String,
            createdAt: {
                type: Date,
                default: Date.now
            }
        }]
    },
    {
        timestamps: true
    }
);

// Indexes for faster queries
walletSchema.index({ user: 1 }, { unique: true }); // For quick user wallet lookup
walletSchema.index({ 'transactions.razorpayPaymentId': 1 }, { sparse: true }); // For payment verification
walletSchema.index({ 'transactions.razorpayOrderId': 1 }, { sparse: true }); // For order lookup
walletSchema.index({ 'transactions.createdAt': -1 }); // For transaction history sorting

export default mongoose.model('Wallet', walletSchema);