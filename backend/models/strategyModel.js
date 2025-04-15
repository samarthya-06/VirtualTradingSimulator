const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  indicator: {
    type: String,
    required: true,
    enum: ['RSI', 'MACD', 'BB', 'SMA', 'EMA', 'ATR', 'STOCHASTIC']
  },
  period: {
    type: Number,
    required: function() {
      return ['RSI', 'BB', 'SMA', 'EMA', 'ATR', 'STOCHASTIC'].includes(this.indicator);
    }
  },
  fastPeriod: {
    type: Number,
    required: function() {
      return this.indicator === 'MACD';
    }
  },
  slowPeriod: {
    type: Number,
    required: function() {
      return this.indicator === 'MACD';
    }
  },
  signalPeriod: {
    type: Number,
    required: function() {
      return this.indicator === 'MACD';
    }
  },
  stdDev: {
    type: Number,
    required: function() {
      return this.indicator === 'BB';
    }
  },
  condition: {
    type: String,
    required: true,
    enum: ['GT', 'LT', 'GTE', 'LTE', 'EQ', 'CROSS_ABOVE', 'CROSS_BELOW']
  },
  value: {
    type: Number,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['BUY', 'SELL']
  }
});

const strategySchema = new mongoose.Schema(
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
    rules: [ruleSchema],
    parameters: {
      initialCapital: {
        type: Number,
        required: true,
        default: 100000
      },
      maxPositions: {
        type: Number,
        required: true,
        default: 5
      },
      stopLoss: {
        type: Number,
        required: false
      },
      takeProfit: {
        type: Number,
        required: false
      }
    },
    performance: {
      totalReturn: Number,
      annualizedReturn: Number,
      sharpeRatio: Number,
      maxDrawdown: Number,
      winRate: Number,
      profitFactor: Number,
      lastUpdated: Date
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    category: {
      type: String,
      enum: ['MOMENTUM', 'MEAN_REVERSION', 'BREAKOUT', 'SCALPING', 'CUSTOM'],
      required: true
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
strategySchema.index({ creator: 1, status: 1 });
strategySchema.index({ category: 1, isPublic: 1 });
strategySchema.index({ tags: 1 });

const Strategy = mongoose.model('Strategy', strategySchema);

module.exports = Strategy; 