const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { Brand } = require('../models/Brand');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function audit() {
  await mongoose.connect(process.env.MONGODB_URI);
  const brands = await Brand.find({}).lean();
  console.log(JSON.stringify(brands, null, 2));
  process.exit(0);
}

audit();
