const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { Brand } = require('../models/Brand');
const { Product } = require('../models/Product');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function finalCleanup() {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log('--- CONNECTING TO DB ---');

    // List of authoritative brands and their correct category
    const authoritativeBrands = [
      { name: 'Movado', category: 'luxury' },
      { name: 'Rado', category: 'luxury' },
      { name: 'Citizen', category: 'luxury' }, // Usually premium/luxury in this context
      { name: 'Seiko', category: 'luxury' },
      { name: 'Victorinox', category: 'luxury' },
      { name: 'Tissot', category: 'luxury' },
      { name: 'Phillip Plein', category: 'fashion' },
      { name: 'Roberto Cavalli', category: 'fashion' },
      { name: 'Swarovski', category: 'fashion' },
      { name: 'Skagen', category: 'fashion' },
      { name: 'Tommy Hilfiger', category: 'fashion' },
      { name: 'Fossil', category: 'fashion' },
      { name: 'Diesel', category: 'fashion' },
      { name: 'Titan', category: 'fashion' },
      { name: 'Timex', category: 'fashion' }
    ];

    for (const item of authoritativeBrands) {
      console.log(`\nProcessing: "${item.name}"`);

      // 1. Authoritative brand string
      const mainName = item.name;
      const watchSuffixName = `${item.name} Watch`;

      // 2. Find/Create authoritative brand
      let brandDoc = await Brand.findOne({ name: mainName });
      if (!brandDoc) {
        brandDoc = await Brand.findOne({ name: { $regex: new RegExp(`^${mainName}$`, 'i') } });
      }

      const duplicateDoc = await Brand.findOne({ name: { $regex: new RegExp(`^${watchSuffixName}$`, 'i') } });

      if (brandDoc) {
        // Correct the authoritative brand record
        await Brand.updateOne({ _id: brandDoc._id }, {
          $set: {
            category: item.category,
            isPublished: true
          }
        });
        console.log(`Authoritative brand "${brandDoc.name}" updated with category: ${item.category}.`);

        // 3. Update products
        // We update all products with either the main name (to ensure clean string) OR the suffix name
        const prodUpdate = await Product.updateMany(
          { brand: { $in: [new RegExp(`^${mainName}$`, 'i'), new RegExp(`^${watchSuffixName}$`, 'i')] } },
          { $set: { brand: mainName } }
        );
        console.log(`Updated ${prodUpdate.modifiedCount} products to brand: "${mainName}".`);

        // 4. Delete duplicates if they exist
        if (duplicateDoc && !duplicateDoc._id.equals(brandDoc._id)) {
          await Brand.deleteOne({ _id: duplicateDoc._id });
          console.log(`Deleted redundant brand record: "${watchSuffixName}" [${duplicateDoc._id}].`);
        }
      } else {
        console.log(`Notice: Brand "${mainName}" not found in brands collection.`);
      }
    }

    // Special verification for Movado and Tissot videos/isMostLoved
    await Brand.updateOne({ name: 'Movado' }, { $set: { isMostLoved: true, startingPrice: 35000, videoUrl: 'https://res.cloudinary.com/dnrbahpzc/video/upload/v1771778342/Movado_Heritage_Series_Campaign_1080P_y603x2.mp4' } });
    await Brand.updateOne({ name: 'Tissot' }, { $set: { isMostLoved: true, startingPrice: 17000, videoUrl: 'https://res.cloudinary.com/dnrbahpzc/video/upload/v1771778338/TISSOT_Sport_Campaign_1080P_vq21jb.mp4' } });

    console.log('\n--- CLEANUP COMPLETE ---');
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

finalCleanup();
