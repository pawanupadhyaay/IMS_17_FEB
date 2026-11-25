"use strict";

/**
 * Shared image download helper for enrichment CLIs.
 * Always sniffs magic bytes (SFCC/CDN often serve WebP for *.png / *.jpg URLs).
 */

const fs = require("fs");
const path = require("path");
const { fetchBuffer, sleep, imageExtFromBuffer } = require("./http");

async function downloadProductImages(product, imagesDir, options = {}) {
  const {
    referer = "",
    delayMs = 400,
    log = () => {},
    rootForLog = "",
  } = options;

  const skuDir = path.join(imagesDir, product.sku);
  // Replace prior downloads so wrong/related SKU files cannot linger
  fs.rmSync(skuDir, { recursive: true, force: true });
  fs.mkdirSync(skuDir, { recursive: true });

  const local = [];
  const headers = {
    Accept: "image/jpeg,image/png,image/webp,image/*;q=0.8,*/*;q=0.5",
  };
  if (referer) headers.Referer = referer;

  for (let i = 0; i < (product.images || []).length; i++) {
    const url = product.images[i];
    try {
      const { buffer, contentType } = await fetchBuffer(url, { headers });
      const ext = imageExtFromBuffer(buffer, url, contentType);
      const file = path.join(skuDir, `${String(i + 1).padStart(2, "0")}${ext}`);
      fs.writeFileSync(file, buffer);
      local.push(file);
      log(
        rootForLog
          ? `  saved ${path.relative(rootForLog, file)}`
          : `  saved ${file}`
      );
    } catch (err) {
      console.warn(`  image download failed: ${url} (${err.message})`);
    }
    if (delayMs > 0) await sleep(delayMs);
  }
  return local;
}

module.exports = {
  downloadProductImages,
};
