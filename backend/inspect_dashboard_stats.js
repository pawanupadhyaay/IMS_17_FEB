const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const DashboardStatsSchema = new mongoose.Schema({}, { strict: false });
const DashboardStats = mongoose.model("DashboardStats", DashboardStatsSchema, "dashboardstats");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI not found!");
    process.exit(1);
  }
  await mongoose.connect(uri);

  const stats = await DashboardStats.findOne();
  console.log("=== DASHBOARD STATS IN DATABASE ===");
  console.log(JSON.stringify(stats, null, 2));

  await mongoose.disconnect();
}

main().catch(err => {
  console.error("Error:", err);
  mongoose.disconnect();
});
