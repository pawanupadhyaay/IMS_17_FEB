const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load backend env variables
dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is not defined");
    process.exit(1);
  }

  console.log("🔄 Connecting to MongoDB...");
  await mongoose.connect(uri);
  console.log("✅ Connected successfully!");

  const db = mongoose.connection.db;
  
  // List all collections to find where orders are stored
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map(c => c.name);
  console.log("Available collections:", collectionNames);

  const ordersColName = "orders";
  const ordersCol = db.collection(ordersColName);

  const totalOrders = await ordersCol.countDocuments();
  console.log(`\n📊 Total Orders in "${ordersColName}" collection: ${totalOrders}`);

  if (totalOrders > 0) {
    console.log("\n📋 Sample of 5 recent orders:");
    const samples = await ordersCol.find().sort({ createdAt: -1 }).limit(5).toArray();
    samples.forEach(o => {
      console.log(`- OrderNumber: ${o.orderNumber}, CreatedAt: ${o.createdAt}, Name: ${o.shippingAddress?.name || 'N/A'}, Total: ${o.total}, Items: ${JSON.stringify(o.items?.map(i => i.name))}`);
    });
  }

  console.log("\n🔍 Searching for partial customer name 'Martin' or 'Abner'...");
  const orderByCustomer = await ordersCol.find({
    $or: [
      { "shippingAddress.name": { $regex: /Martin/i } },
      { "shippingAddress.fullName": { $regex: /Martin/i } },
      { "shippingAddress.name": { $regex: /Abner/i } }
    ]
  }).toArray();
  console.log(`Matches by partial Name (${orderByCustomer.length}):`, JSON.stringify(orderByCustomer, null, 2));

  console.log("\n🔍 Searching for any item with SKU 'SRPB41J1' or containing 'SRPB'...");
  const orderBySKU = await ordersCol.find({
    $or: [
      { "items.sku": { $regex: /SRPB/i } },
      { "items.name": { $regex: /SRPB/i } },
      { "items.productId": { $regex: /SRPB/i } }
    ]
  }).toArray();
  console.log(`Matches by SKU (${orderBySKU.length}):`, JSON.stringify(orderBySKU, null, 2));

  console.log("\n🔍 Searching for orderNumber ending in '10328' or containing '10328'...");
  const orderByNum = await ordersCol.find({
    orderNumber: { $regex: /10328/ }
  }).toArray();
  console.log(`Matches by orderNumber containing 10328 (${orderByNum.length}):`, JSON.stringify(orderByNum, null, 2));

  await mongoose.disconnect();
  console.log("\n🔌 Disconnected from MongoDB.");
}

run().catch(console.error);
