const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const BrandSchema = new mongoose.Schema({ name: String, category: String, isPublished: Boolean }, { collection: 'brands' });
const ProductSchema = new mongoose.Schema({ brand: String, inventory: Number, isPublished: Boolean, title: String }, { collection: 'products' });

const Brand = mongoose.model('Brand', BrandSchema);
const Product = mongoose.model('Product', ProductSchema);

async function checkBrands() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const targetBrands = ['Rado', 'Balmain', 'Seiko'];
    
    console.log('--- Brand Database Settings ---');
    const brands = await Brand.find({ name: { $in: targetBrands } });
    brands.forEach(b => {
      console.log(`Brand: ${b.name}, Category: ${b.category}, Published: ${b.isPublished}`);
    });

    console.log('\n--- Product Availability (isPublished: true) ---');
    for (const name of targetBrands) {
      // Check for exact and case-insensitive matches
      const products = await Product.find({ 
        brand: { $regex: new RegExp('^' + name.trim() + '$', 'i') },
        isPublished: true 
      });
      
      const totalInventory = products.reduce((sum, p) => sum + (p.inventory || 0), 0);
      const eligibleCount = products.filter(p => (p.inventory || 0) > 0).length;

      console.log(`Brand: ${name}`);
      console.log(` - Total Products: ${products.length}`);
      console.log(` - Total Inventory: ${totalInventory}`);
      console.log(` - Eligible (Inv > 0): ${eligibleCount}`);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkBrands();
