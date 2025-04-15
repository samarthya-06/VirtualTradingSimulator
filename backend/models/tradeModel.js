import mongoose from 'mongoose';

const tradeSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        stock: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Stock',
        },
        type: {
            type: String,
            required: true,
            enum: ['BUY', 'SELL'],
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        price: {
            type: Number,
            required: true,
        },
        orderType: {
            type: String,
            required: true,
            enum: ['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT', 'TRAILING_STOP'],
        },
        status: {
            type: String,
            required: true,
            enum: ['PENDING', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'PARTIALLY_FILLED', 'REJECTED'],
            default: 'PENDING',
        },
        limitPrice: {
            type: Number,
            required: function() {
                return this.orderType === 'LIMIT' || this.orderType === 'STOP_LIMIT';
            },
        },
        stopPrice: {
            type: Number,
            required: function() {
                return this.orderType === 'STOP' || this.orderType === 'STOP_LIMIT';
            },
        },
        trailingPercent: {
            type: Number,
            required: function() {
                return this.orderType === 'TRAILING_STOP';
            },
            min: 0.1,
            max: 20,
        },
        trailingStopPrice: {
            type: Number,
            default: null,
        },
        highestPrice: {
            type: Number,
            default: null,
        },
        lowestPrice: {
            type: Number,
            default: null,
        },
        timeInForce: {
            type: String,
            required: true,
            enum: ['DAY', 'GTC', 'IOC', 'FOK'],
            default: 'DAY',
        },
        isPartialFillAllowed: {
            type: Boolean,
            default: false,
        },
        totalAmount: {
            type: Number,
            required: true,
        },
        executedAt: {
            type: Date,
            default: null,
        },
        filledQuantity: {
            type: Number,
            default: 0,
        },
        remainingQuantity: {
            type: Number,
            default: function() {
                return this.quantity;
            },
        },
        parentOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Trade',
            default: null,
        },
        expiresAt: {
            type: Date,
            default: function() {
                if (this.timeInForce === 'DAY') {
                    // Set expiry to end of trading day (3:30 PM IST)
                    const today = new Date();
                    today.setUTCHours(10, 0, 0, 0); // 3:30 PM IST = 10:00 AM UTC
                    return today;
                } else if (this.timeInForce === 'GTC') {
                    // Good Till Cancelled - set to 30 days from now
                    const future = new Date();
                    future.setDate(future.getDate() + 30);
                    return future;
                }
                return null;
            },
        },
        lastUpdated: {
            type: Date,
            default: Date.now,
        },
        notes: {
            type: String,
        },
        isVirtual: {
            type: Boolean,
            default: true,
            description: 'Whether this trade uses virtual currency',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for faster queries
tradeSchema.index({ user: 1, stock: 1, createdAt: -1 });
tradeSchema.index({ user: 1, createdAt: -1 }); // For user's trade history
tradeSchema.index({ stock: 1, createdAt: -1 }); // For stock trade history
tradeSchema.index({ status: 1 }); // For filtering by status

export default mongoose.model('Trade', tradeSchema);