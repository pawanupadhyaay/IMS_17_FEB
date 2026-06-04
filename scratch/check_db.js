const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../backend/.env") });

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/ims");
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const run = async () => {
  await connectDB();
  const ProductSchema = new mongoose.Schema({}, { strict: false });
  const Product = mongoose.model("Product", ProductSchema, "products");
  
  const products = await Product.find({}).select("title brand sku category price");
  console.log("\n--- PRODUCTS IN DB ---");
  products.forEach(p => {
    console.log(`ID: ${p._id} | Title: "${p.get('title')}" | Brand: "${p.get('brand')}" | Price: ${p.get('price')}`);
  });
  
  const OrderSchema = new mongoose.Schema({}, { strict: false });
  const Order = mongoose.model("Order", OrderSchema, "orders");
  const orders = await Order.find({}).sort({ createdAt: -1 }).limit(2);
  console.log("\n--- RECENT ORDERS ---");
  orders.forEach(o => {
    console.log(`OrderNum: ${o.get('orderNumber')} | Items:`, o.get('items'));
  });

  process.exit(0);
};

run();
