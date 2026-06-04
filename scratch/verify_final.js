const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const { Brand } = require('../backend/models/Brand');
const { Product } = require('../backend/models/Product');
const { getStrictStorefrontFilter } = require('../backend/utils/storeEligibility');

async function verify() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // 1. Get all brand documents for the target luxury brands
    const targets = ['Balmain', 'Rado', 'Seiko', 'Victorinox', 'Tissot', 'Longines'];
    const brandDocs = await Brand.find({ name: { $in: targets } });
    
    console.log('--- Brand Document Settings ---');
    brandDocs.forEach(b => {
      console.log(`Brand: ${b.name}, Category: ${b.category}`);
    });

    // 2. Get active brands based on storefront logic (inventory > 0, etc.)
    const activeBrandNames = await Product.distinct('brand', getStrictStorefrontFilter());
    
    console.log('\n--- Active Brands in Storefront ---');
    const activeBrands = await Brand.find({ name: { $in: activeBrandNames } });
    activeBrands.forEach(b => {
      if (b.category === 'luxury') {
        console.log(`[LUXURY] ${b.name}`);
      } else if (b.category === 'fashion') {
        console.log(`[FASHION] ${b.name}`);
      }
    });

    // 3. Check for specific brands expected by the user
    console.log('\n--- Specific Brand Audit ---');
    for (const name of targets) {
      const isVisible = activeBrandNames.includes(name);
      const doc = brandDocs.find(d => d.name === name);
      console.log(`Brand: ${name}`);
      console.log(` - In Database: ${doc ? 'YES' : 'NO'}`);
      console.log(` - Database Category: ${doc ? doc.category : 'N/A'}`);
      console.log(` - Visible on Storefront: ${isVisible ? 'YES' : 'NO'}`);
      
      if (!isVisible) {
         // Why is it not visible? Check inventory
         const pCount = await Product.countDocuments({ brand: name, ...getStrictStorefrontFilter() });
         console.log(` - Reason for hiding: ${pCount === 0 ? 'No eligible products (0 stock or unpublished)' : 'Unknown logic'}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

verify();
