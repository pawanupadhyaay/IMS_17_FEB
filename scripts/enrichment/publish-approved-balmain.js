#!/usr/bin/env node
"use strict";

/**
 * Retrofit: publish Balmain SKUs from the approved batch that already have
 * title + ≥1 image but isPublished=false.
 *
 *   node scripts/enrichment/publish-approved-balmain.js
 *   node scripts/enrichment/publish-approved-balmain.js --dry-run
 *
 * Policy: "Approved enrichment ⇒ isPublished true immediately (sold-out allowed)."
 * Does not scrape. Does not print secrets.
 */

const path = require("path");
const fs = require("fs");
const { createRequire } = require("module");

const ROOT = path.join(__dirname, "../..");
const BACKEND_ROOT = path.join(ROOT, "backend");
const backendRequire = createRequire(path.join(BACKEND_ROOT, "package.json"));

backendRequire("dotenv").config({ path: path.join(BACKEND_ROOT, ".env") });

const mongoose = backendRequire("mongoose");
const { Product } = backendRequire("./models/Product");
const {
  hasMinimalStorefrontData,
} = backendRequire("./utils/storeEligibility");
const {
  PUBLISH_ON_APPROVE_POLICY,
} = require("./lib/publishOnApprove");
const balmain = require("./brands/balmain");

const BATCH_CANDIDATES = [
  path.join(__dirname, "output/balmain-batch-archived/products.json"),
  path.join(__dirname, "output/balmain-batch/products.json"),
];

const dryRun = process.argv.includes("--dry-run");

function balmainSkuKey(raw) {
  try {
    return balmain.normalizeSku(raw).compact;
  } catch {
    return String(raw || "")
      .trim()
      .toUpperCase()
      .replace(/[.\-_\s]/g, "");
  }
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function loadOkSkus() {
  for (const p of BATCH_CANDIDATES) {
    if (!fs.existsSync(p)) continue;
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    const list = Array.isArray(raw) ? raw : raw.products || [];
    return {
      path: p,
      skus: list
        .filter((x) => x && x.status === "ok" && x.sku)
        .map((x) => String(x.sku).trim()),
    };
  }
  return null;
}

async function findBalmainProduct(sku) {
  const direct = await Product.findOne({
    sku: new RegExp(`^${escapeRegex(sku)}$`, "i"),
  });
  if (direct) return direct;
  const key = balmainSkuKey(sku);
  const candidates = await Product.find({ brand: /^balmain$/i }).select(
    "_id sku"
  );
  const hit = candidates.find((p) => balmainSkuKey(p.sku) === key);
  if (!hit) return null;
  return Product.findById(hit._id);
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI missing in backend/.env");
    process.exit(1);
  }

  const batch = loadOkSkus();
  if (!batch) {
    console.error("No balmain batch products.json found");
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      batchPath: path.relative(ROOT, batch.path),
      skus: batch.skus.length,
      dryRun,
      policy: PUBLISH_ON_APPROVE_POLICY,
    })
  );

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("mongo_host", mongoose.connection.host);

  const summary = {
    matched: 0,
    alreadyPublished: 0,
    publishedNow: 0,
    ineligible: [],
    missing: [],
    errors: [],
  };

  for (const sku of batch.skus) {
    try {
      const doc = await findBalmainProduct(sku);
      if (!doc) {
        summary.missing.push(sku);
        console.log(`  ${sku}: MISSING`);
        continue;
      }
      summary.matched += 1;

      if (doc.isPublished === true) {
        summary.alreadyPublished += 1;
        console.log(`  ${sku}: already published`);
        continue;
      }

      if (!hasMinimalStorefrontData(doc)) {
        summary.ineligible.push(sku);
        console.log(`  ${sku}: skip (need title + image)`);
        continue;
      }

      if (dryRun) {
        summary.publishedNow += 1;
        console.log(`  ${sku}: DRY publish (inv=${doc.inventory ?? 0})`);
        continue;
      }

      await Product.findByIdAndUpdate(
        doc._id,
        { $set: { isPublished: true } },
        { new: true, runValidators: true }
      );
      summary.publishedNow += 1;
      console.log(`  ${sku}: published (inv=${doc.inventory ?? 0})`);
    } catch (err) {
      summary.errors.push({ sku, message: err.message || String(err) });
      console.error(`  ${sku}: ERROR ${err.message}`);
    }
  }

  await mongoose.disconnect();
  console.log(JSON.stringify({ summary }, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
