#!/usr/bin/env node
"use strict";

/**
 * One-shot: staff-wins fill-empty merge of balmain-batch scrape → IMS Mongo,
 * then mark brand approved and publish eligible SKUs immediately.
 *
 *   node scripts/enrichment/apply-balmain-batch.js
 *   node scripts/enrichment/apply-balmain-batch.js --dry-run
 *   node scripts/enrichment/apply-balmain-batch.js --no-publish
 *
 * Policy: "Approved enrichment ⇒ isPublished true immediately (sold-out allowed)."
 * --publish is DEFAULT ON for this approval apply (opt out with --no-publish).
 * Does NOT force-overwrite staff fields.
 * Reads MONGODB_URI from backend/.env (never prints it).
 */

const path = require("path");
const fs = require("fs");
const { createRequire } = require("module");

const ROOT = path.join(__dirname, "../..");
const BACKEND_ROOT = path.join(ROOT, "backend");
const backendRequire = createRequire(path.join(BACKEND_ROOT, "package.json"));

const BATCH_CANDIDATES = [
  path.join(__dirname, "output/balmain-batch/products.json"),
  path.join(__dirname, "output/balmain-batch-archived/products.json"),
];

backendRequire("dotenv").config({ path: path.join(BACKEND_ROOT, ".env") });

const mongoose = backendRequire("mongoose");
const { Product } = backendRequire("./models/Product");
const { generateProductSlug } = backendRequire("./utils/slugify");
const {
  mergeProductFields,
  scrapedToIncoming,
} = require("./lib/merge");
const { normalizeGender } = require("./lib/gender");
const {
  PUBLISH_ON_APPROVE_POLICY,
  resolvePublishFlag,
  applyPublishOnApprove,
} = require("./lib/publishOnApprove");
const balmain = require("./brands/balmain");

const OUTPUT_ROOT = path.join(__dirname, "output");
const APPROVED_PATH = path.join(OUTPUT_ROOT, "review-approved.json");
const BRAND_ID = "balmain";

const dryRun = process.argv.includes("--dry-run");

function loadApprovedBrands() {
  if (!fs.existsSync(APPROVED_PATH)) return new Set();
  try {
    const prev = JSON.parse(fs.readFileSync(APPROVED_PATH, "utf8"));
    return new Set((prev.brands || []).map((b) => String(b).toLowerCase()));
  } catch {
    return new Set();
  }
}

const brandAlreadyApproved = loadApprovedBrands().has(BRAND_ID);
const publish = resolvePublishFlag(process.argv, {
  brandApproved: brandAlreadyApproved,
  isApprovalApply: true,
});

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

function resolveBatchPath() {
  for (const p of BATCH_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function prepareIncoming(scraped) {
  const rawGender =
    scraped?.rawAttributes?.gender ||
    scraped?.rawAttributes?.Gender ||
    scraped?.extras?.gender ||
    scraped?.gender ||
    "";
  const genderInfo = normalizeGender(rawGender);
  const incoming = scrapedToIncoming(scraped);
  delete incoming._fieldMapped;
  delete incoming._fieldUnmapped;

  if (genderInfo.unknown) {
    incoming.gender = "";
  } else if (genderInfo.value) {
    incoming.gender = genderInfo.value;
  } else {
    delete incoming.gender;
  }
  if (incoming.price == null) delete incoming.price;
  if (incoming.oldPrice == null) delete incoming.oldPrice;
  return { incoming, genderInfo };
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

  const batchPath = resolveBatchPath();
  if (!batchPath) {
    console.error("No balmain-batch products.json found (active or archived)");
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(batchPath, "utf8"));
  const list = Array.isArray(raw) ? raw : raw.products || [];
  const okProducts = list.filter((p) => p && p.status === "ok" && p.sku);

  console.log(
    JSON.stringify({
      batchPath: path.relative(ROOT, batchPath),
      okSkus: okProducts.length,
      dryRun,
      publish,
      policy: PUBLISH_ON_APPROVE_POLICY,
    })
  );

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("mongo_host", mongoose.connection.host);

  const summary = {
    matched: 0,
    updated: 0,
    noOp: 0,
    publishedNow: 0,
    alreadyPublished: 0,
    publishSkipped: 0,
    missing: [],
    errors: [],
    fillTotals: {},
  };

  for (const scraped of okProducts) {
    const sku = String(scraped.sku).trim();
    try {
      const doc = await findBalmainProduct(sku);
      if (!doc) {
        summary.missing.push(sku);
        console.log(`  ${sku}: MISSING in DB`);
        continue;
      }

      summary.matched += 1;

      const { incoming } = prepareIncoming(scraped);
      const existing = doc.toObject();
      const merge = mergeProductFields(existing, incoming, {
        forceOverwrite: false,
      });
      // Scrape merge never invents publish; approve path sets it below.
      delete merge.patch.isPublished;

      if (
        (!existing.slug || !String(existing.slug).trim()) &&
        !merge.patch.slug
      ) {
        const brand = merge.patch.brand || existing.brand;
        const skuVal = merge.patch.sku || existing.sku;
        if (brand && skuVal) {
          merge.patch.slug = generateProductSlug(brand, skuVal);
          if (!merge.fill.includes("slug")) merge.fill.push("slug");
        }
      }

      const mergedPreview = { ...existing, ...merge.patch };
      const pubResult = applyPublishOnApprove(mergedPreview, merge.patch, {
        publish,
      });
      merge.patch = pubResult.patch;
      if (pubResult.published) {
        if (!merge.fill.includes("isPublished")) merge.fill.push("isPublished");
      } else if (pubResult.reason === "already_published") {
        summary.alreadyPublished += 1;
      } else if (publish && pubResult.reason === "missing_title_or_image") {
        summary.publishSkipped += 1;
      }

      if (Object.keys(merge.patch).length === 0) {
        summary.noOp += 1;
        console.log(
          `  ${sku}: no changes · published=${existing.isPublished === true}`
        );
        continue;
      }

      for (const f of merge.fill) {
        summary.fillTotals[f] = (summary.fillTotals[f] || 0) + 1;
      }

      if (dryRun) {
        summary.updated += 1;
        if (pubResult.published) summary.publishedNow += 1;
        console.log(
          `  ${sku}: DRY fill [${merge.fill.join(", ")}] publish=${pubResult.published}`
        );
        continue;
      }

      await Product.findByIdAndUpdate(
        doc._id,
        { $set: merge.patch },
        { new: true, runValidators: true }
      );
      summary.updated += 1;
      if (pubResult.published) summary.publishedNow += 1;
      console.log(
        `  ${sku}: filled ${merge.fill.length} [${merge.fill.join(", ")}] · publishNow=${pubResult.published}`
      );
    } catch (err) {
      summary.errors.push({ sku, message: err.message || String(err) });
      console.error(`  ${sku}: ERROR ${err.message}`);
    }
  }

  await mongoose.disconnect();
  console.log(JSON.stringify({ summary }, null, 2));

  if (!dryRun && summary.errors.length === 0) {
    archiveBatchAndMarkApproved(batchPath, summary);
  } else if (dryRun) {
    console.log("Dry-run: skipped archive + review-approved.json");
  } else {
    console.warn("Errors present — skipped archive / approved marker");
  }
}

function archiveBatchAndMarkApproved(batchPath, summary) {
  const ARCHIVE_DIR = path.join(OUTPUT_ROOT, "balmain-batch-archived");
  const sourceDir = path.dirname(batchPath);

  if (sourceDir !== ARCHIVE_DIR && fs.existsSync(sourceDir)) {
    if (fs.existsSync(ARCHIVE_DIR)) {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const alt = `${ARCHIVE_DIR}-${stamp}`;
      fs.renameSync(ARCHIVE_DIR, alt);
      console.log("Moved previous archive →", path.relative(ROOT, alt));
    }
    fs.renameSync(sourceDir, ARCHIVE_DIR);
    console.log(
      "Archived",
      path.relative(ROOT, sourceDir),
      "→",
      path.relative(ROOT, ARCHIVE_DIR)
    );
  } else {
    console.log("Batch already archived at", path.relative(ROOT, ARCHIVE_DIR));
  }

  const prev = fs.existsSync(APPROVED_PATH)
    ? JSON.parse(fs.readFileSync(APPROVED_PATH, "utf8"))
    : { brands: [] };
  const brands = new Set(
    (prev.brands || []).map((b) => String(b).toLowerCase())
  );
  brands.add(BRAND_ID);
  const next = {
    ...prev,
    brands: [...brands].sort(),
    updatedAt: new Date().toISOString(),
    note:
      prev.note ||
      "Approved brands are excluded from the preview review sidebar after staff-wins DB push. Data retained under *-archived.",
    balmain: {
      ...(prev.balmain || {}),
      skusUpdated: summary.updated,
      publishedNow: summary.publishedNow,
      publishedChanged: summary.publishedNow > 0,
      batchDir: "output/balmain-batch-archived",
      policy: PUBLISH_ON_APPROVE_POLICY,
    },
    lastApply: {
      brand: BRAND_ID,
      isPublishedTouched: publish,
      publishedNow: summary.publishedNow,
      matched: summary.matched,
      updated: summary.updated,
      noOp: summary.noOp,
      missing: summary.missing.length,
      policy: PUBLISH_ON_APPROVE_POLICY,
    },
  };
  fs.writeFileSync(APPROVED_PATH, JSON.stringify(next, null, 2) + "\n");
  console.log("Wrote", path.relative(ROOT, APPROVED_PATH));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
