const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { Brand } = require('../models/Brand');
const { Product } = require('../models/Product');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function fullAudit() {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log('--- CONNECTING TO DB ---');

    const brands = await Brand.find({}).lean();
    console.log('--- BRANDS LIST ---');
    brands.forEach(b => console.log(`${b.name} | ${b.slug} | ${b.category} | ${b._id}`));

    const productBrands = await Product.aggregate([
      { $group: { _id: '$brand', count: { $sum: 1 } } }
    ]);
    console.log('\n--- PRODUCT BRAND COUNTS ---');
    productBrands.forEach(p => console.log(`${p._id} : ${p.count}`));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fullAudit();
