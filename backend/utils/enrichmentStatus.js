"use strict";

/**
 * Per-brand enrichment progress: unpublished IMS SKUs vs batch scrape output.
 * Done = status ok in batch (or brand-* scrape folders via existing indexes).
 * Failed = not_found.json / non-ok batch status.
 * Left = unpublished not in done set (includes failed + not attempted).
 */

const path = require("path");
const fs = require("fs");
const {
  loadBalmainBatchIndex,
  loadTitanBatchIndex,
  loadTimexBatchIndex,
  loadTissotBatchIndex,
  loadFossilBatchIndex,
  loadCasioBatchIndex,
  loadSeikoBatchIndex,
  loadLonginesBatchIndex,
  ENRICHABLE_BRANDS,
} = require("../controllers/enrichmentController");

const balmain = require("../../scripts/enrichment/brands/balmain");
const titan = require("../../scripts/enrichment/brands/titan");
const timex = require("../../scripts/enrichment/brands/timex");
const tissot = require("../../scripts/enrichment/brands/tissot");
const fossil = require("../../scripts/enrichment/brands/fossil");
const casio = require("../../scripts/enrichment/brands/casio");
const seiko = require("../../scripts/enrichment/brands/seiko");
const longines = require("../../scripts/enrichment/brands/longines");

const ENRICHMENT_OUTPUT = path.join(
  __dirname,
  "../../scripts/enrichment/output"
);

function compactFallback(raw) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
}

function safeNormalize(mod, raw) {
  try {
    return mod.normalizeSku(raw).compact;
  } catch {
    return compactFallback(raw);
  }
}

function matchKeysFor(mod, raw) {
  if (mod.skuMatchKeys) {
    try {
      return [...new Set(mod.skuMatchKeys(raw).filter(Boolean))];
    } catch {
      /* fall through */
    }
  }
  const key = safeNormalize(mod, raw);
  return key ? [key] : [];
}

function resolveBatchDir(prefix) {
  const primary = path.join(ENRICHMENT_OUTPUT, `${prefix}-batch`);
  if (fs.existsSync(path.join(primary, "products.json"))) return primary;
  const archived = path.join(ENRICHMENT_OUTPUT, `${prefix}-batch-archived`);
  if (fs.existsSync(path.join(archived, "products.json"))) return archived;
  return null;
}

function readJsonSafe(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function listFromProductsFile(filePath) {
  const raw = readJsonSafe(filePath);
  if (!raw) return [];
  return Array.isArray(raw) ? raw : raw.products || [];
}

function addFailedKeysFromItem(item, failedByKey, keyFn, matchKeysFn) {
  if (!item) return;
  const status = String(item.status || "").toLowerCase();
  if (!status || status === "ok" || status === "success") return;
  const raws = [
    item.sku,
    item.officialSku,
    item.styleCode,
    item.matchedStyle,
    item.imsSku,
    item.typoFrom,
    ...(Array.isArray(item.imsSkuAliases) ? item.imsSkuAliases : []),
  ];
  const keys = new Set();
  for (const raw of raws) {
    if (!raw) continue;
    for (const k of matchKeysFn(raw)) keys.add(k);
    const simple = keyFn(raw);
    if (simple) keys.add(simple);
  }
  const displaySku = String(
    item.sku || item.officialSku || item.styleCode || ""
  ).trim();
  for (const key of keys) {
    if (!key || failedByKey.has(key)) continue;
    failedByKey.set(key, {
      sku: displaySku || key,
      status: item.status || "failed",
      reason: item.reason || null,
    });
  }
}

function loadFailedIndex(prefix, keyFn, matchKeysFn) {
  const failedByKey = new Map();
  const batchDir = resolveBatchDir(prefix);
  const dirs = [];
  if (batchDir) dirs.push(batchDir);

  if (fs.existsSync(ENRICHMENT_OUTPUT)) {
    const re = new RegExp(`^${prefix}-`, "i");
    for (const name of fs.readdirSync(ENRICHMENT_OUTPUT)) {
      if (!re.test(name)) continue;
      if (name === `${prefix}-batch` || name === `${prefix}-batch-archived`) {
        continue;
      }
      const dir = path.join(ENRICHMENT_OUTPUT, name);
      try {
        if (!fs.statSync(dir).isDirectory()) continue;
      } catch {
        continue;
      }
      dirs.push(dir);
    }
  }

  for (const dir of dirs) {
    const productsPath = path.join(dir, "products.json");
    for (const item of listFromProductsFile(productsPath)) {
      addFailedKeysFromItem(item, failedByKey, keyFn, matchKeysFn);
    }
    const notFoundPath = path.join(dir, "not_found.json");
    const nf = readJsonSafe(notFoundPath);
    if (!nf) continue;
    const list = Array.isArray(nf) ? nf : nf.skus || nf.items || [];
    for (const entry of list) {
      if (entry == null) continue;
      if (typeof entry === "string") {
        addFailedKeysFromItem(
          { sku: entry, status: "not_found" },
          failedByKey,
          keyFn,
          matchKeysFn
        );
      } else {
        addFailedKeysFromItem(
          {
            ...entry,
            status: entry.status || "not_found",
          },
          failedByKey,
          keyFn,
          matchKeysFn
        );
      }
    }
  }

  return failedByKey;
}

const BRAND_CONFIG = [
  {
    key: "balmain",
    label: "Balmain",
    mod: balmain,
    loadDone: loadBalmainBatchIndex,
  },
  {
    key: "titan",
    label: "Titan",
    mod: titan,
    loadDone: loadTitanBatchIndex,
  },
  {
    key: "timex",
    label: "Timex",
    mod: timex,
    loadDone: loadTimexBatchIndex,
  },
  {
    key: "tissot",
    label: "Tissot",
    mod: tissot,
    loadDone: loadTissotBatchIndex,
  },
  {
    key: "fossil",
    label: "Fossil",
    mod: fossil,
    loadDone: loadFossilBatchIndex,
  },
  {
    key: "casio",
    label: "Casio",
    mod: casio,
    loadDone: loadCasioBatchIndex,
  },
  {
    key: "seiko",
    label: "Seiko",
    mod: seiko,
    loadDone: loadSeikoBatchIndex,
  },
  {
    key: "longines",
    label: "Longines",
    mod: longines,
    loadDone: loadLonginesBatchIndex,
  },
];

function getBrandConfig(brandKeyOrLabel) {
  const raw = String(brandKeyOrLabel || "")
    .trim()
    .toLowerCase();
  return BRAND_CONFIG.find((b) => b.key === raw || b.label.toLowerCase() === raw);
}

function lookupInMap(map, keys) {
  for (const key of keys) {
    if (key && map.has(key)) return map.get(key);
  }
  return null;
}

/**
 * @param {Array<{_id, sku, title?, brand?}>} unpublishedProducts
 * @param {{ includeSkus?: boolean }} opts
 */
function buildBrandStatus(config, unpublishedProducts, opts = {}) {
  const { includeSkus = false } = opts;
  const keyFn = (raw) => safeNormalize(config.mod, raw);
  const matchKeysFn = (raw) => matchKeysFor(config.mod, raw);

  const doneIndex = config.loadDone();
  const failedIndex = loadFailedIndex(config.key, keyFn, matchKeysFn);
  const batchDir = resolveBatchDir(config.key);

  const done = [];
  const left = [];
  const failed = [];

  for (const product of unpublishedProducts) {
    const sku = String(product.sku || "").trim();
    if (!sku) continue;
    const keys = matchKeysFn(sku);
    const doneRecord = lookupInMap(doneIndex, keys);
    const row = {
      sku,
      productId: product._id ? String(product._id) : null,
      title: product.title || "",
    };
    if (doneRecord) {
      done.push({
        ...row,
        officialSku: doneRecord.officialSku || doneRecord.styleCode || null,
        nearMatch: Boolean(doneRecord.typoFrom || doneRecord.nearMatch),
      });
      continue;
    }
    const failRecord = lookupInMap(failedIndex, keys);
    left.push(row);
    if (failRecord) {
      failed.push({
        ...row,
        status: failRecord.status || "failed",
        reason: failRecord.reason || null,
      });
    }
  }

  const summary = {
    brand: config.label,
    key: config.key,
    total: done.length + left.length,
    done: done.length,
    left: left.length,
    failed: failed.length,
    batchPresent: Boolean(batchDir),
    batchDir: batchDir
      ? path.relative(path.join(ENRICHMENT_OUTPUT, ".."), batchDir)
      : null,
  };

  if (!includeSkus) return summary;

  return {
    ...summary,
    skus: {
      done,
      left,
      failed,
    },
  };
}

module.exports = {
  BRAND_CONFIG,
  ENRICHABLE_BRANDS,
  getBrandConfig,
  buildBrandStatus,
  resolveBatchDir,
};
