import mongoose from 'mongoose';

const priceAlertSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    type: {
      type: String,
      required: true,
      enum: ['above', 'below'],
      default: 'above'
    },
    targetPrice: {
      type: Number,
      required: true
    },
    currentPrice: {
      type: Number,
      required: true
    },
    isTriggered: {
      type: Boolean,
      default: false
    },
    triggeredAt: {
      type: Date,
      default: null
    },
    notificationSent: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries by user and symbol
priceAlertSchema.index({ user: 1, symbol: 1 });
priceAlertSchema.index({ isTriggered: 1, notificationSent: 1 });

const PriceAlert = mongoose.model('PriceAlert', priceAlertSchema);

export default PriceAlert; 