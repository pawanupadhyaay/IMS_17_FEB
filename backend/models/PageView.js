const mongoose = require('mongoose');

const pageViewSchema = new mongoose.Schema({
  url: { type: String, required: true },
  ip: { type: String },
  country: { type: String, default: 'India' },
  userAgent: { type: String },
  sessionId: { type: String }
}, { timestamps: true });

// Index for fast analytics queries
pageViewSchema.index({ createdAt: -1 });
pageViewSchema.index({ sessionId: 1, createdAt: -1 });

module.exports = mongoose.model('PageView', pageViewSchema);
