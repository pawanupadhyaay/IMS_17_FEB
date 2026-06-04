const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const BrandSchema = new mongoose.Schema({ name: String, category: String }, { collection: 'brands' });
const Brand = mongoose.model('Brand', BrandSchema);

async function updateBrands() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('--- Updating Luxury Brands ---');

    // 1. Balmain Fix
    const resBalmain = await Brand.updateOne(
      { name: 'Balmain New Watch' }, 
      { $set: { name: 'Balmain', category: 'luxury' } }
    );
    console.log(`Balmain Update: ${resBalmain.modifiedCount} doc(s) modified.`);

    // 2. Rado Fix
    const resRado = await Brand.updateOne(
      { name: 'Rado' }, 
      { $set: { category: 'luxury' } }
    );
    console.log(`Rado Update: ${resRado.modifiedCount} doc(s) modified.`);

    // 3. Seiko Fix (ensure it is luxury)
    const resSeiko = await Brand.updateOne(
      { name: 'Seiko' }, 
      { $set: { category: 'luxury' } }
    );
    console.log(`Seiko Update: ${resSeiko.modifiedCount} doc(s) modified.`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

updateBrands();
