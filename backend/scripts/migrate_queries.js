const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const StoreQuery = require("../models/StoreQuery");
const User = require("../models/User");

async function migrate() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Database connected successfully.");

    // Find all users
    const users = await User.find({}, "email mobile");
    console.log(`Found ${users.length} registered users.`);

    let updatedCount = 0;

    for (const user of users) {
      const email = user.email ? user.email.toLowerCase().trim() : null;
      const mobile = user.mobile ? user.mobile.trim() : null;

      const orConditions = [];
      if (email) orConditions.push({ email: email });
      if (mobile) orConditions.push({ mobile: mobile });

      if (orConditions.length === 0) continue;

      // Update all queries matching this user's email/mobile to be "ticket"
      const result = await StoreQuery.updateMany(
        {
          $or: orConditions,
          type: { $ne: "ticket" } // only update if not already a ticket
        },
        {
          $set: {
            type: "ticket",
            user: user._id
          }
        }
      );

      updatedCount += result.modifiedCount;
    }

    console.log(`Migration completed. Updated ${updatedCount} past inquiries to tickets.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
