const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const axios = require("axios");
const sharp = require("sharp");

/** Magento default placeholder JPEG md5 — never upload this as a product photo */
const MAGENTO_PLACEHOLDER_MD5 = "e8be96b92892b36d827e312fc4c4f354";
const PLACEHOLDER_URL_RE =
  /placeholder|placehold\.co|via\.placeholder|\/placeholder\/|catalog\/product\/placeholder|Magento_Catalog\/images\/product\/placeholder/i;
const MIN_SOURCE_BYTES = 8000;

function looksLikePlaceholderUrl(url) {
  return PLACEHOLDER_URL_RE.test(String(url || ""));
}

function isPlaceholderBuffer(buf) {
  if (!buf || buf.length < 100) return true;
  if (buf.length < MIN_SOURCE_BYTES) return true;
  return crypto.createHash("md5").update(buf).digest("hex") === MAGENTO_PLACEHOLDER_MD5;
}

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

  // 3. Never migrate Magento / generic placeholder URLs (they HTTP 200 as tiny JPEGs)
  if (looksLikePlaceholderUrl(url)) {
    console.warn(`⚠️ Skipping placeholder URL (not migrating): ${url.slice(0, 120)}`);
    return "";
  }

  const s3 = getS3Client();
  const bucket = process.env.DO_SPACES_BUCKET;
  const folder = process.env.DO_SPACES_FOLDER || "ims";

  if (!s3 || !bucket) {
    return url;
  }

  try {
    let refererHost = "";
    try {
      refererHost = new URL(url).origin;
    } catch (_) {}

    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        ...(refererHost ? { "Referer": refererHost } : {}),
      },
    });

    const sourceBuf = Buffer.from(response.data);
    if (isPlaceholderBuffer(sourceBuf) || looksLikePlaceholderUrl(response.request?.res?.responseUrl || "")) {
      console.warn(
        `⚠️ Skipping Magento/tiny placeholder body (${sourceBuf.length}b) for ${url.slice(0, 100)}`
      );
      return "";
    }

    console.log(`🛠️ Processing image with sharp (trim, 1:1 pad, white bg, webp)...`);
    // failOn none: some retailer JPEGs are mislabeled / odd containers that sharp rejects by default
    const processedBuffer = await sharp(sourceBuf, { failOn: "none" })
      .trim({ threshold: 60 }) // Increased threshold to handle JPEG noise in grey backgrounds
      .resize(800, 800, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .webp({ quality: 80 })
      .toBuffer();

    // Post-process guard: collapsed near-white webp (~1.7–2KB) = placeholder survived trim
    if (processedBuffer.length < MIN_SOURCE_BYTES) {
      console.warn(
        `⚠️ Skipping post-process tiny buffer (${processedBuffer.length}b) — likely placeholder: ${url.slice(0, 100)}`
      );
      return "";
    }

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
 * Process a local image buffer/file and upload to DigitalOcean Spaces (WebP).
 * @param {Buffer} buffer
 * @returns {Promise<string>} public CDN URL or "" on failure
 */
async function uploadBufferToSpaces(buffer) {
  const s3 = getS3Client();
  const bucket = process.env.DO_SPACES_BUCKET;
  const folder = process.env.DO_SPACES_FOLDER || "ims";
  if (!s3 || !bucket || !buffer || !Buffer.isBuffer(buffer) || buffer.length < 100) {
    return "";
  }

  try {
    const processedBuffer = await sharp(buffer, { failOn: "none" })
      .trim({ threshold: 60 })
      .resize(800, 800, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .webp({ quality: 80 })
      .toBuffer();

    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const fileKey = `${folder}/${uniqueId}.webp`;

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: fileKey,
        Body: processedBuffer,
        ContentType: "image/webp",
        ACL: "public-read",
      })
    );

    const endpointUrl = new URL(process.env.DO_SPACES_ENDPOINT);
    const hostParts = endpointUrl.host.split(".");
    const cdnHost = `${hostParts[0]}.cdn.${hostParts.slice(1).join(".")}`;
    return `https://${bucket}.${cdnHost}/${fileKey}`;
  } catch (err) {
    console.error("❌ Failed to upload buffer to Spaces:", err.message);
    return "";
  }
}

/**
 * Upload a local filesystem image to DigitalOcean Spaces.
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function uploadLocalFileToSpaces(filePath) {
  if (!filePath || typeof filePath !== "string") return "";
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) return "";
  const buffer = fs.readFileSync(abs);
  return uploadBufferToSpaces(buffer);
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

/**
 * Triggers DO Spaces migration in background (non-blocking) for a given product ID
 * @param {string|Object} productId - Product ID
 * @param {Array<string>} images - Array of image URLs
 */
function migrateUrlsToDoSpacesInBackground(productId, images) {
  if (!productId || !Array.isArray(images) || images.length === 0) return;

  // Quick check: does any URL actually need migration?
  const needsMigration = images.some(
    (img) =>
      typeof img === "string" &&
      (img.startsWith("http://") || img.startsWith("https://")) &&
      !img.includes("digitaloceanspaces.com")
  );

  if (!needsMigration) return;

  setImmediate(async () => {
    try {
      const mongoose = require("mongoose");
      const { Product } = require("../models/Product");

      const migrated = await migrateUrlsToDoSpaces(images);
      if (JSON.stringify(migrated) !== JSON.stringify(images)) {
        await Product.updateOne(
          { _id: productId },
          { $set: { images: migrated } }
        );
        console.log(`✅ Background DO Spaces migration completed for product ${productId}`);
      }
    } catch (err) {
      console.error(`❌ Background DO Spaces migration failed for product ${productId}:`, err.message);
    }
  });
}

module.exports = {
  migrateUrlsToDoSpaces,
  migrateUrlsToDoSpacesInBackground,
  uploadUrlToSpaces,
  uploadBufferToSpaces,
  uploadLocalFileToSpaces,
};
