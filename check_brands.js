const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

async function checkBrands() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const { Brand } = require('./backend/models/Brand');
    const { Product } = require('./backend/models/Product');

    const brandsToCheck = [
      'Boss', 'DW', 'Just Cavalli', 'Longines', 'Movado', 'Phillip Plein', // Should be visible
      'Bering', 'Logues', 'Obaku', 'Versus' // Should be hidden
    ];

    console.log('--- Brand and Product Status ---');
    for (const name of brandsToCheck) {
      const brandDoc = await Brand.findOne({ name: new RegExp('^' + name + '$', 'i') });
      const totalProducts = await Product.countDocuments({ brand: new RegExp('^' + name + '$', 'i') });
      const publishedProducts = await Product.countDocuments({ 
        brand: new RegExp('^' + name + '$', 'i'),
        isPublished: true 
      });
      const inStockProducts = await Product.countDocuments({ 
        brand: new RegExp('^' + name + '$', 'i'),
        isPublished: true,
        inventory: { $gt: 0 }
      });
      
      // Strict check: title and image
      const validProducts = await Product.countDocuments({ 
        brand: new RegExp('^' + name + '$', 'i'),
        isPublished: true,
        inventory: { $gt: 0 },
        title: { $exists: true, $regex: /\S/ },
        $or: [
          { images: { $exists: true, $type: "array", $elemMatch: { $type: "string", $regex: /\S/ } } },
          { images: { $exists: true, $type: "array", $elemMatch: { url: { $exists: true, $regex: /\S/ } } } },
          { imageUrl: { $exists: true, $regex: /\S/ } },
          { "image.url": { $exists: true, $regex: /\S/ } }
        ]
      });

      console.log(JSON.stringify({
        name,
        brandExists: !!brandDoc,
        brandPublished: brandDoc?.isPublished,
        totalProducts,
        publishedProducts,
        inStockProducts,
        validProducts
      }, null, 2));
    }

    mongoose.connection.close();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkBrands();
