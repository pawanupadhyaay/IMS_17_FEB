const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { Product } = require("../models/Product");
const { generateProductSlug } = require("../utils/slugify");

dotenv.config();

const updateSlugs = async () => {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to database.");

    const products = await Product.find({});
    console.log(`Found ${products.length} products to update.`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        const newSlug = generateProductSlug(product.brand, product.sku);
        
        // If slug is already correct, skip to avoid unnecessary writes
        if (product.slug === newSlug) {
          skippedCount++;
          continue;
        }

        // Check if new slug already exists for another product
        const existing = await Product.findOne({ slug: newSlug, _id: { $ne: product._id } });
        if (existing) {
          console.warn(`[WARN] Duplicate slug detected for SKU: ${product.sku}. Appending ID.`);
          product.slug = `${newSlug}-${product._id.toString().slice(-4)}`;
        } else {
          product.slug = newSlug;
        }

        await product.save();
        updatedCount++;
        if (updatedCount % 50 === 0) console.log(`Processed ${updatedCount} products...`);
      } catch (err) {
        console.error(`[ERROR] Failed to update product ID ${product._id}:`, err.message);
        errorCount++;
      }
    }

    console.log("------------------------------------------");
    console.log(`Update complete!`);
    console.log(`Total: ${products.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log("------------------------------------------");

    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

updateSlugs();
