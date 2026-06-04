const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load backend env variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const { migrateUrlsToDoSpaces } = require("../utils/doSpacesImageMigrator");

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is not defined");
    process.exit(1);
  }

  console.log("🔄 Connecting to MongoDB...");
  await mongoose.connect(uri);
  console.log("✅ Connected successfully!");

  const db = mongoose.connection.db;
  const productsCol = db.collection("products");

  console.log("🔍 Finding product with SKU 'test1'...");
  const product = await productsCol.findOne({ sku: { $regex: /^test1$/i } });

  if (!product) {
    console.log("❌ Product with SKU 'test1' not found.");
    await mongoose.disconnect();
    return;
  }

  console.log(`- Current image URLs:`, product.images);

  if (!product.images || product.images.length === 0) {
    console.log("ℹ️ Product has no images to migrate.");
    await mongoose.disconnect();
    return;
  }

  console.log("\n⚡ Starting automatic image migration to DigitalOcean Spaces...");
  const migratedImages = await migrateUrlsToDoSpaces(product.images);

  console.log(`\n📥 Migrated image URLs:`, migratedImages);

  console.log("\n💾 Saving updated images array to MongoDB...");
  const result = await productsCol.updateOne(
    { _id: product._id },
    { $set: { images: migratedImages } }
  );

  console.log(`✅ Success! MongoDB modified count: ${result.modifiedCount}`);

  await mongoose.disconnect();
  console.log("\n🔌 Disconnected from MongoDB.");
}

run().catch(console.error);
