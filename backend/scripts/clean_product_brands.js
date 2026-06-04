const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { Product } = require('../models/Product');

dotenv.config({ path: path.join(__dirname, '../.env') });

function toTitleCase(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function cleanBrands() {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log('--- CONNECTING TO DB ---');

    const products = await Product.find({}).select('brand').lean();
    console.log(`Found ${products.length} products total.`);

    let updateCount = 0;
    const batchSize = 100;
    let currentBatch = [];

    for (const prod of products) {
      if (!prod.brand) continue;

      // Remove " Watch", " Watches", " New Watch" suffixes (case-insensitive)
      let cleanName = prod.brand
        .replace(/\s+(New\s+)?Watches?$/i, '')
        .trim();

      // Enforce proper title case
      cleanName = toTitleCase(cleanName);

      // Manual overrides for specific brands if needed (e.g. DKNY, Fossil)
      if (cleanName.toLowerCase() === 'dkny') cleanName = 'DKNY';

      if (cleanName !== prod.brand) {
        currentBatch.push({
          updateOne: {
            filter: { _id: prod._id },
            update: { $set: { brand: cleanName } }
          }
        });
        updateCount++;
      }

      if (currentBatch.length >= batchSize) {
        await Product.bulkWrite(currentBatch);
        currentBatch = [];
        process.stdout.write(`.`);
      }
    }

    if (currentBatch.length > 0) {
      await Product.bulkWrite(currentBatch);
    }

    console.log(`\n✅ Cleaned ${updateCount} product brand names.`);
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

cleanBrands();
