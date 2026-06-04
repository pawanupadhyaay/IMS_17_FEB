const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { Product } = require('../models/Product');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function audit() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const brands = await Product.distinct('brand');
    const dirty = brands.filter(b => /watch/i.test(b));
    console.log(JSON.stringify(dirty, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

audit();
