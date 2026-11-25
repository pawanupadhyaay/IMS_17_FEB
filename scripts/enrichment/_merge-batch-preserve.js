#!/usr/bin/env node
"use strict";

/**
 * After a pending-only batch run overwrites products.json, merge prior ok rows
 * that were not re-scraped (by compact SKU).
 *
 * Usage: node _merge-batch-preserve.js <batchDir> <priorProductsJson>
 */

const fs = require("fs");
const path = require("path");

function compact(s) {
  return String(s || "")
    .trim()
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
}

function loadList(file) {
  if (!fs.existsSync(file)) return [];
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  return Array.isArray(raw) ? raw : raw.products || [];
}

function skuKey(item) {
  return compact(item.sku || item.officialSku || item.styleCode || "");
}

const batchDir = path.resolve(process.argv[2] || "");
const priorFile = path.resolve(process.argv[3] || "");
if (!batchDir || !priorFile) {
  console.error(
    "Usage: node _merge-batch-preserve.js <batchDir> <priorProductsJson>"
  );
  process.exit(1);
}

const productsPath = path.join(batchDir, "products.json");
const current = loadList(productsPath);
const prior = loadList(priorFile);
const currentKeys = new Set(current.map(skuKey).filter(Boolean));

const preserved = prior.filter((p) => {
  const status = String(p.status || "").toLowerCase();
  if (status && status !== "ok" && status !== "success") return false;
  const key = skuKey(p);
  return key && !currentKeys.has(key);
});

const merged = [...preserved, ...current];
fs.writeFileSync(productsPath, JSON.stringify(merged, null, 2));

const ok = merged.filter((r) => {
  const s = String(r.status || "").toLowerCase();
  return !s || s === "ok" || s === "success";
});
const notFound = merged.filter((r) => !ok.includes(r));

fs.writeFileSync(
  path.join(batchDir, "not_found.json"),
  JSON.stringify(notFound, null, 2)
);
fs.writeFileSync(
  path.join(batchDir, "404-report.json"),
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
      preservedPriorOk: preserved.map((p) => p.sku),
    },
    null,
    2
  )
);

console.log(
  JSON.stringify(
    {
      batchDir,
      priorOkPreserved: preserved.length,
      currentRows: current.length,
      mergedTotal: merged.length,
      ok: ok.length,
      failed: notFound.length,
    },
    null,
    2
  )
);
