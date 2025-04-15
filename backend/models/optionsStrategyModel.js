const mongoose = require('mongoose');

const optionLegSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true
  },
  strike: {
    type: Number,
    required: true
  },
  expiry: {
    type: Date,
    required: true
  },
  isCall: {
    type: Boolean,
    required: true
  },
  isLong: {
    type: Boolean,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  currentPrice: {
    type: Number,
    required: true
  },
  volatility: {
    type: Number,
    required: true
  },
  riskFreeRate: {
    type: Number,
    required: true
  }
});

const optionsStrategySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    legs: [optionLegSchema],
    category: {
      type: String,
      enum: ['SPREAD', 'STRADDLE', 'STRANGLE', 'BUTTERFLY', 'IRON_CONDOR', 'CUSTOM'],
      required: true
    },
    parameters: {
      maxLoss: Number,
      maxProfit: Number,
      breakEvenPoints: [Number],
      riskRewardRatio: Number
    },
    greeks: {
      delta: Number,
      gamma: Number,
      theta: Number,
      vega: Number,
      rho: Number,
      lastUpdated: Date
    },
    performance: {
      totalReturn: Number,
      maxDrawdown: Number,
      winRate: Number,
      profitFactor: Number,
      lastUpdated: Date
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    tags: [String],
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'],
      default: 'DRAFT'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
optionsStrategySchema.index({ creator: 1, status: 1 });
optionsStrategySchema.index({ category: 1, isPublic: 1 });
optionsStrategySchema.index({ tags: 1 });

const OptionsStrategy = mongoose.model('OptionsStrategy', optionsStrategySchema);

module.exports = OptionsStrategy; 