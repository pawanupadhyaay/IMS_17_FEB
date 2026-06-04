const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { Brand } = require('../models/Brand');
const { Product } = require('../models/Product');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function consolidateBrands() {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log('--- CONNECTED TO DB ---');

    // List of pairs: [Authoritative Name, Duplicate Name to remove]
    const pairs = [
      ['Tissot', 'Tissot Watch'],
      ['Seiko', 'Seiko Watch'],
      ['Victorinox', 'Victorinox Watch'],
      ['Swarovski', 'Swarovski Watch'],
      ['Roberto Cavalli', 'Roberto Cavalli Watch'],
      ['Skagen', 'Skagen Watch'],
      ['Tommy Hilfiger', 'Tommy Hilfiger Watch']
    ];

    for (const [correct, duplicate] of pairs) {
      console.log(`\nProcessing: "${duplicate}" -> "${correct}"`);

      // 1. Find authoritative brand (correct)
      let correctBrand = await Brand.findOne({ name: correct });
      if (!correctBrand) {
        console.log(`Warning: Authoritative brand "${correct}" not found. Trying case-insensitive search...`);
        correctBrand = await Brand.findOne({ name: { $regex: new RegExp(`^${correct}$`, 'i') } });
      }

      const duplicateBrand = await Brand.findOne({ name: { $regex: new RegExp(`^${duplicate}$`, 'i') } });

      if (correctBrand && duplicateBrand) {
        // 2. Update products
        const updateResult = await Product.updateMany(
          { brand: { $regex: new RegExp(`^${duplicate}$`, 'i') } },
          { $set: { brand: correctBrand.name } }
        );
        console.log(`Updated ${updateResult.modifiedCount} products from "${duplicate}" to "${correctBrand.name}"`);

        // 3. Delete duplicate brand
        await Brand.deleteOne({ _id: duplicateBrand._id });
        console.log(`Deleted duplicate brand record: "${duplicate}" [${duplicateBrand._id}]`);

        // 4. Ensure authoritative brand has MostLoved etc. if duplicate had it
        if (duplicateBrand.isMostLoved && !correctBrand.isMostLoved) {
          await Brand.updateOne({ _id: correctBrand._id }, { $set: { isMostLoved: true } });
          console.log(`Transferred "isMostLoved" status to "${correctBrand.name}"`);
        }
      } else {
        if (!duplicateBrand) console.log(`Notice: Duplicate brand "${duplicate}" not found in brands collection.`);
        if (!correctBrand) console.log(`Notice: Correct brand "${correct}" not found in brands collection.`);
      }
    }

    // Special Case: Ensure Tissot (Correct) has videoUrl and isMostLoved
    const tissot = await Brand.findOne({ name: 'Tissot' });
    if (tissot) {
      await Brand.updateOne({ _id: tissot._id }, {
        $set: {
          isMostLoved: true,
          isPublished: true,
          videoUrl: 'https://res.cloudinary.com/dnrbahpzc/video/upload/v1771778338/TISSOT_Sport_Campaign_1080P_vq21jb.mp4',
          startingPrice: 17000,
          category: 'luxury'
        }
      });
      console.log('\nFinal polish for Tissot: ensured videoUrl, category: luxury and isMostLoved: true.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Consolidation failed:', err);
    process.exit(1);
  }
}

consolidateBrands();
