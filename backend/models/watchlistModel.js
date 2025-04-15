import mongoose from 'mongoose';

const watchlistSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        name: {
            type: String,
            required: true,
            default: 'Default Watchlist',
        },
        stocks: [{
            stock: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
                ref: 'Stock',
            },
            addedAt: {
                type: Date,
                default: Date.now,
            },
            alerts: [{
                type: {
                    type: String,
                    enum: ['PRICE_ABOVE', 'PRICE_BELOW', 'PERCENT_CHANGE'],
                    required: true,
                },
                value: {
                    type: Number,
                    required: true,
                },
                isActive: {
                    type: Boolean,
                    default: true,
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            }],
            notes: {
                type: String,
            },
        }],
        isDefault: {
            type: Boolean,
            default: false,
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

// Index for faster queries
watchlistSchema.index({ user: 1, name: 1 });

// Ensure user has only one default watchlist
watchlistSchema.pre('save', async function(next) {
    if (this.isDefault) {
        await this.constructor.updateMany(
            { user: this.user, _id: { $ne: this._id } },
            { $set: { isDefault: false } }
        );
    }
    next();
});

export default mongoose.model('Watchlist', watchlistSchema);