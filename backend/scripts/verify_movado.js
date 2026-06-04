const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { Product } = require('../models/Product');
const { Brand } = require('../models/Brand');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function verifyCaseInsensitive() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('--- CONNECTED TO DB ---');

    const movadoBrands = await Brand.find({ name: /movado/i }).lean();
    console.log('--- BRAND RECORDS ---');
    movadoBrands.forEach(b => console.log(`Name: "${b.name}", ID: ${b._id}`));

    const productBrands = await Product.distinct('brand', { brand: /movado/i });
    console.log('\n--- PRODUCT BRAND STRINGS ---');
    console.log(JSON.stringify(productBrands, null, 2));

    const counts = await Product.aggregate([
      { $match: { brand: /movado/i } },
      { $group: { _id: '$brand', count: { $sum: 1 } } }
    ]);
    console.log('\n--- PRODUCT COUNTS BY STRING ---');
    console.log(JSON.stringify(counts, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

verifyCaseInsensitive();
