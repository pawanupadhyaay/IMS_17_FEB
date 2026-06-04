const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { Brand } = require('../models/Brand');
const { Product } = require('../models/Product');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function verifyData() {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log('--- CONNECTED TO:', uri.replace(/:([^:@]+)@/, ':***@')); // Hide password

    console.log('\n--- BRAND COLLECTION ENTRIES ---');
    const brands = await Brand.find({}).lean();
    if (brands.length === 0) {
      console.log('No brands found in Brand collection.');
    } else {
      brands.forEach(b => {
        console.log(`[${b._id}] Name: "${b.name}", Slug: "${b.slug}", Category: "${b.category}", Published: ${b.isPublished}`);
      });
    }

    console.log('\n--- PRODUCT BRAND NAMES (DISTINCT) ---');
    const productBrands = await Product.distinct('brand');
    console.log(JSON.stringify(productBrands, null, 2));

    const tissotProducts = await Product.countDocuments({ brand: /tissot/i });
    console.log(`\nProducts matching "tissot" (case-insensitive): ${tissotProducts}`);

    process.exit(0);
  } catch (err) {
    console.error('Error during verification:', err);
    process.exit(1);
  }
}

verifyData();
