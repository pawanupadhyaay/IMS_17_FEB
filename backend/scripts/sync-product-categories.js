const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });
const { Product } = require('../models/Product');
const { Brand } = require('../models/Brand');

async function sync() {
  try {
    console.log('--- Starting Simplified Category Sync Migration ---');
    await mongoose.connect(process.env.MONGODB_URI);
    
    // 1. Preserve legacy labels (Analog/Digital/Quartz/Automatic) into movement field
    // We do this globally first.
    const legacyTypes = ['Analog', 'Digital', 'Automatic', 'Quartz', 'watch maker'];
    console.log(`Preserving legacy categories ${legacyTypes.items} into movement field...`);
    
    for (const type of legacyTypes) {
      const res = await Product.updateMany(
        { category: type, $or: [{ movement: { $exists: false } }, { movement: "" }, { movement: null }] },
        { $set: { movement: type } }
      );
      if (res.modifiedCount > 0) console.log(`Moved ${res.modifiedCount} [${type}] labels to movement.`);
    }

    // 2. Sync categories from Brand to Product
    const brands = await Brand.find({}).lean();
    console.log(`Processing ${brands.length} brands...`);

    let totalUpdated = 0;
    for (const b of brands) {
      if (!b.category) continue;
      
      const res = await Product.updateMany(
        { brand: new RegExp(`^${b.name}$`, 'i'), category: { $ne: b.category } },
        { $set: { category: b.category } }
      );
      
      if (res.modifiedCount > 0) {
        console.log(`[${b.name}] -> ${b.category} (${res.modifiedCount} products)`);
        totalUpdated += res.modifiedCount;
      }
    }

    console.log(`--- Migration Complete: ${totalUpdated} products updated ---`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

sync();
