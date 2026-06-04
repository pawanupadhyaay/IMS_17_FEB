const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load backend env variables
dotenv.config({ path: path.join(__dirname, "../.env") });

async function countAssets() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error("❌ MONGODB_URI is not defined in .env");
      process.exit(1);
    }

    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("✅ Connected successfully!");

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`📂 Found ${collections.length} collections. Analyzing for Cloudinary assets...\n`);

    let totalCount = 0;
    const report = [];

    for (const col of collections) {
      const name = col.name;
      const collection = db.collection(name);
      
      // Get all documents
      const docs = await collection.find({}).toArray();
      let matchCount = 0;

      for (const doc of docs) {
        // Stringify the entire document and look for Cloudinary domain
        const str = JSON.stringify(doc);
        if (str.includes("res.cloudinary.com") || str.includes("cloudinary.com")) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        totalCount += matchCount;
        report.push({
          Collection: name,
          "Total Docs": docs.length,
          "Cloudinary Docs": matchCount,
          Percentage: ((matchCount / docs.length) * 100).toFixed(1) + "%"
        });
      }
    }

    console.log("=== CLOUDINARY ASSETS SCAN REPORT ===");
    console.table(report);
    console.log(`\n🎉 Total documents containing Cloudinary assets: ${totalCount}`);
    
    // Deep-dive on Products
    const productsCol = db.collection("products");
    const products = await productsCol.find({}).toArray();
    let productImagesCount = 0;
    let productsWithCloudinary = 0;
    const matchedProducts = [];

    for (const p of products) {
      if (Array.isArray(p.images)) {
        const hasCloudinary = p.images.some(img => img && (img.includes("res.cloudinary.com") || img.includes("cloudinary.com")));
        if (hasCloudinary) {
          productsWithCloudinary++;
          const clImages = p.images.filter(img => img && (img.includes("res.cloudinary.com") || img.includes("cloudinary.com")));
          productImagesCount += clImages.length;
          matchedProducts.push({
            id: p._id,
            brand: p.brand,
            sku: p.sku || 'N/A',
            title: p.title,
            cloudinaryUrls: clImages.join(', ')
          });
        }
      }
    }

    console.log("\n--- Product Images Breakdown ---");
    console.log(`- Total watches in database: ${products.length}`);
    console.log(`- Watches containing Cloudinary image URLs: ${productsWithCloudinary}`);
    console.log(`- Total Cloudinary image URLs saved inside watches: ${productImagesCount}`);
    if (matchedProducts.length > 0) {
      console.log("\n📝 Detailed List of Affected Watches:");
      console.table(matchedProducts);
    }

    // Deep-dive on Brands
    const brandsCol = db.collection("brands");
    if (brandsCol) {
      const brands = await brandsCol.find({}).toArray();
      let brandsWithCloudinary = 0;
      const matchedBrands = [];

      for (const b of brands) {
        const str = JSON.stringify(b);
        if (str.includes("cloudinary.com")) {
          brandsWithCloudinary++;
          matchedBrands.push({
            id: b._id,
            name: b.name,
            logoCloudinary: b.logo && b.logo.includes("cloudinary.com") ? b.logo : 'No',
            videoCloudinary: b.videoUrl && b.videoUrl.includes("cloudinary.com") ? b.videoUrl : 'No'
          });
        }
      }
      console.log("\n--- Brands Breakdown ---");
      console.log(`- Total brands: ${brands.length}`);
      console.log(`- Brands with Cloudinary logos/videos: ${brandsWithCloudinary}`);
      if (matchedBrands.length > 0) {
        console.log("\n📝 Detailed List of Affected Brands:");
        console.table(matchedBrands);
      }
    }

    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB.");
  } catch (err) {
    console.error("❌ Error running script:", err);
  }
}

countAssets();
