#!/usr/bin/env node
"use strict";

/**
 * Staff-safe: TWEG* SKUs wrongly branded Titan → Timex (exact Brands.name).
 * Only updates when brand is Titan (case-insensitive) and SKU matches /^TWEG/i.
 * Does NOT publish. Logs every change.
 *
 *   node scripts/enrichment/fix-tweg-brand-to-timex.js
 *   node scripts/enrichment/fix-tweg-brand-to-timex.js --dry-run
 */

const path = require("path");
const { createRequire } = require("module");

const ROOT = path.join(__dirname, "../..");
const BACKEND_ROOT = path.join(ROOT, "backend");
const backendRequire = createRequire(path.join(BACKEND_ROOT, "package.json"));

backendRequire("dotenv").config({ path: path.join(BACKEND_ROOT, ".env") });

const mongoose = backendRequire("mongoose");
const { Product } = backendRequire("./models/Product");
const { Brand } = backendRequire("./models/Brand");
const { generateProductSlug } = backendRequire("./utils/slugify");

const dryRun = process.argv.includes("--dry-run");
const TARGET_BRAND = "Timex";
const WRONG_BRAND_RE = /^titan$/i;
const TWEG_SKU_RE = /^TWEG/i;

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI missing in backend/.env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("mongo_host", mongoose.connection.host);

  const brandDoc = await Brand.findOne({
    name: new RegExp(`^${TARGET_BRAND}$`, "i"),
  })
    .select("name category")
    .lean();

  if (!brandDoc || brandDoc.name !== TARGET_BRAND) {
    console.error(
      JSON.stringify({
        error: "Timex brand missing or name mismatch in Brands collection",
        found: brandDoc || null,
        expectedExact: TARGET_BRAND,
      })
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      brandsName: brandDoc.name,
      category: brandDoc.category || null,
      dryRun,
      publish: false,
    })
  );

  // All unpublished TWEG* (and any published — still fix wrong Titan brand)
  const candidates = await Product.find({
    sku: TWEG_SKU_RE,
  })
    .select("_id sku brand category isPublished slug title")
    .lean();

  const log = [];
  let updated = 0;
  let skippedOk = 0;
  let skippedOtherBrand = 0;

  for (const doc of candidates) {
    const sku = String(doc.sku || "").trim();
    const brand = String(doc.brand || "").trim();

    if (!TWEG_SKU_RE.test(sku)) continue;

    if (brand === TARGET_BRAND) {
      skippedOk += 1;
      log.push({
        sku,
        action: "skip",
        reason: "already_Timex",
        brand,
        isPublished: doc.isPublished,
      });
      continue;
    }

    if (!WRONG_BRAND_RE.test(brand)) {
      skippedOtherBrand += 1;
      log.push({
        sku,
        action: "skip",
        reason: "brand_not_Titan_leave_alone",
        brand: brand || "(empty)",
        isPublished: doc.isPublished,
      });
      continue;
    }

    const nextSlug = generateProductSlug(TARGET_BRAND, sku);
    const change = {
      sku,
      action: dryRun ? "would_update" : "updated",
      fromBrand: brand,
      toBrand: TARGET_BRAND,
      fromSlug: doc.slug || null,
      toSlug: nextSlug,
      isPublished: Boolean(doc.isPublished),
      title: doc.title || "",
      _id: String(doc._id),
    };

    if (!dryRun) {
      await Product.updateOne(
        { _id: doc._id },
        {
          $set: {
            brand: TARGET_BRAND,
            slug: nextSlug,
            // Keep fashion category aligned with Timex Brands.category when empty
            ...(brandDoc.category &&
            (!doc.category || String(doc.category).trim() === "")
              ? { category: brandDoc.category }
              : {}),
          },
        }
      );
    }

    updated += 1;
    log.push(change);
    console.log(
      `  ${sku}: ${brand} → ${TARGET_BRAND}${dryRun ? " (dry-run)" : ""} | published=${Boolean(doc.isPublished)}`
    );
  }

  const summary = {
    twegFound: candidates.length,
    updated,
    skippedAlreadyTimex: skippedOk,
    skippedOtherBrand,
    dryRun,
    changes: log.filter((r) => r.action === "updated" || r.action === "would_update"),
    allLog: log,
  };

  console.log(JSON.stringify(summary, null, 2));
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
