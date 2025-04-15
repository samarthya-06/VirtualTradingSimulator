import mongoose from 'mongoose';

const stockSchema = mongoose.Schema(
    {
        symbol: {
            type: String,
            required: true,
            unique: true,
        },
        companyName: {
            type: String,
            required: true,
        },
        exchange: {
            type: String,
            required: true,
            enum: ['NSE', 'BSE'],
        },
        currentPrice: {
            type: Number,
            required: true,
            default: 0,
        },
        previousClose: {
            type: Number,
            default: 0,
        },
        dayHigh: {
            type: Number,
            default: 0,
        },
        dayLow: {
            type: Number,
            default: 0,
        },
        volume: {
            type: Number,
            default: 0,
        },
        marketCap: {
            type: Number,
            default: 0,
        },
        peRatio: {
            type: Number,
            default: 0,
        },
        dividendYield: {
            type: Number,
            default: 0,
        },
        sector: {
            type: String,
            default: 'Unknown',
        },
        industry: {
            type: String,
            default: 'Unknown',
        },
        beta: {
            type: Number,
            default: 1.0,
        },
        volatility: {
            type: Number,
            default: 0.15,
        },
        priceHistory: [{
            price: Number,
            volume: Number,
            timestamp: Date,
        }],
        lastUpdated: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for faster queries
stockSchema.index({ symbol: 1, exchange: 1 });
stockSchema.index({ companyName: 'text' });
stockSchema.index({ exchange: 1, sector: 1 });
stockSchema.index({ marketCap: -1 });
stockSchema.index({ sector: 1 });
stockSchema.index({ industry: 1 });

export default mongoose.model('Stock', stockSchema);