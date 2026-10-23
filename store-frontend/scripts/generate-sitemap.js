const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const apiUrl = process.env.VITE_API_URL || "http://localhost:5000";
const targetUrl = `${apiUrl}/sitemap.xml`;
const outputPath = path.join(__dirname, "..", "public", "sitemap.xml");

console.log(`📡 Fetching live sitemap from ${targetUrl}...`);

const client = targetUrl.startsWith("https") ? https : http;

client.get(targetUrl, (res) => {
  if (res.statusCode !== 200) {
    console.error(`❌ Failed to fetch sitemap: HTTP ${res.statusCode}`);
    process.exit(1);
  }

  const fileStream = fs.createWriteStream(outputPath);
  res.pipe(fileStream);

  fileStream.on("finish", () => {
    fileStream.close();
    console.log(`✅ Sitemap successfully generated and saved to ${outputPath}`);
  });
}).on("error", (err) => {
  console.error("❌ Error fetching sitemap:", err.message);
  process.exit(1);
});
