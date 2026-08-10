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
    min: 0,
    max: 100,
    default: 0,
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed', 'shipping', 'buy_x_get_y'],
    default: 'percentage',
  },
  method: {
    type: String,
    enum: ['code', 'automatic'],
    default: 'code',
  },
  buyXProduct: {
    type: String,
    default: '',
  },
  buyXQty: {
    type: Number,
    default: 1,
  },
  getYProduct: {
    type: String,
    default: '',
  },
  getYQty: {
    type: Number,
    default: 1,
  },
  getYDiscount: {
    type: Number,
    min: 0,
    max: 100,
    default: 100,
  },
  eligibility: {
    type: String,
    enum: ['all', 'customer'],
    default: 'all',
  },
  appliesTo: {
    type: String,
    enum: ['all', 'collection', 'product'],
    default: 'all',
  },
  discountValue: {
    type: Number,
    default: 0,
  },
  collectionName: {
    type: String,
    default: '',
  },
  productName: {
    type: String,
    default: '',
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
