const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const ProductSchema = new mongoose.Schema({ 
  brand: String, 
  inventory: Number, 
  isPublished: Boolean, 
  title: String,
  images: [String]
}, { collection: 'products' });

const Product = mongoose.model('Product', ProductSchema);

async function autoPublish() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Eligibility criteria: 
    // - Title is not empty
    // - At least 1 image
    // - Inventory > 0
    const query = {
      title: { $exists: true, $ne: "" },
      "images.0": { $exists: true },
      inventory: { $gt: 0 },
      isPublished: { $ne: true } // Only target those not already published
    };

    console.log('--- Dry Run: Counting Eligible Products ---');
    const eligibleCount = await Product.countDocuments(query);
    const brandsAffected = await Product.distinct('brand', query);

    console.log(`Total Products to be Published: ${eligibleCount}`);
    console.log(`Brands Affected: ${brandsAffected.join(', ') || 'None'}`);

    if (eligibleCount > 0) {
      console.log('\nStarting Bulk Update...');
      const result = await Product.updateMany(query, { $set: { isPublished: true } });
      console.log(`Update Complete: ${result.modifiedCount} products published.`);
    } else {
      console.log('\nNo new products met the criteria for auto-publishing.');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

autoPublish();
