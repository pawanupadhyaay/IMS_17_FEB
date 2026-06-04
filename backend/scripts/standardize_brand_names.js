const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { Brand } = require('../models/Brand');
const { Product } = require('../models/Product');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function finalStandardization() {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log('--- CONNECTING TO DB ---');

    // Mappings: "Correct Proper Case Name" -> ["Variations to Merge"]
    const mappings = {
      'Movado': ['MOVADO Watches', 'Movado Watch', 'MOVADO'],
      'Rado': ['Rado Watch', 'RADO', 'Rado Watches'],
      'Citizen': ['Citizen Watch', 'CITIZEN', 'Citizen Watches'],
      'Seiko': ['Seiko Watch', 'SEIKO', 'Seiko Watches'],
      'Victorinox': ['Victorinox Watch', 'VICTORINOX'],
      'Tissot': ['Tissot Watch', 'TISSOT', 'Tissot Watches'],
      'Swarovski': ['Swarovski Watch', 'SWAROVSKI Watches'],
      'Skagen': ['Skagen Watch', 'SKAGEN Watches'],
      'Tommy Hilfiger': ['Tommy Hilfiger Watch', 'TOMMY HILFIGER Watches'],
      'Fossil': ['Fossil Watch', 'FOSSIL Watches'],
      'Diesel': ['Diesel Watch', 'DIESEL Watches'],
      'Alba': ['Alba Watch', 'ALBA Watches'],
      'Earnshaw': ['Earnshaw Watch', 'Earnshaw Watches'],
      'Versus': ['Versus Watch', 'Versus Watches']
    };

    // Correct categories
    const categories = {
      'Movado': 'luxury',
      'Rado': 'luxury',
      'Citizen': 'luxury',
      'Seiko': 'luxury',
      'Victorinox': 'luxury',
      'Tissot': 'luxury',
      'Phillip Plein': 'fashion',
      'Swarovski': 'fashion',
      'Skagen': 'fashion',
      'Tommy Hilfiger': 'fashion',
      'Fossil': 'fashion',
      'Diesel': 'fashion',
      'Titan': 'fashion',
      'Timex': 'fashion'
    };

    for (const [correct, variations] of Object.entries(mappings)) {
      console.log(`\nProcessing: "${correct}" [${variations.join(', ')}]`);

      // 1. Authoritative brand document
      let brandDoc = await Brand.findOne({ name: correct });
      if (!brandDoc) {
        brandDoc = await Brand.findOne({ name: { $regex: new RegExp(`^${correct}$`, 'i') } });
      }

      if (brandDoc) {
        // Enforce proper case and category on authoritative doc
        await Brand.updateOne({ _id: brandDoc._id }, {
          $set: {
            name: correct,
            category: categories[correct] || 'fashion',
            isPublished: true
          }
        });

        // 2. Update products
        // We look for any variation OR the correct name itself (case-insensitive) to ensure all match EXACTLY
        const queryStrings = [correct, ...variations];
        const updateResult = await Product.updateMany(
          { brand: { $in: queryStrings.map(s => new RegExp(`^${s}$`, 'i')) } },
          { $set: { brand: correct } }
        );
        console.log(`Updated ${updateResult.modifiedCount} products to EXACT string: "${correct}"`);

        // 3. Delete duplicates
        for (const variation of variations) {
          const varDoc = await Brand.findOne({ name: { $regex: new RegExp(`^${variation}$`, 'i') } });
          if (varDoc && !varDoc._id.equals(brandDoc._id)) {
            await Brand.deleteOne({ _id: varDoc._id });
            console.log(`Deleted redundant brand record: "${variation}" [${varDoc._id}]`);
          }
        }
      } else {
        console.log(`Warning: Authoritative brand "${correct}" NOT FOUND in brands collection. Creating it...`);
        // If it doesn't exist, create it (safe because we also update products)
        const newBrand = await Brand.create({
          name: correct,
          slug: correct.toLowerCase().replace(/\s+/g, '-'),
          category: categories[correct] || 'fashion',
          isPublished: true
        });
        console.log(`Created brand "${correct}" [${newBrand._id}].`);
        
        // Update products to match new brand exactly
        const queryStrings = [correct, ...variations];
        const updateResult = await Product.updateMany(
          { brand: { $in: queryStrings.map(s => new RegExp(`^${s}$`, 'i')) } },
          { $set: { brand: correct } }
        );
        console.log(`Updated ${updateResult.modifiedCount} products to EXACT string: "${correct}"`);
      }
    }

    // Special Case: Ensure Tissot and Movado have videoUrl and isMostLoved
    await Brand.updateOne({ name: 'Movado' }, { $set: { isMostLoved: true, startingPrice: 35000, videoUrl: 'https://res.cloudinary.com/dnrbahpzc/video/upload/v1771778342/Movado_Heritage_Series_Campaign_1080P_y603x2.mp4' } });
    await Brand.updateOne({ name: 'Tissot' }, { $set: { isMostLoved: true, startingPrice: 17000, videoUrl: 'https://res.cloudinary.com/dnrbahpzc/video/upload/v1771778338/TISSOT_Sport_Campaign_1080P_vq21jb.mp4' } });

    console.log('\n--- STANDARDIZATION COMPLETE ---');
    process.exit(0);
  } catch (err) {
    console.error('Standardization failed:', err);
    process.exit(1);
  }
}

finalStandardization();
