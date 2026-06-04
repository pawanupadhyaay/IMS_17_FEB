const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env from backend
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const { Brand } = require('../backend/models/Brand');

async function checkVictorinox() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const allBrands = await Brand.find({}).select('name category').lean();
    console.log('All Brands in DB:', allBrands.map(b => `${b.name} (${b.category})`).join(', '));

    const brands = await Brand.find({ name: /victorinox/i });
    console.log('Found matching brands:', JSON.stringify(brands, null, 2));

    if (brands.length > 0) {
      const result = await Brand.updateMany(
        { name: /victorinox/i },
        { $set: { category: 'fashion' } }
      );
      console.log('Update result:', result);
    } else {
      console.log('No Victorinox brand found to update.');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkVictorinox();
