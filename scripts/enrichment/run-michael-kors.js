#!/usr/bin/env node
"use strict";

/**
 * Michael Kors enrichment CLI for Samay IMS (michaelkors.com / SFCC).
 *
 * Examples:
 *   node run-michael-kors.js MK7688
 *   node run-michael-kors.js MK7688 --url 'https://www.michaelkors.com/mini-lexington-black-tone-watch/MK7688.html'
 *   node run-michael-kors.js --csv input/michael-kors-skus.csv --download-images --out output/michael-kors-batch
 *
 * Resolve: official URL / REF map / search. Official miss → Collective / Tata Cliq / TGT Luxe / Ethos.
 * Akamai often blocks Node — use --prefer-fixture / fixtures/michael-kors-<SKU>.html.
 *
 * Output (under ./output/<timestamp>/ or --out):
 *   products.json, import.csv, seo.json, not_found.json, merge-report.json, images/
 */

const fs = require("fs");
const path = require("path");
const {
  enrichSku,
  normalizeSku,
  REF_URLS,
} = require("./brands/michael-kors");
const { toImportCsv } = require("./lib/csv");
const { sleep } = require("./lib/http");
const { downloadProductImages } = require("./lib/imageDownload");
const { MERGE_POLICY } = require("./lib/merge");

const ROOT = __dirname;

function usage() {
  console.log(`Usage:
  node run-michael-kors.js <SKU> [SKU...]
  node run-michael-kors.js --csv <file.csv>
  node run-michael-kors.js <SKU> --html <fixture.html>
  node run-michael-kors.js <SKU> --url <official-pdp-url>

Options:
  --csv <path>           Input CSV with sku (+ optional official_url)
  --html <path>          Parse a saved michaelkors.com PDP HTML file
  --url <url>            Force official PDP URL for the first / only SKU
  --collective-url <url> The Collective PDP (used after official miss)
  --tatacliq-url <url>   Tata Cliq Luxury PDP (used after Collective miss)
  --tgtluxe-url <url>    TGT Luxe PDP (used after Tata Cliq miss)
  --ethos-url <url>      Ethos PDP (miss-recovery)
  --collective-only      Skip official; scrape The Collective only
  --tatacliq-only        Skip official/Collective; scrape Tata Cliq only
  --tgtluxe-only         Skip official/Collective/Tata; scrape TGT Luxe only
  --ethos-only           Skip official/retailers ahead of Ethos; scrape Ethos only
  --skip-retailer-fallback  Do not try Collective/Tata/TGT/Ethos after official miss
  --out <dir>            Output directory (default: output/<iso-timestamp>)
  --delay <ms>           Delay between live requests (default: 1200)
  --download-images      Stage images under output/.../images/<SKU>/
  --include-price        Write Michael Kors USD price into import CSV (off by default)
  --prefer-fixture       Use fixtures/michael-kors-<SKU>.html|.json before live fetch
  --existing <json>      Existing IMS products JSON for staff-wins CSV
  --force-overwrite      Allow CSV to overwrite non-empty staff fields (DEFAULT OFF)
  --dry-run              Print JSON to stdout; still writes files unless --stdout-only
  --stdout-only          Do not write files
  -h, --help             Show help

SKU form: MK7688 (compact IMS / site style)
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
    delay: 1200,
    downloadImages: false,
    includePrice: false,
    preferFixture: false,
    existing: null,
    forceOverwrite: false,
    dryRun: false,
    stdoutOnly: false,
    collectiveUrl: null,
    tataCliqUrl: null,
    tgtLuxeUrl: null,
    ethosUrl: null,
    collectiveOnly: false,
    tataCliqOnly: false,
    tgtLuxeOnly: false,
    ethosOnly: false,
    skipRetailerFallback: false,
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
    } else if (a === "--collective-url" || a === "--thecollective-url") {
      args.collectiveUrl = argv[++i];
    } else if (a === "--tatacliq-url" || a === "--tata-cliq-url") {
      args.tataCliqUrl = argv[++i];
    } else if (a === "--tgtluxe-url" || a === "--tgt-luxe-url") {
      args.tgtLuxeUrl = argv[++i];
    } else if (a === "--ethos-url") {
      args.ethosUrl = argv[++i];
    } else if (a === "--collective-only" || a === "--thecollective-only") {
      args.collectiveOnly = true;
    } else if (a === "--tatacliq-only" || a === "--tata-cliq-only") {
      args.tataCliqOnly = true;
    } else if (a === "--tgtluxe-only" || a === "--tgt-luxe-only") {
      args.tgtLuxeOnly = true;
    } else if (a === "--ethos-only") {
      args.ethosOnly = true;
    } else if (a === "--skip-retailer-fallback") {
      args.skipRetailerFallback = true;
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
    });
  }
  return rows;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function refererFor(product) {
  let referer = "https://www.michaelkors.com/";
  try {
    if (product.sourceUrl) referer = new URL(product.sourceUrl).origin + "/";
  } catch {
    /* keep default */
  }
  if (product.source === "tgtluxe") referer = "https://tgtluxe.com/";
  if (product.source === "thecollective") {
    referer = "https://www.thecollective.in/";
  }
  if (product.source === "tatacliq") {
    referer = "https://luxury.tatacliq.com/";
  }
  if (product.source === "ethos") {
    referer = "https://www.ethoswatches.com/";
  }
  return referer;
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

    console.log(`[${i + 1}/${jobs.length}] Michael Kors ${skuNorm.compact}…`);

    const product = await enrichSku(job.sku, {
      officialUrl,
      htmlPath: args.html && i === 0 ? path.resolve(args.html) : null,
      fixtureDir: path.join(ROOT, "fixtures"),
      preferFixture: args.preferFixture || Boolean(args.html),
      delayMs: 0,
      timeoutMs: 45000,
      refUrls: REF_URLS,
      collectiveUrl:
        (jobs.length === 1 ? args.collectiveUrl : null) ||
        job.collectiveUrl ||
        null,
      tataCliqUrl:
        (jobs.length === 1 ? args.tataCliqUrl : null) ||
        job.tataCliqUrl ||
        null,
      tgtLuxeUrl:
        (jobs.length === 1 ? args.tgtLuxeUrl : null) ||
        job.tgtLuxeUrl ||
        null,
      ethosUrl:
        (jobs.length === 1 ? args.ethosUrl : null) || job.ethosUrl || null,
      collectiveOnly: args.collectiveOnly,
      tataCliqOnly: args.tataCliqOnly,
      tgtLuxeOnly: args.tgtLuxeOnly,
      ethosOnly: args.ethosOnly,
      skipRetailerFallback: args.skipRetailerFallback,
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
      product.localImages = await downloadProductImages(product, imagesDir, {
        referer: refererFor(product),
        delayMs: 400,
        log: console.log,
        rootForLog: ROOT,
      });
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
