const dotenv = require("dotenv");
const path = require("path");

// Load backend env variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const { migrateUrlsToDoSpaces } = require("../utils/doSpacesImageMigrator");

async function runTest() {
  console.log("🚀 Starting DigitalOcean Spaces Asset Migrator connection test...");
  console.log(`- Endpoint: ${process.env.DO_SPACES_ENDPOINT}`);
  console.log(`- Bucket: ${process.env.DO_SPACES_BUCKET}`);
  console.log(`- Folder: ${process.env.DO_SPACES_FOLDER}`);
  console.log(`- Key ID: ${process.env.DO_SPACES_KEY ? "CONFIGURED" : "MISSING"}`);
  console.log(`- Secret Key: ${process.env.DO_SPACES_SECRET ? "CONFIGURED" : "MISSING"}`);

  // We will try migrating a simple sample public image URL
  const testImageUrl = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop&q=60";
  console.log(`\n⏳ Attempting to download and upload: ${testImageUrl}`);
  
  try {
    const results = await migrateUrlsToDoSpaces([testImageUrl]);
    console.log("\n🏁 Test Results:");
    console.log("- Input array:", [testImageUrl]);
    console.log("- Output array:", results);
    
    if (results[0] && results[0].includes("digitaloceanspaces.com")) {
      console.log("\n🎉 SUCCESS! DigitalOcean Spaces upload is fully working and public URL has been generated!");
    } else {
      console.log("\n❌ FAILED. Output did not return a DigitalOcean Spaces URL.");
    }
  } catch (err) {
    console.error("\n❌ CRITICAL ERROR running test:", err);
  }
}

runTest();
