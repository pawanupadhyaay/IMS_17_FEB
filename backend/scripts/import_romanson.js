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

// Minimal Product Schema
const productSchema = new mongoose.Schema({
  title: String,
  brand: String,
  sku: String,
  price: Number,
  oldPrice: Number,
  inventory: Number,
  isPublished: { type: Boolean, default: false },
  category: String,
  slug: String
}, { collection: 'products', timestamps: true });

// Minimal Brand Schema
const brandSchema = new mongoose.Schema({
  name: String,
  category: String
}, { collection: 'brands' });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const Brand = mongoose.models.Brand || mongoose.model('Brand', brandSchema);

// Simple slug generator fallback
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
}

async function runImport() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");

    const jsonPath = "C:\\Users\\upawa\\.gemini\\antigravity-ide\\brain\\fbd051c1-f465-453a-953a-7e2e99d0ced3\\scratch\\romanson_stock.json";
    if (!fs.existsSync(jsonPath)) {
      console.error(`JSON file not found: ${jsonPath}`);
      return;
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`Importing ${data.length} Romanson products...`);

    // Check if 'Romanson' brand document exists, create it if not
    let romansonBrand = await Brand.findOne({ name: /^romanson$/i });
    if (!romansonBrand) {
      console.log("Brand 'Romanson' not found in database. Creating it...");
      romansonBrand = await Brand.create({
        name: 'Romanson',
        category: 'Watches'
      });
      console.log("Brand 'Romanson' created successfully.");
    }

    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    for (const item of data) {
      try {
        const sku = item.sku.trim();
        const mrp = Number(item.mrp || 0);

        if (!sku) continue;

        // Search existing product by SKU
        let product = await Product.findOne({ sku: new RegExp(`^${sku}$`, 'i') });

        if (product) {
          // Update price and oldPrice
          product.price = mrp;
          product.oldPrice = mrp;
          await product.save();
          updatedCount++;
          console.log(`Updated SKU: ${sku} -> Price: ₹${mrp}`);
        } else {
          // Create new product
          const newProduct = new Product({
            brand: 'Romanson',
            sku: sku,
            title: `Romanson ${sku}`,
            price: mrp,
            oldPrice: mrp,
            inventory: 0,
            isPublished: false,
            category: romansonBrand.category || 'Watches',
            slug: slugify(`romanson-${sku}`)
          });

          await newProduct.save();
          createdCount++;
          console.log(`Created SKU: ${sku} -> Title: Romanson ${sku}, Price: ₹${mrp}`);
        }
      } catch (err) {
        failedCount++;
        console.error(`Failed to import SKU ${item.sku}:`, err.message);
      }
    }

    console.log("\n--- Import Summary ---");
    console.log(`Total Processed: ${data.length}`);
    console.log(`Created: ${createdCount}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Failed: ${failedCount}`);

  } catch (err) {
    console.error("Overall Import Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runImport();
