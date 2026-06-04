const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { Brand } = require('../models/Brand');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function audit() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const brands = await Brand.find({ 
    name: { $in: [/Tissot/i, /Movado/i, /Rado/i, /Citizen/i] } 
  }).lean();
  console.log(JSON.stringify(brands, null, 2));
  process.exit(0);
}

audit();
