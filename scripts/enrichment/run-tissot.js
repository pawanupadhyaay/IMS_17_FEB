#!/usr/bin/env node
"use strict";

/**
 * Tissot enrichment CLI for Samay IMS (tissotwatches.com/en-in).
 *
 * Examples:
 *   node run-tissot.js T1564103337100
 *   node run-tissot.js T1504172209100 --prefer-fixture
 *   node run-tissot.js --csv input/tissot-skus.csv --download-images --out output/tissot-batch
 *
 * URL: https://www.tissotwatches.com/en-in/{SKU}.html
 *
 * Output (under ./output/<timestamp>/ or --out):
 *   products.json, import.csv, seo.json, not_found.json, merge-report.json, images/
 */

const fs = require("fs");
const path = require("path");
const { enrichSku, normalizeSku } = require("./brands/tissot");
const { toImportCsv } = require("./lib/csv");
const { fetchBuffer, sleep, imageExtFromBuffer } = require("./lib/http");
const { MERGE_POLICY } = require("./lib/merge");

const ROOT = __dirname;

const REF_URLS = {
  "T1564103337100": "https://www.tissotwatches.com/en-in/T1564103337100.html",
  "T1504172209100": "https://www.tissotwatches.com/en-in/T1504172209100.html"
};

function usage() {
  console.log(`Usage:
  node run-tissot.js <SKU> [SKU...]
  node run-tissot.js --csv <file.csv>
  node run-tissot.js <SKU> --html <fixture.html>
  node run-tissot.js <SKU> --url <official-pdp-url>

Options:
  --csv <path>           Input CSV with sku (+ optional official_url)
  --html <path>          Parse a saved shop.tissotindia.com PDP HTML file
  --url <url>            Force official PDP URL for the first / only SKU
  --out <dir>            Output directory (default: output/<iso-timestamp>)
  --delay <ms>           Delay between live requests (default: 1000)
  --download-images      Stage images under output/.../images/<SKU>/
  --include-price        Write Tissot INR sales price into import CSV (off by default)
  --prefer-fixture       Use fixtures/<SKU>.html before live fetch
  --existing <json>      Existing IMS products JSON for staff-wins CSV
  --force-overwrite      Allow CSV to overwrite non-empty staff fields (DEFAULT OFF)
  --dry-run              Print JSON to stdout; still writes files unless --stdout-only
  --stdout-only          Do not write files
  -h, --help             Show help

SKU forms: T1564103337100 (compact IMS / site form)
Merge: ${MERGE_POLICY.summary}
`);
}

function parseArgs(argv) {
  const args = {
    skus: [],
    csv: null,
    html: null,
    url: null,
    out: null,
    delay: 1000,
    downloadImages: false,
    includePrice: false,
    preferFixture: false,
    existing: null,
    forceOverwrite: false,
    dryRun: false,
    stdoutOnly: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") {
      args.help = true;
    } else if (a === "--csv") {
      args.csv = argv[++i];
    } else if (a === "--html") {
      args.html = argv[++i];
    } else if (a === "--url") {
      args.url = argv[++i];
    } else if (a === "--out") {
      args.out = argv[++i];
    } else if (a === "--delay") {
      args.delay = Number(argv[++i]) || 1000;
    } else if (a === "--download-images") {
      args.downloadImages = true;
    } else if (a === "--include-price") {
      args.includePrice = true;
    } else if (a === "--prefer-fixture") {
      args.preferFixture = true;
    } else if (a === "--existing") {
      args.existing = argv[++i];
    } else if (a === "--force-overwrite") {
      args.forceOverwrite = true;
    } else if (a === "--dry-run") {
      args.dryRun = true;
    } else if (a === "--stdout-only") {
      args.stdoutOnly = true;
    } else if (a.startsWith("-")) {
      throw new Error(`Unknown option: ${a}`);
    } else {
      args.skus.push(a);
    }
  }
  return args;
}

function loadExistingBySku(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.products)
      ? raw.products
      : raw.product
        ? [raw.product]
        : [];
  const map = new Map();
  for (const p of list) {
    if (!p || !p.sku) continue;
    const key = String(p.sku).toLowerCase();
    if (!map.has(key)) map.set(key, p);
  }
  return map;
}

function parseSkuCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const skuIdx = headers.findIndex(
    (h) => h === "sku" || h === "ref" || h === "reference"
  );
  const urlIdx = headers.findIndex(
    (h) => h === "official_url" || h === "url" || h === "source_url"
  );
  if (skuIdx < 0) {
    if (headers.length === 1 && !/sku|ref/i.test(headers[0])) {
      return lines.map((l) => ({ sku: l.trim() })).filter((r) => r.sku);
    }
    throw new Error(`CSV ${filePath} needs a sku column`);
  }
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const sku = cols[skuIdx];
    if (!sku) continue;
    rows.push({
      sku,
      officialUrl: urlIdx >= 0 ? cols[urlIdx] || null : null,
    });
  }
  return rows;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function downloadImages(product, imagesDir) {
  const skuDir = path.join(imagesDir, product.sku);
  // Drop prior gallery so stale related/strap files cannot linger
  fs.rmSync(skuDir, { recursive: true, force: true });
  ensureDir(skuDir);
  const local = [];
  for (let i = 0; i < product.images.length; i++) {
    const url = product.images[i];
    try {
      const { buffer, contentType } = await fetchBuffer(url, {
        headers: {
          Referer: "https://www.tissotwatches.com/",
          Accept: "image/png,image/jpeg,image/webp,image/*;q=0.8,*/*;q=0.5",
        },
      });
      const ext = imageExtFromBuffer(buffer, url, contentType);
      const file = path.join(skuDir, `${String(i + 1).padStart(2, "0")}${ext}`);
      fs.writeFileSync(file, buffer);
      local.push(file);
      console.log(`  saved ${path.relative(ROOT, file)}`);
    } catch (err) {
      console.warn(`  image download failed: ${url} (${err.message})`);
    }
    await sleep(400);
  }
  return local;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    process.exit(0);
  }

  let jobs = args.skus.map((sku) => ({ sku, officialUrl: null }));
  if (args.csv) {
    jobs = parseSkuCsv(path.resolve(args.csv));
  }
  if (args.url && jobs.length === 1) {
    jobs[0].officialUrl = args.url;
  } else if (args.url && jobs.length === 0) {
    jobs = [{ sku: "UNKNOWN", officialUrl: args.url }];
  }

  if (!jobs.length) {
    usage();
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = args.stdoutOnly
    ? null
    : path.resolve(args.out || path.join(ROOT, "output", stamp));
  if (outDir) ensureDir(outDir);

  const results = [];
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const skuNorm = normalizeSku(job.sku);
    const officialUrl =
      job.officialUrl ||
      (jobs.length === 1 ? args.url : null) ||
      REF_URLS[skuNorm.compact] ||
      null;

    console.log(`[${i + 1}/${jobs.length}] Tissot ${skuNorm.compact}…`);

    const product = await enrichSku(job.sku, {
      officialUrl,
      htmlPath: args.html && i === 0 ? path.resolve(args.html) : null,
      fixtureDir: path.join(ROOT, "fixtures"),
      preferFixture: args.preferFixture || Boolean(args.html),
      delayMs: args.delay,
      timeoutMs: 30000,
    });

    if (
      product.status === "ok" &&
      args.includePrice &&
      product.priceSource &&
      product.priceSource.amount != null
    ) {
      product.price = product.priceSource.amount;
      if (product.priceSource.mrp != null) {
        product.oldPrice = product.priceSource.mrp;
      }
    }

    if (product.status === "ok" && args.downloadImages && outDir) {
      const imagesDir = path.join(outDir, "images");
      product.localImages = await downloadImages(product, imagesDir);
    }

    results.push(product);
    const tag = product.status === "ok" ? "ok" : product.status;
    console.log(
      `  → ${tag}${product.title ? ` | ${product.title}` : ""}${
        product.images ? ` | ${product.images.length} images` : ""
      }${product.reason ? ` | ${product.reason}` : ""}`
    );

    if (i < jobs.length - 1) await sleep(args.delay);
  }

  const ok = results.filter((r) => r.status === "ok");
  const notFound = results.filter((r) => r.status !== "ok");

  const existingBySku = args.existing
    ? loadExistingBySku(path.resolve(args.existing))
    : null;

  if (args.forceOverwrite) {
    console.warn(
      "WARNING: --force-overwrite is ON — CSV may overwrite non-empty staff fields"
    );
  }

  const importCsvResult = toImportCsv(ok, {
    includePrice: args.includePrice,
    forceOverwrite: args.forceOverwrite,
    existingBySku,
  });
  const importCsv = String(importCsvResult);
  const mergeReport = importCsvResult.mergeReport || [];
  const seoSidecar = ok.map((p) => ({
    sku: p.sku,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    seoKeywords: p.seoKeywords,
    seoImage: p.seoImage,
    sourceUrl: p.sourceUrl,
    source: p.source || null,
    scrapedAt: p.scrapedAt,
  }));

  if (args.dryRun || args.stdoutOnly) {
    console.log(
      JSON.stringify({ ok, notFound, mergeReport, policy: MERGE_POLICY }, null, 2)
    );
  }

  if (outDir) {
    fs.writeFileSync(
      path.join(outDir, "products.json"),
      JSON.stringify(results, null, 2)
    );
    fs.writeFileSync(path.join(outDir, "import.csv"), importCsv);
    fs.writeFileSync(
      path.join(outDir, "seo.json"),
      JSON.stringify(seoSidecar, null, 2)
    );
    fs.writeFileSync(
      path.join(outDir, "not_found.json"),
      JSON.stringify(notFound, null, 2)
    );
    fs.writeFileSync(
      path.join(outDir, "merge-report.json"),
      JSON.stringify(
        {
          policy: MERGE_POLICY,
          forceOverwrite: args.forceOverwrite,
          existingSource: args.existing || null,
          report: mergeReport,
        },
        null,
        2
      )
    );
    console.log(
      `\nWrote ${ok.length} ok / ${notFound.length} failed → ${outDir}`
    );
  }

  process.exit(notFound.length && !ok.length ? 2 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
