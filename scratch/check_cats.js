const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });
const { Product } = require('../backend/models/Product');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const counts = await Product.aggregate([
    { $match: { brand: /victorinox/i } },
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);
  console.log('Victorinox Category Counts:', JSON.stringify(counts, null, 2));
  process.exit(0);
}
run();
