import mongoose from 'mongoose';

const membershipSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    plan: {
      type: String,
      required: true,
      enum: ['free', 'pro'],
      default: 'free',
    },
    billingCycle: {
      type: String,
      required: true,
      enum: ['monthly', 'annual'],
      default: 'monthly',
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    paymentId: {
      type: String,
    },
    orderId: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    metadata: {
      type: Object,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for faster lookups
membershipSchema.index({ user: 1 });
membershipSchema.index({ plan: 1 });
membershipSchema.index({ isActive: 1 });
membershipSchema.index({ endDate: 1 });

export default mongoose.model('Membership', membershipSchema);