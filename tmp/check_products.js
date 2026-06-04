const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../backend/.env") });

const productSchema = new mongoose.Schema({
  brand: String,
  title: String,
  images: [String],
  image: { url: String },
  imageUrl: String
}, { strict: false });

const Product = mongoose.model("Product", productSchema);

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const products = await Product.find({}).limit(5).lean();
    console.log("Found products:", JSON.stringify(products, null, 2));

    await mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

check();
