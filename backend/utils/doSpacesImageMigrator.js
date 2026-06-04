const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const axios = require("axios");
const sharp = require("sharp");

// Initialize S3 client for DigitalOcean Spaces
let s3Client = null;

function getS3Client() {
  if (s3Client) return s3Client;

  const key = process.env.DO_SPACES_KEY;
  const secret = process.env.DO_SPACES_SECRET;
  const endpoint = process.env.DO_SPACES_ENDPOINT;
  const bucket = process.env.DO_SPACES_BUCKET;

  if (!key || !secret || !endpoint || !bucket) {
    console.warn("⚠️ DigitalOcean Spaces environment variables are not fully configured. Asset migration is disabled.");
    return null;
  }

  try {
    s3Client = new S3Client({
      endpoint: endpoint,
      region: "us-east-1", // DigitalOcean requires a dummy region or standard S3 region
      credentials: {
        accessKeyId: key,
        secretAccessKey: secret,
      },
    });
    return s3Client;
  } catch (err) {
    console.error("❌ Failed to initialize DigitalOcean S3 Client:", err);
    return null;
  }
}

function getExtensionFromMimeType(mimeType) {
  const map = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
  };
  return map[mimeType] || ".jpg";
}

/**
 * Downloads an image from an external URL and uploads it to DigitalOcean Spaces
 * @param {string} url - External image URL
 * @returns {Promise<string>} - New DO Spaces public URL or original URL if skipped/failed
 */
async function uploadUrlToSpaces(url) {
  if (!url || typeof url !== "string") return "";

  // 1. Skip if already a DigitalOcean Spaces URL
  if (url.includes("digitaloceanspaces.com")) {
    return url;
  }

  // 2. Skip if it is not an external HTTP/HTTPS link
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return url;
  }

  const s3 = getS3Client();
  const bucket = process.env.DO_SPACES_BUCKET;
  const folder = process.env.DO_SPACES_FOLDER || "ims";

  if (!s3 || !bucket) {
    return url;
  }

  try {
    console.log(`📥 Downloading image: ${url}`);
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000, // 10 second timeout
    });

    console.log(`🛠️ Processing image with sharp (trim, 1:1 pad, white bg, webp)...`);
    const processedBuffer = await sharp(Buffer.from(response.data))
      .trim({ threshold: 60 }) // Increased threshold to handle JPEG noise in grey backgrounds
      .resize(800, 800, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .webp({ quality: 80 })
      .toBuffer();

    const mimeType = "image/webp";
    const ext = ".webp";
    
    // Generate a secure, unique filename under the folder
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const fileKey = `${folder}/${uniqueId}${ext}`;

    console.log(`📤 Uploading processed WebP to Spaces: ${fileKey}`);
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: fileKey,
        Body: processedBuffer,
        ContentType: mimeType,
        ACL: "public-read",
      })
    );

    // Parse the endpoint to construct the correct public CDN URL
    const endpointUrl = new URL(process.env.DO_SPACES_ENDPOINT);
    const hostParts = endpointUrl.host.split('.');
    // Insert 'cdn' after the region (e.g., sgp1.cdn.digitaloceanspaces.com)
    const cdnHost = `${hostParts[0]}.cdn.${hostParts.slice(1).join('.')}`;
    const publicUrl = `https://${bucket}.${cdnHost}/${fileKey}`;
    
    console.log(`✅ Asset migrated: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error(`❌ Failed to migrate URL (${url}):`, err.message);
    // Fallback to original URL on failure so the save operation succeeds
    return url;
  }
}

/**
 * Iterates through an array of image URLs and migrates any external ones to DO Spaces
 * @param {Array<string>} images - Array of image URLs
 * @returns {Promise<Array<string>>} - Array of migrated URLs
 */
async function migrateUrlsToDoSpaces(images) {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return images || [];
  }

  console.log(`🔄 Checking ${images.length} images for DO Spaces migration...`);
  
  // Process all uploads in parallel
  const uploadPromises = images.map((img) => uploadUrlToSpaces(img));
  const results = await Promise.all(uploadPromises);
  
  // Return the resolved list, filtering out empty strings
  return results.filter(Boolean);
}

module.exports = {
  migrateUrlsToDoSpaces,
  uploadUrlToSpaces,
};
