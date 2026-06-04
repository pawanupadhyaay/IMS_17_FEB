const mongoose = require("mongoose");
const Joi = require("joi");
const { slugify, generateProductSlug } = require("../utils/slugify");

const productSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    brand: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    sku: {
      type: String,
      trim: true,
      default: "",
      unique: true,
      sparse: true,
    },

    category: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    inventory: {
      type: Number,
      default: 0,
    },

    price: {
      type: Number,
      default: 0,
      index: true,
    },

    oldPrice: {
      type: Number,
      default: 0,
    },

    title: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    // ---------- Product Specifications ----------
    caseMaterial: { type: String, trim: true, default: "" },
    dialColor: { type: String, trim: true, default: "" },
    waterResistance: { type: String, trim: true, default: "" },
    warrantyPeriod: { type: String, trim: true, default: "" },
    movement: { type: String, trim: true, default: "" },
    gender: { type: String, trim: true, default: "" },
    strapColor: { type: String, trim: true, default: "" },
    caseShape: { type: String, trim: true, default: "" },
    caseSize: { type: String, trim: true, default: "" },
    strapMaterial: { type: String, trim: true, default: "" },

    // ---------- Media ----------
    images: {
      type: [String],
      default: [],
    },



    slug: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    // ---------- Store Control ----------
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },

    ratings: {
      type: Number,
      default: 0,
    },

    numReviews: {
      type: Number,
      default: 0,
    },

    seoTitle: {
      type: String,
      trim: true,
      default: "",
    },
    seoDescription: {
      type: String,
      trim: true,
      default: "",
    },
    seoKeywords: {
      type: String,
      trim: true,
      default: "",
    },
    seoImage: {
      type: String,
      trim: true,
      default: "",
    },

    variants: [
      {
        name: String,
        sku: String,
        price: Number,
        inventory: Number,
        strapColor: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ---------- AUTO SLUG & CATEGORY SYNC ----------
productSchema.pre("save", async function (next) {
  try {
    // 1. Force Category sync from Brand if missing or if brand is set
    if (this.brand && (!this.category || this.category.trim() === "" || ['Analog', 'Digital', 'Automatic', 'Quartz'].includes(this.category))) {
      const BrandModel = mongoose.model('Brand');
      const brandDoc = await BrandModel.findOne({ name: new RegExp(`^${this.brand}$`, 'i') }).select('category').lean();
      if (brandDoc && brandDoc.category) {
        // Move watch-type to movement if needed
        if (['Analog', 'Digital', 'Automatic', 'Quartz'].includes(this.category) && !this.movement) {
          this.movement = this.category;
        }
        this.category = brandDoc.category;
      }
    }

    // 2. Generate slug if missing
    if (!this.slug || !this.slug.trim()) {
      this.slug = generateProductSlug(this.brand, this.sku);
    }

    next();
  } catch (err) {
    next(err);
  }
});

// ---------- INDEXES FOR PERFORMANCE ----------

// Fast homepage query (New Arrivals)
productSchema.index({ isPublished: 1, createdAt: -1 });

// Brand page query
productSchema.index({ brand: 1, isPublished: 1 });

// Category filtering
productSchema.index({ category: 1, isPublished: 1 });

const Product = mongoose.model("Product", productSchema);

// ---------- VALIDATION ----------
function validateProduct(product) {
  const schema = Joi.object({
    user: Joi.string().optional(),
    brand: Joi.string().allow("").optional(),
    sku: Joi.string().allow("").optional(),
    category: Joi.string().allow("").optional(),
    inventory: Joi.number().optional(),
    price: Joi.number().optional(),
    oldPrice: Joi.number().optional(),
    description: Joi.string().allow("").optional(),
    title: Joi.string().allow("").optional(),
    images: Joi.array().items(Joi.string().allow("")).optional(),

    caseMaterial: Joi.string().allow("").optional(),
    dialColor: Joi.string().allow("").optional(),
    waterResistance: Joi.string().allow("").optional(),
    warrantyPeriod: Joi.string().allow("").optional(),
    movement: Joi.string().allow("").optional(),
    gender: Joi.string().allow("").optional(),
    strapColor: Joi.string().allow("").optional(),
    caseShape: Joi.string().allow("").optional(),
    caseSize: Joi.string().allow("").optional(),
    strapMaterial: Joi.string().allow("").optional(),
    seoTitle: Joi.string().allow("").optional(),
    seoDescription: Joi.string().allow("").optional(),
    seoKeywords: Joi.string().allow("").optional(),
    seoImage: Joi.string().allow("").optional(),

    slug: Joi.string().allow("").optional(),
    isPublished: Joi.boolean().optional(),
    ratings: Joi.number().optional(),
    numReviews: Joi.number().optional(),

    variants: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().allow("").optional(),
          sku: Joi.string().allow("").optional(),
          price: Joi.number().optional(),
          inventory: Joi.number().optional(),
        })
      )
      .optional(),
  });

  return schema.validate(product);
}

module.exports.Product = Product;
module.exports.validateProduct = validateProduct;