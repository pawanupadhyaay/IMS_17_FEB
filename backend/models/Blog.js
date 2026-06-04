const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a blog title'],
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  content: {
    type: String,
    required: [true, 'Please provide blog content'],
  },
  excerpt: {
    type: String,
    required: [true, 'Please provide a short excerpt'],
    maxLength: 300,
  },
  author: {
    type: String,
    default: 'Samay Watch Team',
  },
  coverImage: {
    type: String,
    required: [true, 'Please provide a cover image URL'],
  },
  status: {
    type: String,
    enum: ['Live', 'Archived', 'Draft'],
    default: 'Draft',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Blog', blogSchema);
