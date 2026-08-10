const mongoose = require('mongoose');

const BackInStockSubscriptionSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  isNotified: {
    type: Boolean,
    default: false
  },
  notifiedAt: {
    type: Date
  }
}, { timestamps: true });

// Prevent duplicate subscriptions for the same email and product
BackInStockSubscriptionSchema.index({ product: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('BackInStockSubscription', BackInStockSubscriptionSchema);
