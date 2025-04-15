import mongoose from 'mongoose';

const portfolioSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'User ID is required for portfolio'],
            ref: 'User',
            validate: {
                validator: function(v) {
                    return v != null && mongoose.Types.ObjectId.isValid(v);
                },
                message: props => `${props.value} is not a valid user ID!`
            }
        },
        holdings: [{
            stock: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
                ref: 'Stock',
            },
            quantity: {
                type: Number,
                required: true,
                min: 0,
            },
            averageBuyPrice: {
                type: Number,
                required: true,
            },
            currentValue: {
                type: Number,
                required: true,
            },
            profitLoss: {
                type: Number,
                required: true,
            },
        }],
        totalInvestment: {
            type: Number,
            required: true,
            default: 0,
        },
        currentValue: {
            type: Number,
            required: true,
            default: 0,
        },
        overallProfitLoss: {
            type: Number,
            required: true,
            default: 0,
        },
        profitLossPercentage: {
            type: Number,
            required: true,
            default: 0,
        },
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
portfolioSchema.index({ user: 1 }, { unique: true }); // Ensure one portfolio per user
portfolioSchema.index({ 'holdings.stock': 1 }); // For finding portfolios containing specific stocks

// Method to update portfolio statistics
portfolioSchema.methods.updateStatistics = async function() {
    let totalInvestment = 0;
    let currentValue = 0;

    for (const holding of this.holdings) {
        totalInvestment += holding.quantity * holding.averageBuyPrice;
        currentValue += holding.currentValue;
    }

    this.totalInvestment = totalInvestment;
    this.currentValue = currentValue;
    this.overallProfitLoss = currentValue - totalInvestment;
    // Handle division by zero case
    this.profitLossPercentage = totalInvestment === 0 ? 0 : ((currentValue - totalInvestment) / totalInvestment) * 100;
    this.lastUpdated = Date.now();

    return this.save();
};

export default mongoose.model('Portfolio', portfolioSchema);