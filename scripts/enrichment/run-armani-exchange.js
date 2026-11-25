#!/usr/bin/env node
"use strict";

/**
 * Armani Exchange enrichment CLI for Samay IMS.
 * Official armani.com first; Amazon.in fallback.
 *
 * Examples:
 *   node run-armani-exchange.js AX5742
 *   node run-armani-exchange.js AX5742 --url 'https://www.armani.com/en-in/armani-exchange/quartz-watch-cod-AX5742-NLP-NLC/'
 *   node run-armani-exchange.js AX5742 --amazon-url 'https://www.amazon.in/.../dp/B0HKY9XL53'
 *   node run-armani-exchange.js --csv input/armani-exchange-skus.csv --download-images --out output/armani-exchange-batch
 *
 * Output (under ./output/<timestamp>/ or --out):
 *   products.json, import.csv, seo.json, not_found.json, merge-report.json,
 *   404-report.json, images/
 */

const fs = require("fs");
const path = require("path");
const {
  enrichSku,
  normalizeSku,
  REF_URLS,
  REF_AMAZON,
} = require("./brands/armani-exchange");
const { toImportCsv } = require("./lib/csv");
const { fetchBuffer, sleep, imageExtFromBuffer } = require("./lib/http");
const { MERGE_POLICY } = require("./lib/merge");

const ROOT = __dirname;

function usage() {
  console.log(`Usage:
  node run-armani-exchange.js <SKU> [SKU...]
  node run-armani-exchange.js --csv <file.csv>
  node run-armani-exchange.js <SKU> --html <fixture.html>
  node run-armani-exchange.js <SKU> --url <official-pdp-url>
  node run-armani-exchange.js <SKU> --amazon-url <amazon-in-pdp>

Options:
  --csv <path>           Input CSV with sku (+ optional official_url, amazon_url)
  --html <path>          Parse a saved armani.com PDP HTML file
  --url <url>            Force official PDP URL for the first / only SKU
  --amazon-url <url>     Amazon.in PDP (used after official miss, or with --amazon-only)
  --amazon-html <path>   Parse a saved Amazon PDP HTML file
  --amazon-only          Skip official; scrape Amazon.in only
  --skip-amazon-fallback Do not try Amazon after official miss/block
  --out <dir>            Output directory (default: output/<iso-timestamp>)
  --delay <ms>           Delay between live requests (default: 1200)
  --download-images      Stage images under output/.../images/<SKU>/
  --include-price        Write INR price into import CSV (off by default)
  --prefer-fixture       Use fixtures/armani-exchange-<SKU>.html before live fetch
  --existing <json>      Existing IMS products JSON for staff-wins CSV
  --force-overwrite      Allow CSV to overwrite non-empty staff fields (DEFAULT OFF)
  --dry-run              Print JSON to stdout; still writes files unless --stdout-only
  --stdout-only          Do not write files
  -h, --help             Show help

SKU form: AX5742 (compact IMS / site reference)
Merge: ${MERGE_POLICY.summary}
`);
}

function parseArgs(argv) {
  const args = {
    skus: [],
    csv: null,
    html: null,
    url: null,
    amazonUrl: null,
    amazonHtml: null,
    amazonOnly: false,
    skipAmazonFallback: false,
    out: null,
    delay: 1200,
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
    } else if (a === "--amazon-url") {
      args.amazonUrl = argv[++i];
    } else if (a === "--amazon-html") {
      args.amazonHtml = argv[++i];
    } else if (a === "--amazon-only") {
      args.amazonOnly = true;
    } else if (a === "--skip-amazon-fallback") {
      args.skipAmazonFallback = true;
    } else if (a === "--out") {
      args.out = argv[++i];
    } else if (a === "--delay") {
      args.delay = Number(argv[++i]) || 1200;
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
  const amazonIdx = headers.findIndex(
    (h) => h === "amazon_url" || h === "amazon" || h === "fallback_url"
  );
  if (skuIdx < 0) {
    if (headers.length === 1 && !/sku|ref/i.test(headers[0])) {
      return lines.map((l) => ({ sku: l.trim() })).filter((r) => r.sku);
    }
    throw new Error(`CSV ${filePath} needs a sku column`);
  }
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = [];
    let cur = "";
    let inQ = false;
    const line = lines[i];
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"') {
        inQ = !inQ;
        continue;
      }
      if (ch === "," && !inQ) {
        cols.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    cols.push(cur.trim());
    const sku = cols[skuIdx];
    if (!sku) continue;
    rows.push({
      sku,
      officialUrl: urlIdx >= 0 ? cols[urlIdx] || null : null,
      amazonUrl: amazonIdx >= 0 ? cols[amazonIdx] || null : null,
    });
  }
  return rows;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}


async function downloadImages(product, imagesDir) {
  const skuDir = path.join(imagesDir, product.sku);
  // Replace prior downloads so wrong/related SKU files cannot linger
  fs.rmSync(skuDir, { recursive: true, force: true });
  ensureDir(skuDir);
  const local = [];
  let referer = "https://www.armani.com/";
  try {
    if (product.sourceUrl) referer = new URL(product.sourceUrl).origin + "/";
  } catch {
    /* keep default */
  }
  if (product.source === "amazon") referer = "https://www.amazon.in/";

  for (let i = 0; i < product.images.length; i++) {
    const url = product.images[i];
    try {
      const { buffer, contentType } = await fetchBuffer(url, {
        headers: {
          Referer: referer,
          Accept: "image/jpeg,image/png,image/webp,image/*;q=0.8,*/*;q=0.5",
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

  let jobs = args.skus.map((sku) => ({
    sku,
    officialUrl: null,
    amazonUrl: null,
  }));
  if (args.csv) {
    jobs = parseSkuCsv(path.resolve(args.csv));
  }
  if (args.url && jobs.length === 1) {
    jobs[0].officialUrl = args.url;
  } else if (args.url && jobs.length === 0) {
    jobs = [{ sku: "UNKNOWN", officialUrl: args.url, amazonUrl: null }];
  }
  if (args.amazonUrl && jobs.length === 1) {
    jobs[0].amazonUrl = args.amazonUrl;
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
    const amazonUrl =
      job.amazonUrl ||
      (jobs.length === 1 ? args.amazonUrl : null) ||
      REF_AMAZON[skuNorm.compact] ||
      null;

    console.log(`[${i + 1}/${jobs.length}] Armani Exchange ${skuNorm.compact}…`);

    const product = await enrichSku(job.sku, {
      officialUrl,
      amazonUrl,
      htmlPath: args.html && i === 0 ? path.resolve(args.html) : null,
      amazonHtmlPath:
        args.amazonHtml && i === 0 ? path.resolve(args.amazonHtml) : null,
      fixtureDir: path.join(ROOT, "fixtures"),
      preferFixture: args.preferFixture || Boolean(args.html),
      amazonOnly: args.amazonOnly,
      skipAmazonFallback: args.skipAmazonFallback,
      delayMs: 0,
      timeoutMs: 45000,
      refUrls: REF_URLS,
      refAmazon: REF_AMAZON,
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
      }${product.source ? ` | src=${product.source}` : ""}${
        product.reason ? ` | ${product.reason}` : ""
      }`
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
      path.join(outDir, "404-report.json"),
      JSON.stringify(
        {
          ok: ok.length,
          failed: notFound.length,
          notFound: notFound.map((r) => ({
            sku: r.sku,
            status: r.status,
            reason: r.reason || null,
            sourceUrl: r.sourceUrl || null,
            source: r.source || null,
          })),
        },
        null,
        2
      )
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
