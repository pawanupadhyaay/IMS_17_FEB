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
    console.log('Connected to MongoDB');

    const brands = await Brand.find({}).lean();
    console.log('--- ALL BRANDS ---');
    brands.forEach(b => console.log(`ID: ${b._id}, Name: "${b.name}", Slug: "${b.slug}", Category: "${b.category}"`));

    const productBrands = await Product.distinct('brand');
    console.log('--- PRODUCT BRAND STRINGS ---');
    console.log(JSON.stringify(productBrands, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fullAudit();
