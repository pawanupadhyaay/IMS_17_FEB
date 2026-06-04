const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Brand } = require('./models/Brand');

dotenv.config();

async function checkBrands() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const mostLoved = await Brand.find({ isMostLoved: true });
    console.log(`Found ${mostLoved.length} most loved brands:`);
    mostLoved.forEach(b => console.log(`- ${b.name} (isMostLoved: ${b.isMostLoved}, isPublished: ${b.isPublished})`));

    const allBrands = await Brand.find({});
    console.log(`Total brands in DB: ${allBrands.length}`);
    if (mostLoved.length === 0 && allBrands.length > 0) {
      console.log('No most loved brands found. You need to set isMostLoved: true for some brands.');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkBrands();
