const mongoose = require('mongoose');
require('dotenv').config();

const brandSchema = new mongoose.Schema({ name: String, category: String, slug: String });
const Brand = mongoose.model('Brand', brandSchema);

async function update() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ims_17_feb');
    
    // Reset all to fashion
    await Brand.updateMany({}, { category: 'fashion' });
    
    // Set specific luxury ones
    const luxuryNames = ['seiko', 'victorinox', 'tissot'];
    for(const name of luxuryNames) {
      await Brand.updateMany({ name: new RegExp(name, 'i') }, { category: 'luxury' });
    }
    
    console.log('Successfully updated categories to match IMS');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

update();
