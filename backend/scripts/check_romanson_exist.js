const mongoose = require('mongoose');
const fs = require('fs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in backend .env");
  process.exit(1);
}

// Define minimal Product Schema to inspect
const productSchema = new mongoose.Schema({
  title: String,
  brand: String,
  sku: String,
  price: Number,
  oldPrice: Number,
  inventory: Number
}, { collection: 'products' });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

async function checkSKUs() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");

    const jsonPath = "C:\\Users\\upawa\\.gemini\\antigravity-ide\\brain\\fbd051c1-f465-453a-953a-7e2e99d0ced3\\scratch\\romanson_stock.json";
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    const skus = data.map(item => item.sku);
    console.log(`Checking ${skus.length} SKUs in database...`);

    const existingProducts = await Product.find({ sku: { $in: skus } });
    console.log(`Found ${existingProducts.length} existing products in DB out of ${skus.length}.`);

    if (existingProducts.length > 0) {
      console.log("\nExisting Product Samples in DB:");
      existingProducts.slice(0, 5).forEach(p => {
        console.log(`- SKU: ${p.sku} | Title: ${p.title} | Brand: ${p.brand} | Price: ${p.price} | MRP: ${p.oldPrice}`);
      });
    }

    const existingSkus = new Set(existingProducts.map(p => p.sku.toUpperCase()));
    const missingSkus = skus.filter(s => !existingSkus.has(s.toUpperCase()));

    console.log(`\nMissing SKUs in DB: ${missingSkus.length}`);
    if (missingSkus.length > 0) {
      console.log("Missing SKUs samples:", missingSkus.slice(0, 10));
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

checkSKUs();
