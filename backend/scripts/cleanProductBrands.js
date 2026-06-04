const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env from backend dir
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ProductSchema = new mongoose.Schema({
  brand: String
}, { collection: 'products' });

const Product = mongoose.model('Product', ProductSchema);

async function cleanBrandNames() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    // Find all products where brand includes "Watch" or "Watches"
    // Regex matches " Watch", " Watches", " New Watch" (case-insensitive) at the end of the string
    const targetRegex = /\s+(Watch|Watches|New Watch)$/i;
    
    const products = await Product.find({ 
      brand: { $regex: targetRegex } 
    });

    console.log(`Found ${products.length} products with "Watch/Watches" suffixes.`);

    if (products.length === 0) {
      console.log('No cleaning needed.');
      process.exit(0);
    }

    let updatedCount = 0;
    for (const product of products) {
      const oldBrand = product.brand;
      const newBrand = oldBrand.replace(targetRegex, '').trim();
      
      if (oldBrand !== newBrand) {
        product.brand = newBrand;
        await product.save();
        updatedCount++;
        if (updatedCount % 100 === 0) {
          console.log(`Updated ${updatedCount} products...`);
        }
      }
    }

    console.log(`Finished! Successfully cleaned brand names for ${updatedCount} products.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

cleanBrandNames();
