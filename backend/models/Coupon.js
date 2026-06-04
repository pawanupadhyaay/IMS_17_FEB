const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please provide a coupon code'],
    unique: true,
    trim: true,
    uppercase: true,
  },
  discountPercentage: {
    type: Number,
    required: [true, 'Please provide discount percentage'],
    min: 1,
    max: 100,
  },
  minOrderAmount: {
    type: Number,
    required: [true, 'Please provide minimum order amount'],
    default: 0,
  },
  validUntil: {
    type: Date,
    required: [true, 'Please provide an expiration date'],
  },
  uses: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Coupon', couponSchema);
