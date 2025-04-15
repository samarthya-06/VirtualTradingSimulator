import mongoose from 'mongoose';

const transactionSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        type: {
            type: String,
            required: true,
            enum: ['credit', 'debit']
        },
        amount: {
            type: Number,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        status: {
            type: String,
            required: true,
            enum: ['pending', 'completed', 'failed'],
            default: 'completed'
        },
        balance: {
            type: Number,
            required: true
        },
        razorpayOrderId: {
            type: String,
            sparse: true
        },
        razorpayPaymentId: {
            type: String,
            sparse: true
        },
        metadata: {
            type: Object,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model('Transaction', transactionSchema);