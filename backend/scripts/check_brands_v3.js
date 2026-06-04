const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { Brand } = require('../models/Brand');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkActualBrands() {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const brands = await Brand.find({}).lean();
    console.log('--- ALL BRANDS ---');
    brands.forEach(b => {
      console.log(`Name: "${b.name}", Slug: "${b.slug}", Category: "${b.category}", MostLoved: ${b.isMostLoved}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkActualBrands();
