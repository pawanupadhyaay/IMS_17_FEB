const mongoose = require('mongoose')

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    videoUrl: {
      type: String,
      default: '',
      trim: true,
    },
    thumbnail: {
      type: String,
      default: '',
      trim: true,
    },
    startingPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    isMostLoved: {
      type: Boolean,
      default: false,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['luxury', 'fashion'],
      default: 'fashion',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

brandSchema.index({ isMostLoved: 1, displayOrder: 1 })

const Brand = mongoose.model('Brand', brandSchema)

module.exports = { Brand }
