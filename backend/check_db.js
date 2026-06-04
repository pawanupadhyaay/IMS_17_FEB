const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Order = require('./models/Order');
  const Product = require('./models/Product');
  const User = require('./models/User');

  console.log("\n--- EXECUTING DASHBOARD STATS LOGIC ---");
  try {
    const totalOrders = await Order.countDocuments();
    console.log("totalOrders:", totalOrders);

    const activeProductsCount = await Product.countDocuments({ isAvailable: true });
    console.log("activeProductsCount (isAvailable):", activeProductsCount);

    const activeProductsPublished = await Product.countDocuments({ isPublished: true });
    console.log("activeProductsPublished (isPublished):", activeProductsPublished);

    const liveUsers = await User.countDocuments(); 
    console.log("liveUsers:", liveUsers);
    
    const orders = await Order.find();
    console.log("orders count:", orders.length);

    const totalRevenueAmount = orders.reduce((acc, order) => acc + (order.totalAmount || 0), 0);
    console.log("totalRevenue (totalAmount):", totalRevenueAmount);

    const totalRevenueReal = orders.reduce((acc, order) => acc + (order.total || 0), 0);
    console.log("totalRevenue (total):", totalRevenueReal);

    const lowStockCount = await Product.countDocuments({ stock: { $lt: 10 } });
    console.log("lowStockCount (stock):", lowStockCount);

    const lowStockCountInventory = await Product.countDocuments({ inventory: { $lt: 10 } });
    console.log("lowStockCount (inventory):", lowStockCountInventory);

    console.log("Dashboard stats calculated successfully!");
  } catch (error) {
    console.error("Error calculating stats:", error);
  }

  console.log("\n--- EXECUTING RECENT ORDERS LOGIC ---");
  try {
    const orders = await Order.find()
      .populate('user', 'name email mobile')
      .populate('items.product', 'title slug')
      .sort('-createdAt')
      .limit(5);
    console.log("Fetched orders count:", orders.length);
    if (orders.length > 0) {
      console.log("Sample order:", JSON.stringify(orders[0], null, 2));
    }
  } catch (error) {
    console.error("Error fetching orders:", error);
  }

  process.exit(0);
};

run();
