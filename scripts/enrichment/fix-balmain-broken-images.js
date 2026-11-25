#!/usr/bin/env node
"use strict";

/**
 * Fix Balmain products with broken OR Magento-placeholder-polluted galleries.
 *
 *   node scripts/enrichment/fix-balmain-broken-images.js
 *   node scripts/enrichment/fix-balmain-broken-images.js --dry-run
 *   node scripts/enrichment/fix-balmain-broken-images.js --skus B13495252,B42923984
 *   node scripts/enrichment/fix-balmain-broken-images.js --audit-only
 *
 * Policy (corrected after “first URL HTTP 200” false pass):
 *   - Classify EVERY images[] URL: real | placeholder | broken
 *   - BAD if ANY slot is placeholder/broken OR majority are placeholders
 *   - Magento grey “M” placeholders HTTP 200 (~1.5KB) — detect via URL,
 *     md5, size, and known perceptual hashes (see lib/imageProbe.js)
 *   - Prefer full gallery replacement when placeholders dominate
 *   - Upload only real photos to DigitalOcean Spaces
 *
 * Reads MONGODB_URI + DO Spaces keys from backend/.env (never printed).
 */

const path = require("path");
const fs = require("fs");
const { createRequire } = require("module");

const ROOT = path.join(__dirname, "../..");
const BACKEND_ROOT = path.join(ROOT, "backend");
const backendRequire = createRequire(path.join(BACKEND_ROOT, "package.json"));

backendRequire("dotenv").config({ path: path.join(BACKEND_ROOT, ".env") });

const { S3Client, PutObjectCommand } = backendRequire("@aws-sdk/client-s3");
const sharp = backendRequire("sharp");
const mongoose = backendRequire("mongoose");
const { Product } = backendRequire("./models/Product");
const { migrateUrlsToDoSpaces } = backendRequire("./utils/doSpacesImageMigrator");
const { enrichSku } = require("./brands/balmain");
const { sleep } = require("./lib/http");
const {
  probeImageUrl,
  filterUsableImageUrls,
  classifyGallery,
  isPlaceholderUrl,
  MIN_BYTES,
} = require("./lib/imageProbe");

const OUT_DIR = path.join(__dirname, "output/balmain-image-audit");
const ARCHIVE_IMAGES = path.join(
  __dirname,
  "output/balmain-batch-archived/images"
);

const dryRun = process.argv.includes("--dry-run");
const auditOnly = process.argv.includes("--audit-only");
const skuArgIdx = process.argv.indexOf("--skus");
const skuFilter =
  skuArgIdx >= 0
    ? String(process.argv[skuArgIdx + 1] || "")
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    : null;

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function balmainSkuKey(raw) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
}

function listLocalArchiveImages(sku) {
  const key = balmainSkuKey(sku);
  const dir = path.join(ARCHIVE_IMAGES, key);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort()
    .map((f) => path.join(dir, f));
}

function getS3() {
  const key = process.env.DO_SPACES_KEY;
  const secret = process.env.DO_SPACES_SECRET;
  const endpoint = process.env.DO_SPACES_ENDPOINT;
  const bucket = process.env.DO_SPACES_BUCKET;
  if (!key || !secret || !endpoint || !bucket) {
    throw new Error("DO Spaces env incomplete");
  }
  const client = new S3Client({
    endpoint,
    region: "us-east-1",
    credentials: { accessKeyId: key, secretAccessKey: secret },
  });
  return { client, bucket, endpoint, folder: process.env.DO_SPACES_FOLDER || "ims" };
}

async function uploadBufferToSpaces(buffer) {
  if (!buffer || buffer.length < MIN_BYTES) {
    throw new Error(`refusing tiny buffer (${buffer ? buffer.length : 0}b)`);
  }
  const { client, bucket, endpoint, folder } = getS3();
  const processed = await sharp(buffer, { failOn: "none" })
    .trim({ threshold: 60 })
    .resize(800, 800, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .webp({ quality: 80 })
    .toBuffer();
  if (processed.length < MIN_BYTES) {
    throw new Error(`post-process still tiny (${processed.length}b) — placeholder?`);
  }
  // Re-probe content classification
  const { classifyImageBuffer } = require("./lib/imageProbe");
  const check = await classifyImageBuffer(processed, "");
  if (check.classification !== "real") {
    throw new Error(`post-process classified ${check.classification}: ${check.reason}`);
  }
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const fileKey = `${folder}/${uniqueId}.webp`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: fileKey,
      Body: processed,
      ContentType: "image/webp",
      ACL: "public-read",
    })
  );
  const endpointUrl = new URL(endpoint);
  const hostParts = endpointUrl.host.split(".");
  const cdnHost = `${hostParts[0]}.cdn.${hostParts.slice(1).join(".")}`;
  return `https://${bucket}.${cdnHost}/${fileKey}`;
}

async function uploadLocalFilesToSpaces(filePaths) {
  const urls = [];
  for (const fp of filePaths) {
    const buf = fs.readFileSync(fp);
    try {
      const url = await uploadBufferToSpaces(buf);
      urls.push(url);
    } catch (err) {
      console.warn(`  skip local ${path.basename(fp)}: ${err.message}`);
    }
    await sleep(150);
  }
  return urls;
}

/**
 * Magento catalog paths (no /cache/…) + HBJO CDN often work when PDP search 404s.
 * Each candidate is content-probed (rejects Magento placeholder bodies).
 */
async function discoverDirectCatalogImages(sku) {
  const compact = balmainSkuKey(sku);
  const lower = compact.toLowerCase();
  const dotted = lower.replace(/^(b)(\d{4})(\d{2})(\d{2})$/i, "$1$2.$3.$4");
  const letter = lower[0];
  const second = lower[1];
  const candidates = [
    `https://www.balmainwatches.com/media/catalog/product/${letter}/${second}/${lower}_1.png`,
    `https://www.balmainwatches.com/media/catalog/product/${letter}/${second}/${lower}_2.png`,
    `https://www.balmainwatches.com/media/catalog/product/${letter}/${second}/${lower}_3.png`,
    `https://www.balmainwatches.com/media/catalog/product/${letter}/${second}/${lower}_1.jpg`,
    `https://www.balmainwatches.com/media/catalog/product/${letter}/${second}/${lower}_2.jpg`,
    `https://www.balmainwatches.com/media/catalog/product/${letter}/${second}/${lower}.png`,
    `https://www.balmainwatches.com/media/catalog/product/${letter}/${second}/${lower}.jpg`,
    `https://images.hbjo-online.com/webp/images/all/${compact}_1.jpg`,
    `https://images.hbjo-online.com/webp/images/all/${compact}_2.jpg`,
    `https://images.hbjo-online.com/webp/images/all/${compact}_3.jpg`,
    `https://images.hbjo-online.com/webp/images/all/${compact}_PC.jpg`,
    `https://images.hbjo-online.com/images/all/${compact}_1.jpg`,
    `https://watchfactory.in/cdn/shop/files/${lower}_face.png`,
    `https://watchfactory.in/cdn/shop/files/${dotted}_face.png`,
  ];
  const ok = [];
  for (const url of candidates) {
    if (isPlaceholderUrl(url)) continue;
    const pr = await probeImageUrl(url);
    if (pr.ok) ok.push(url);
  }
  const prefer = (u) => {
    if (/balmainwatches\.com/i.test(u)) return 0;
    if (/hbjo-online/i.test(u)) return 1;
    return 2;
  };
  return [...new Set(ok)].sort((a, b) => prefer(a) - prefer(b));
}

async function scrapeFreshImages(sku) {
  const scraped = await enrichSku(sku, {
    preferFixture: true,
    delayMs: 800,
  });
  if (scraped?.status === "ok" && Array.isArray(scraped.images) && scraped.images.length) {
    const { usable } = await filterUsableImageUrls(scraped.images);
    if (usable.length) {
      return {
        images: usable,
        source: scraped.source || "scrape",
        sourceUrl: scraped.sourceUrl || null,
      };
    }
  }
  const tata = await enrichSku(sku, {
    tataCliqOnly: true,
    delayMs: 800,
  });
  if (tata?.status === "ok" && Array.isArray(tata.images) && tata.images.length) {
    const { usable } = await filterUsableImageUrls(tata.images);
    if (usable.length) {
      return {
        images: usable,
        source: tata.source || "tatacliq",
        sourceUrl: tata.sourceUrl || null,
      };
    }
  }
  return {
    images: [],
    source: null,
    reason: scraped?.reason || tata?.reason || "scrape_failed",
    official: scraped,
    tata,
  };
}

async function migrateOrKeepLive(images, sourceLabel) {
  const { usable: preFiltered } = await filterUsableImageUrls(images);
  if (!preFiltered.length) {
    return {
      images: [],
      source: sourceLabel,
      reason: "all_candidates_placeholder_or_broken",
    };
  }
  console.log(
    `  migrating ${preFiltered.length} real image(s) from ${sourceLabel} → Spaces…`
  );
  const migrated = await migrateUrlsToDoSpaces(preFiltered);
  const spaces = (migrated || []).filter(
    (u) => typeof u === "string" && u.includes("digitaloceanspaces.com")
  );
  // Verify Spaces URLs are real photos (not prior placeholder uploads)
  const verifiedSpaces = [];
  for (const u of spaces) {
    const pr = await probeImageUrl(u);
    if (pr.ok) verifiedSpaces.push(u);
    else console.warn(`  drop Spaces URL (${pr.classification}/${pr.reason}): ${u.slice(0, 80)}`);
  }
  if (verifiedSpaces.length) {
    return {
      images: verifiedSpaces,
      source: `${sourceLabel}→spaces`,
      scrapedCount: preFiltered.length,
    };
  }
  const usable = [];
  for (const u of preFiltered) {
    const pr = await probeImageUrl(u);
    if (pr.ok) usable.push(u);
  }
  if (usable.length) {
    return {
      images: usable,
      source: `${sourceLabel}-live`,
      warning: "spaces_migration_failed_kept_live",
    };
  }
  return {
    images: [],
    source: sourceLabel,
    reason: "migration_and_live_probe_failed",
  };
}

async function resolveReplacementImages(sku) {
  const local = listLocalArchiveImages(sku);
  if (local.length) {
    console.log(`  ${sku}: using ${local.length} local archive file(s)`);
    const urls = await uploadLocalFilesToSpaces(local);
    if (urls.length) {
      return { images: urls, source: "local-archive→spaces", localCount: local.length };
    }
  }

  console.log(`  ${sku}: trying direct official/HBJO catalog URLs…`);
  const direct = await discoverDirectCatalogImages(sku);
  if (direct.length) {
    console.log(`  ${sku}: found ${direct.length} real direct catalog URL(s)`);
    return migrateOrKeepLive(direct.slice(0, 8), "direct-catalog");
  }

  console.log(`  ${sku}: scraping official → Tata Cliq…`);
  const scraped = await scrapeFreshImages(sku);
  if (!scraped.images.length) {
    return { images: [], source: null, reason: scraped.reason || "no_images" };
  }
  console.log(
    `  ${sku}: scraped ${scraped.images.length} real from ${scraped.source}`
  );
  return migrateOrKeepLive(scraped.images, scraped.source || "scrape");
}

function summarizeGallery(gallery, product) {
  return {
    sku: product.sku,
    title: product.title || "",
    isPublished: !!product.isPublished,
    inventory: product.inventory ?? null,
    imageCount: gallery.imageCount,
    real: gallery.real,
    placeholder: gallery.placeholder,
    broken: gallery.broken,
    majorityPlaceholders: gallery.majorityPlaceholders,
    bad: gallery.bad,
    verdict: gallery.verdict,
    firstUrl: (product.images || [])[0] || "",
    slots: gallery.slots.map((s) => ({
      index: s.index,
      classification: s.classification,
      reason: s.reason,
      bytes: s.bytes,
      status: s.status,
      url: s.url || s.finalUrl || "",
    })),
  };
}

async function main() {
  ensureOutDir();
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI missing in backend/.env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("mongo_host", mongoose.connection.host);

  const products = await Product.find({ brand: /^balmain$/i })
    .select("sku title images inventory isPublished")
    .lean();

  const auditRows = [];
  const toFix = [];

  console.log(`Auditing ${products.length} Balmain products (every gallery slot)…`);
  for (const p of products.sort((a, b) =>
    String(a.sku).localeCompare(String(b.sku))
  )) {
    const gallery = await classifyGallery(p.images);
    const row = summarizeGallery(gallery, p);
    auditRows.push(row);
    process.stderr.write(gallery.bad ? "X" : ".");

    if (!gallery.bad) continue;
    if (skuFilter && !skuFilter.includes(String(p.sku).toUpperCase())) continue;
    toFix.push({ product: p, row, gallery });
  }
  process.stderr.write("\n");

  const pollutedCount = auditRows.filter((r) => r.placeholder > 0).length;
  console.log(
    JSON.stringify({
      total: auditRows.length,
      ok: auditRows.filter((r) => r.verdict === "ok").length,
      polluted: pollutedCount,
      broken: auditRows.filter((r) => r.verdict === "broken").length,
      empty: auditRows.filter((r) => r.verdict === "empty").length,
      placeholderSlots: auditRows.reduce((a, r) => a + r.placeholder, 0),
      toFix: toFix.map((t) => t.row.sku),
      dryRun,
      auditOnly,
    })
  );

  fs.writeFileSync(
    path.join(OUT_DIR, "placeholder-audit-pre-fix.json"),
    JSON.stringify(
      {
        auditedAt: new Date().toISOString(),
        method:
          "Every images[] URL classified real|placeholder|broken. Magento PH via URL/md5/size/hash.",
        summary: {
          total: auditRows.length,
          ok: auditRows.filter((r) => r.verdict === "ok").length,
          polluted: pollutedCount,
          broken: auditRows.filter((r) => r.verdict === "broken").length,
          empty: auditRows.filter((r) => r.verdict === "empty").length,
        },
        pollutedSkus: auditRows
          .filter((r) => r.bad !== false && r.verdict !== "ok")
          .map((r) => ({
            sku: r.sku,
            title: r.title,
            n: r.imageCount,
            real: r.real,
            placeholder: r.placeholder,
            broken: r.broken,
          })),
        rows: auditRows,
      },
      null,
      2
    )
  );

  if (auditOnly) {
    console.log("audit-only — no writes");
    await mongoose.disconnect();
    if (pollutedCount || auditRows.some((r) => r.verdict !== "ok")) {
      process.exitCode = 2;
    }
    return;
  }

  const fixResults = [];

  for (const { product, row, gallery } of toFix) {
    const sku = product.sku;
    try {
      // Prefer full replacement when placeholders dominate or no real slots remain
      const preferFullReplace =
        gallery.majorityPlaceholders || gallery.real === 0;

      if (dryRun) {
        const local = listLocalArchiveImages(sku);
        fixResults.push({
          sku,
          action: "dry-run",
          prior: {
            verdict: row.verdict,
            real: row.real,
            placeholder: row.placeholder,
            broken: row.broken,
          },
          preferFullReplace,
          wouldUse: local.length ? "local-archive" : "scrape",
          localCount: local.length,
        });
        console.log(
          `  ${sku}: DRY (${local.length ? "local" : "scrape"}) fullReplace=${preferFullReplace}`
        );
        continue;
      }

      const replacement = await resolveReplacementImages(sku);
      if (!replacement.images.length) {
        // Fallback: strip placeholders/broken and keep remaining real slots
        const keepReal = [];
        for (const s of gallery.slots) {
          if (s.classification === "real" && s.url) keepReal.push(s.url);
        }
        if (keepReal.length && !preferFullReplace) {
          await Product.updateOne(
            { _id: product._id },
            { $set: { images: keepReal } }
          );
          fixResults.push({
            sku,
            action: "stripped_placeholders",
            prior: row,
            imageCount: keepReal.length,
            images: keepReal,
          });
          console.log(`  ${sku}: STRIPPED → ${keepReal.length} real kept`);
          continue;
        }
        fixResults.push({
          sku,
          action: "failed",
          prior: row,
          reason: replacement.reason || "no_replacement",
        });
        console.log(`  ${sku}: FAIL ${replacement.reason || "no_replacement"}`);
        continue;
      }

      const preWrite = await probeImageUrl(replacement.images[0]);
      if (!preWrite.ok) {
        fixResults.push({
          sku,
          action: "failed",
          prior: row,
          reason: `replacement_probe_failed_${preWrite.classification}_${preWrite.reason}`,
          attempted: replacement.images[0],
          source: replacement.source,
        });
        console.log(
          `  ${sku}: FAIL replacement probe ${preWrite.classification}/${preWrite.reason}`
        );
        continue;
      }

      // Full replace when polluted; otherwise could merge — policy: full replace for pollution
      const newImages = replacement.images;
      await Product.updateOne(
        { _id: product._id },
        { $set: { images: newImages } }
      );

      const after = await Product.findById(product._id).select("images").lean();
      const afterGallery = await classifyGallery(after.images);

      fixResults.push({
        sku,
        action: afterGallery.verdict === "ok" ? "fixed" : "wrote_but_verify_failed",
        prior: {
          verdict: row.verdict,
          real: row.real,
          placeholder: row.placeholder,
          broken: row.broken,
        },
        source: replacement.source,
        imageCount: afterGallery.imageCount,
        real: afterGallery.real,
        placeholder: afterGallery.placeholder,
        broken: afterGallery.broken,
        verdict: afterGallery.verdict,
        firstUrl: (after.images || [])[0] || "",
      });
      console.log(
        `  ${sku}: ${afterGallery.verdict === "ok" ? "FIXED" : "VERIFY_FAIL"} via ${replacement.source} → ${afterGallery.real} real / ${afterGallery.imageCount} total`
      );
      await sleep(400);
    } catch (err) {
      fixResults.push({
        sku,
        action: "error",
        prior: row,
        reason: err.message || String(err),
      });
      console.error(`  ${sku}: ERROR ${err.message}`);
    }
  }

  // Final full re-audit
  console.log("Final re-audit…");
  const finalProducts = await Product.find({ brand: /^balmain$/i })
    .select("sku title images inventory isPublished")
    .lean();
  const finalRows = [];
  for (const p of finalProducts.sort((a, b) =>
    String(a.sku).localeCompare(String(b.sku))
  )) {
    const gallery = await classifyGallery(p.images);
    finalRows.push(summarizeGallery(gallery, p));
    process.stderr.write(gallery.bad ? "X" : ".");
  }
  process.stderr.write("\n");

  const finalPolluted = finalRows.filter((r) => r.placeholder > 0);
  const finalSummary = {
    total: finalRows.length,
    ok: finalRows.filter((r) => r.verdict === "ok").length,
    polluted: finalPolluted.length,
    broken: finalRows.filter((r) => r.verdict === "broken").length,
    empty: finalRows.filter((r) => r.verdict === "empty").length,
    placeholderSlots: finalRows.reduce((a, r) => a + r.placeholder, 0),
    fixed: fixResults.filter((r) => r.action === "fixed").length,
    stillFailing: finalRows
      .filter((r) => r.verdict !== "ok")
      .map((r) => ({
        sku: r.sku,
        verdict: r.verdict,
        real: r.real,
        placeholder: r.placeholder,
        broken: r.broken,
        firstUrl: r.firstUrl,
      })),
    fixResults,
  };

  const report = {
    auditedAt: new Date().toISOString(),
    dryRun,
    method:
      "Every images[] slot: real vs Magento-placeholder vs broken. BAD if any PH/broken or majority PH.",
    apology:
      "Prior audit only checked first-URL HTTP 200 and missed Magento placeholders that return 200 as ~1.5KB JPEGs.",
    preFix: {
      total: auditRows.length,
      ok: auditRows.filter((r) => r.verdict === "ok").length,
      polluted: pollutedCount,
      broken: auditRows.filter((r) => r.verdict === "broken").length,
      empty: auditRows.filter((r) => r.verdict === "empty").length,
      pollutedSkus: auditRows
        .filter((r) => r.placeholder > 0)
        .map((r) => r.sku),
    },
    final: finalSummary,
    rows: finalRows,
  };

  fs.writeFileSync(
    path.join(OUT_DIR, "audit-final.json"),
    JSON.stringify(report, null, 2)
  );
  const csvEsc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    "sku,title,isPublished,inventory,imageCount,real,placeholder,broken,firstUrl,verdict",
  ]
    .concat(
      finalRows.map((r) =>
        [
          r.sku,
          r.title,
          r.isPublished,
          r.inventory,
          r.imageCount,
          r.real,
          r.placeholder,
          r.broken,
          r.firstUrl,
          r.verdict,
        ]
          .map(csvEsc)
          .join(",")
      )
    )
    .join("\n");
  fs.writeFileSync(path.join(OUT_DIR, "audit-final.csv"), csv);

  const summaryMd = `# Balmain image audit — placeholder-aware

**${finalSummary.total} Balmain · ${finalSummary.ok} ok · ${finalSummary.polluted} polluted · ${finalSummary.broken} broken · ${finalSummary.empty} empty · still failing: ${finalSummary.stillFailing.length}**

## Apology
Prior audit only checked whether the **first** \`images[]\` URL returned HTTP 200. Magento grey “M” placeholders often 200 as ~1.5KB JPEGs, so polluted galleries (e.g. 7/8 placeholders) were marked OK.

## Method
Every gallery URL classified **real | placeholder | broken** via:
- URL patterns (\`/placeholder/\`, Magento_Catalog placeholder paths)
- Exact Magento placeholder md5
- Tiny body (&lt; ${MIN_BYTES} bytes)
- Known perceptual hashes (raw Magento M + Spaces-processed variants)

BAD if **any** slot is placeholder/broken **or** majority placeholders.

## Numbers
| Stage | Total | OK | Polluted | Broken | Empty |
|-------|------:|---:|---------:|-------:|------:|
| Pre-fix | ${auditRows.length} | ${auditRows.filter((r) => r.verdict === "ok").length} | ${pollutedCount} | ${auditRows.filter((r) => r.verdict === "broken").length} | ${auditRows.filter((r) => r.verdict === "empty").length} |
| After fixes | ${finalSummary.total} | ${finalSummary.ok} | ${finalSummary.polluted} | ${finalSummary.broken} | ${finalSummary.empty} |

## Polluted before fix
${auditRows
  .filter((r) => r.placeholder > 0)
  .map((r) => `- ${r.sku} — ${r.placeholder}/${r.imageCount} placeholders (${r.title})`)
  .join("\n") || "(none)"}

## Fixed this run
${fixResults
  .filter((r) => r.action === "fixed" || r.action === "stripped_placeholders")
  .map((r) => `- ${r.sku} — ${r.action} via ${r.source || "strip"}`)
  .join("\n") || "(none)"}

## Quality bar
Zero Magento placeholder URLs / placeholder content in any Balmain \`images[]\`.
Placeholder slots remaining: **${finalSummary.placeholderSlots}**
`;

  fs.writeFileSync(path.join(OUT_DIR, "SUMMARY.md"), summaryMd);
  fs.writeFileSync(
    path.join(OUT_DIR, "SUMMARY.json"),
    JSON.stringify(
      {
        method: report.method,
        apology: report.apology,
        preFix: report.preFix,
        final: {
          total: finalSummary.total,
          ok: finalSummary.ok,
          polluted: finalSummary.polluted,
          broken: finalSummary.broken,
          empty: finalSummary.empty,
          placeholderSlots: finalSummary.placeholderSlots,
          stillFailing: finalSummary.stillFailing,
        },
        fixed: fixResults.filter((r) => r.action === "fixed").map((r) => r.sku),
      },
      null,
      2
    )
  );

  console.log("FINAL", JSON.stringify(finalSummary, null, 2));
  console.log("WROTE", path.relative(ROOT, OUT_DIR));

  await mongoose.disconnect();
  if (finalSummary.stillFailing.length || finalSummary.placeholderSlots > 0) {
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
