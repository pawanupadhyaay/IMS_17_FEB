const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function checkFields() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");

    const db = mongoose.connection.db;
    const productsCollection = db.collection('products');

    // Find one Tissot watch
    const product = await productsCollection.findOne({ brand: /tissot/i });
    
    if (product) {
      console.log("Product Keys:", Object.keys(product));
      console.log("Title field:", product.title);
      console.log("Name field:", product.name);
      console.log("Full Product object:", JSON.stringify(product, null, 2));
    } else {
      console.log("No Tissot watch found.");
      // Just print any product
      const anyProd = await productsCollection.findOne({});
      if (anyProd) {
        console.log("Any Product object:", JSON.stringify(anyProd, null, 2));
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkFields();
