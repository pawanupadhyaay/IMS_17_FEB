const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const User = require("../models/User");
const Otp = require("../models/Otp");

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

  const testMobile = "9876543210";
  const testEmail = "testmobileotp@gmail.com";

  // Cleanup old test data if any
  console.log("🧹 Cleaning up old test data...");
  await User.deleteMany({ mobile: testMobile });
  await User.deleteMany({ email: testEmail });
  await Otp.deleteMany({ mobile: testMobile });

  console.log("\n--- TEST STEP 1: Generate & Save OTP ---");
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`Generated OTP: ${generatedOtp}`);

  await Otp.create({ mobile: testMobile, otp: generatedOtp });
  console.log("✅ OTP successfully saved to database!");

  console.log("\n--- TEST STEP 2: Verify OTP ---");
  const otpRecord = await Otp.findOne({ mobile: testMobile, otp: generatedOtp });
  if (otpRecord) {
    console.log("✅ OTP record successfully matched in database!");
    await Otp.deleteOne({ _id: otpRecord._id });
    console.log("🧹 Verified OTP deleted successfully!");
  } else {
    throw new Error("❌ OTP record could not be found in database!");
  }

  console.log("\n--- TEST STEP 3: Complete Registration ---");
  // Check if User already exists
  const existingUser = await User.findOne({ mobile: testMobile });
  if (!existingUser) {
    console.log("Phone number is verified and new. Registering user profile...");
    
    // Generate secure random password for database constraints
    const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    
    const user = await User.create({
      name: "Pawan Test User",
      email: testEmail,
      mobile: testMobile,
      password: randomPassword,
      role: "user"
    });

    console.log("🎯 User successfully created in database!");
    console.log(`- ID: ${user._id}`);
    console.log(`- Name: ${user.name}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Mobile: ${user.mobile}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Token Generated: ${user.generateToken() ? "YES" : "NO"}`);
    
    // Cleanup the registered test user
    console.log("\n🧹 Cleaning up test user from database...");
    await User.deleteOne({ _id: user._id });
    console.log("✅ Cleanup successful!");
  } else {
    throw new Error("❌ User already exists before test registration!");
  }

  await mongoose.disconnect();
  console.log("\n🔌 Disconnected from MongoDB. Verification test PASSED!");
}

run().catch(error => {
  console.error("❌ Test Failed:", error);
  mongoose.disconnect().then(() => process.exit(1));
});
