const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load backend env variables
dotenv.config({ path: path.join(__dirname, "../.env") });

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

  console.log("🔍 Searching for product with SKU: test1...");
  // Try finding exact SKU 'test1' (case-insensitive regex or exact)
  const product = await productsCol.findOne({ sku: { $regex: /^test1$/i } });

  if (product) {
    console.log("\n🎯 Product Found!");
    console.log(`- ID: ${product._id}`);
    console.log(`- Title: ${product.title}`);
    console.log(`- Brand: ${product.brand}`);
    console.log(`- SKU: ${product.sku}`);
    console.log(`- Images Array (images):`, product.images);
    console.log(`- Legacy Image URL (imageUrl):`, product.imageUrl);
    console.log(`- Legacy Image Object (image.url):`, product.image ? product.image.url : undefined);
  } else {
    console.log("\n❌ Product with SKU 'test1' not found in products collection.");
  }

  await mongoose.disconnect();
  console.log("\n🔌 Disconnected from MongoDB.");
}

run().catch(console.error);
