const path = require("path");
const fs = require("fs");
const { Product } = require("../models/Product");
const { logActivity } = require("../utils/logActivity");
const { compareProductChanges } = require("../utils/compareProductChanges");
const {
  hasMinimalStorefrontData,
  hasProductImage,
  hasNonEmptyTitle,
} = require("../utils/storeEligibility");
const { migrateUrlsToDoSpacesInBackground } = require("../utils/doSpacesImageMigrator");
const { staffWriteError } = require("../utils/staffPermissions");
const { generateProductSlug } = require("../utils/slugify");
const {
  mergeProductFields,
  scrapedToIncoming,
  buildMergePreview,
  collectImageUrls,
} = require("../../scripts/enrichment/lib/merge");
const { normalizeGender } = require("../../scripts/enrichment/lib/gender");
const {
  filterUsableImageUrls,
} = require("../../scripts/enrichment/lib/imageProbe");
const balmain = require("../../scripts/enrichment/brands/balmain");
const titan = require("../../scripts/enrichment/brands/titan");
const timex = require("../../scripts/enrichment/brands/timex");
const tissot = require("../../scripts/enrichment/brands/tissot");
const fossil = require("../../scripts/enrichment/brands/fossil");
const casio = require("../../scripts/enrichment/brands/casio");
const seiko = require("../../scripts/enrichment/brands/seiko");
const longines = require("../../scripts/enrichment/brands/longines");
const rado = require("../../scripts/enrichment/brands/rado");
const emporioArmani = require("../../scripts/enrichment/brands/emporio-armani");
const armaniExchange = require("../../scripts/enrichment/brands/armani-exchange");
const earnshaw = require("../../scripts/enrichment/brands/earnshaw");
const alexandreChristie = require("../../scripts/enrichment/brands/alexandre-christie");
const michaelKors = require("../../scripts/enrichment/brands/michael-kors");

const ENRICHMENT_ROOT = path.join(__dirname, "../../scripts/enrichment");
const ENRICHMENT_OUTPUT = path.join(ENRICHMENT_ROOT, "output");
const FIXTURES_DIR = path.join(ENRICHMENT_ROOT, "fixtures");

const BALMAIN_BATCH_PRODUCTS_PATH = path.join(
  ENRICHMENT_OUTPUT,
  "balmain-batch/products.json"
);
const BALMAIN_BATCH_ARCHIVED_PRODUCTS_PATH = path.join(
  ENRICHMENT_OUTPUT,
  "balmain-batch-archived/products.json"
);
const TITAN_BATCH_PRODUCTS_PATH = path.join(
  ENRICHMENT_OUTPUT,
  "titan-batch/products.json"
);
const TIMEX_BATCH_PRODUCTS_PATH = path.join(
  ENRICHMENT_OUTPUT,
  "timex-batch/products.json"
);
const TISSOT_BATCH_PRODUCTS_PATH = path.join(
  ENRICHMENT_OUTPUT,
  "tissot-batch/products.json"
);
const FOSSIL_BATCH_PRODUCTS_PATH = path.join(
  ENRICHMENT_OUTPUT,
  "fossil-batch/products.json"
);
const CASIO_BATCH_PRODUCTS_PATH = path.join(
  ENRICHMENT_OUTPUT,
  "casio-batch/products.json"
);
const SEIKO_BATCH_PRODUCTS_PATH = path.join(
  ENRICHMENT_OUTPUT,
  "seiko-batch/products.json"
);
const LONGINES_BATCH_PRODUCTS_PATH = path.join(
  ENRICHMENT_OUTPUT,
  "longines-batch/products.json"
);
const RADO_BATCH_PRODUCTS_PATH = path.join(
  ENRICHMENT_OUTPUT,
  "rado-batch/products.json"
);
const EMPORIO_ARMANI_BATCH_PRODUCTS_PATH = path.join(
  ENRICHMENT_OUTPUT,
  "emporio-armani-batch/products.json"
);
const ARMANI_EXCHANGE_BATCH_PRODUCTS_PATH = path.join(
  ENRICHMENT_OUTPUT,
  "armani-exchange-batch/products.json"
);
const EARNSHAW_BATCH_PRODUCTS_PATH = path.join(
  ENRICHMENT_OUTPUT,
  "earnshaw-batch/products.json"
);
const ALEXANDRE_CHRISTIE_BATCH_PRODUCTS_PATH = path.join(
  ENRICHMENT_OUTPUT,
  "alexandre-christie-batch/products.json"
);
const MICHAEL_KORS_BATCH_PRODUCTS_PATH = path.join(
  ENRICHMENT_OUTPUT,
  "michael-kors-batch/products.json"
);

let balmainBatchCache = { mtimeMs: 0, bySku: new Map() };
let titanBatchCache = { mtimeMs: 0, fingerprint: "", bySku: new Map() };
let timexBatchCache = { mtimeMs: 0, fingerprint: "", bySku: new Map() };
let tissotBatchCache = { mtimeMs: 0, fingerprint: "", bySku: new Map() };
let fossilBatchCache = { mtimeMs: 0, fingerprint: "", bySku: new Map() };
let casioBatchCache = { mtimeMs: 0, fingerprint: "", bySku: new Map() };
let seikoBatchCache = { mtimeMs: 0, fingerprint: "", bySku: new Map() };
let longinesBatchCache = { mtimeMs: 0, fingerprint: "", bySku: new Map() };
let radoBatchCache = { mtimeMs: 0, fingerprint: "", bySku: new Map() };
let emporioArmaniBatchCache = { mtimeMs: 0, fingerprint: "", bySku: new Map() };
let armaniExchangeBatchCache = { mtimeMs: 0, fingerprint: "", bySku: new Map() };
let earnshawBatchCache = { mtimeMs: 0, fingerprint: "", bySku: new Map() };
let alexandreChristieBatchCache = { mtimeMs: 0, fingerprint: "", bySku: new Map() };
let michaelKorsBatchCache = { mtimeMs: 0, fingerprint: "", bySku: new Map() };

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

function titanSkuKey(raw) {
  try {
    return titan.normalizeSku(raw).compact;
  } catch {
    return String(raw || "")
      .trim()
      .toUpperCase()
      .replace(/[.\-_\s]/g, "");
  }
}

function timexSkuKey(raw) {
  try {
    return timex.normalizeSku(raw).compact;
  } catch {
    return String(raw || "")
      .trim()
      .toUpperCase()
      .replace(/[.\-_\s]/g, "");
  }
}

function tissotSkuKey(raw) {
  try {
    return tissot.normalizeSku(raw).compact;
  } catch {
    return String(raw || "")
      .trim()
      .toUpperCase()
      .replace(/[.\-_\s]/g, "");
  }
}

function fossilSkuKey(raw) {
  try {
    return fossil.normalizeSku(raw).compact;
  } catch {
    return String(raw || "")
      .trim()
      .toUpperCase()
      .replace(/[.\-_\s]/g, "");
  }
}

function casioSkuKey(raw) {
  try {
    return casio.normalizeSku(raw).compact;
  } catch {
    return String(raw || "")
      .trim()
      .toUpperCase()
      .replace(/[.\-_\s]/g, "");
  }
}

function seikoSkuKey(raw) {
  try {
    return seiko.normalizeSku(raw).compact;
  } catch {
    return String(raw || "")
      .trim()
      .toUpperCase()
      .replace(/[.\-_\s]/g, "");
  }
}

function longinesSkuKey(raw) {
  try {
    return longines.normalizeSku(raw).compact;
  } catch {
    return String(raw || "")
      .trim()
      .toUpperCase()
      .replace(/[.\-_\s]/g, "");
  }
}

function radoSkuKey(raw) {
  try {
    return rado.normalizeSku(raw).compact;
  } catch {
    return String(raw || "")
      .trim()
      .toUpperCase()
      .replace(/[.\-_\s]/g, "");
  }
}

function armaniExchangeSkuKey(raw) {
  try {
    return armaniExchange.normalizeSku(raw).compact;
  } catch {
    return String(raw || "")
      .trim()
      .toUpperCase()
      .replace(/[.\-_\s]/g, "");
  }
}

function emporioArmaniSkuKey(raw) {
  try {
    return emporioArmani.normalizeSku(raw).compact;
  } catch {
    return String(raw || "")
      .trim()
      .toUpperCase()
      .replace(/[.\-_\s]/g, "");
  }
}

function earnshawSkuKey(raw) {
  try {
    return earnshaw.normalizeSku(raw).compact;
  } catch {
    return String(raw || "")
      .trim()
      .toUpperCase()
      .replace(/[.\-_\s]/g, "");
  }
}

function alexandreChristieSkuKey(raw) {
  try {
    return alexandreChristie.normalizeSku(raw).compact;
  } catch {
    return String(raw || "")
      .trim()
      .toUpperCase()
      .replace(/[.\-_\s]/g, "");
  }
}

function michaelKorsSkuKey(raw) {
  try {
    return michaelKors.normalizeSku(raw).compact;
  } catch {
    return String(raw || "")
      .trim()
      .toUpperCase()
      .replace(/[.\-_\s]/g, "");
  }
}

/** Generic fingerprint for brand-batch + brand-<sku> scrape folders. */
function brandCacheFingerprint(prefix, batchPath) {
  const parts = [];
  if (fs.existsSync(batchPath)) {
    parts.push(`batch:${fs.statSync(batchPath).mtimeMs}`);
  }
  if (!fs.existsSync(ENRICHMENT_OUTPUT)) return parts.join("|");
  const re = new RegExp(`^${prefix}-`, "i");
  for (const name of fs.readdirSync(ENRICHMENT_OUTPUT)) {
    if (!re.test(name) || name === `${prefix}-batch`) continue;
    const productsPath = path.join(ENRICHMENT_OUTPUT, name, "products.json");
    if (!fs.existsSync(productsPath)) continue;
    parts.push(`${name}:${fs.statSync(productsPath).mtimeMs}`);
  }
  return parts.sort().join("|");
}

function loadPrefixedBrandBatchIndex(prefix, batchPath, cacheRef, keyFn) {
  const fingerprint = brandCacheFingerprint(prefix, batchPath);
  if (fingerprint === cacheRef.fingerprint && cacheRef.bySku.size > 0) {
    return cacheRef.bySku;
  }
  const bySku = new Map();
  if (fs.existsSync(ENRICHMENT_OUTPUT)) {
    const re = new RegExp(`^${prefix}-`, "i");
    for (const name of fs.readdirSync(ENRICHMENT_OUTPUT)) {
      if (!re.test(name) || name === `${prefix}-batch`) continue;
      indexProductsFile(
        path.join(ENRICHMENT_OUTPUT, name, "products.json"),
        bySku,
        keyFn
      );
    }
  }
  indexProductsFile(batchPath, bySku, keyFn);
  cacheRef.mtimeMs = Date.now();
  cacheRef.fingerprint = fingerprint;
  cacheRef.bySku = bySku;
  return bySku;
}

/** Index a Titan ok product under style + typo aliases (e.g. 90210QM01 ↔ 9210QM01). */
function indexTitanProduct(item, bySku) {
  if (!item || item.status !== "ok") return false;
  const keys = new Set();
  try {
    for (const k of titan.skuMatchKeys(
      item.sku || item.officialSku || item.styleCode
    )) {
      keys.add(k);
    }
  } catch {
    /* fall through */
  }
  for (const raw of [
    item.sku,
    item.officialSku,
    item.styleCode,
    item.typoFrom,
    ...(Array.isArray(item.imsSkuAliases) ? item.imsSkuAliases : []),
  ]) {
    const key = titanSkuKey(raw);
    if (key) keys.add(key);
  }
  let added = false;
  for (const key of keys) {
    if (!key || bySku.has(key)) continue;
    bySku.set(key, item);
    added = true;
  }
  return added;
}

/** Index a Timex ok product under style + region-suffix aliases (IK/1K/LK). */
function indexTimexProduct(item, bySku) {
  if (!item || item.status !== "ok") return false;
  const keys = new Set();
  try {
    for (const k of timex.skuMatchKeys(
      item.sku || item.officialSku || item.styleCode || item.matchedStyle
    )) {
      keys.add(k);
    }
  } catch {
    /* fall through */
  }
  for (const raw of [
    item.sku,
    item.officialSku,
    item.styleCode,
    item.matchedStyle,
    item.typoFrom,
    item.imsSku,
    ...(Array.isArray(item.imsSkuAliases) ? item.imsSkuAliases : []),
  ]) {
    const key = timexSkuKey(raw);
    if (key) keys.add(key);
  }
  let added = false;
  for (const key of keys) {
    if (!key || bySku.has(key)) continue;
    bySku.set(key, item);
    added = true;
  }
  return added;
}

/** @deprecated Use loadBalmainBatchIndex — kept for existing imports/tests */
function loadBatchIndex() {
  return loadBalmainBatchIndex();
}

function indexProductsFile(
  filePath,
  bySku,
  keyFn,
  { titanDualKey = false, timexDualKey = false } = {}
) {
  if (!fs.existsSync(filePath)) return 0;
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const list = Array.isArray(raw) ? raw : raw.products || [];
  let n = 0;
  for (const item of list) {
    if (!item || item.status !== "ok") continue;
    if (titanDualKey) {
      const before = bySku.size;
      indexTitanProduct(item, bySku);
      if (bySku.size > before) n += 1;
      continue;
    }
    if (timexDualKey) {
      const before = bySku.size;
      indexTimexProduct(item, bySku);
      if (bySku.size > before) n += 1;
      continue;
    }
    const key = keyFn(item.sku || item.officialSku || item.styleCode);
    if (!key || bySku.has(key)) continue;
    bySku.set(key, item);
    n += 1;
  }
  return n;
}

function resolveBalmainBatchProductsPath() {
  if (fs.existsSync(BALMAIN_BATCH_PRODUCTS_PATH)) {
    return BALMAIN_BATCH_PRODUCTS_PATH;
  }
  if (fs.existsSync(BALMAIN_BATCH_ARCHIVED_PRODUCTS_PATH)) {
    return BALMAIN_BATCH_ARCHIVED_PRODUCTS_PATH;
  }
  return null;
}

function loadBalmainBatchIndex() {
  const productsPath = resolveBalmainBatchProductsPath();
  if (!productsPath) {
    balmainBatchCache = { mtimeMs: 0, bySku: new Map() };
    return balmainBatchCache.bySku;
  }
  const stat = fs.statSync(productsPath);
  if (stat.mtimeMs === balmainBatchCache.mtimeMs && balmainBatchCache.bySku.size > 0) {
    return balmainBatchCache.bySku;
  }
  const bySku = new Map();
  indexProductsFile(productsPath, bySku, balmainSkuKey);
  balmainBatchCache = { mtimeMs: stat.mtimeMs, bySku };
  return bySku;
}

/**
 * Index titan-batch/products.json plus any output/titan-<sku>/products.json
 * (single-SKU scrape folders). Batch file wins on SKU collision.
 */
function titanCacheFingerprint() {
  const parts = [];
  if (fs.existsSync(TITAN_BATCH_PRODUCTS_PATH)) {
    const st = fs.statSync(TITAN_BATCH_PRODUCTS_PATH);
    parts.push(`batch:${st.mtimeMs}`);
  }
  if (!fs.existsSync(ENRICHMENT_OUTPUT)) return parts.join("|");
  for (const name of fs.readdirSync(ENRICHMENT_OUTPUT)) {
    if (!/^titan-/i.test(name) || name === "titan-batch") continue;
    const productsPath = path.join(ENRICHMENT_OUTPUT, name, "products.json");
    if (!fs.existsSync(productsPath)) continue;
    parts.push(`${name}:${fs.statSync(productsPath).mtimeMs}`);
  }
  return parts.sort().join("|");
}

function loadTitanBatchIndex() {
  const fingerprint = titanCacheFingerprint();
  if (fingerprint === titanBatchCache.fingerprint && titanBatchCache.bySku.size > 0) {
    return titanBatchCache.bySku;
  }
  const bySku = new Map();
  // Folder scrapes first, then batch overwrites (batch is canonical)
  if (fs.existsSync(ENRICHMENT_OUTPUT)) {
    for (const name of fs.readdirSync(ENRICHMENT_OUTPUT)) {
      if (!/^titan-/i.test(name) || name === "titan-batch") continue;
      indexProductsFile(
        path.join(ENRICHMENT_OUTPUT, name, "products.json"),
        bySku,
        titanSkuKey,
        { titanDualKey: true }
      );
    }
  }
  indexProductsFile(TITAN_BATCH_PRODUCTS_PATH, bySku, titanSkuKey, {
    titanDualKey: true,
  });
  titanBatchCache = { mtimeMs: Date.now(), fingerprint, bySku };
  return bySku;
}

/**
 * Index timex-batch/products.json plus any output/timex-<sku>/products.json
 * (single-SKU scrape folders). Batch file wins on SKU collision.
 */
function timexCacheFingerprint() {
  const parts = [];
  if (fs.existsSync(TIMEX_BATCH_PRODUCTS_PATH)) {
    const st = fs.statSync(TIMEX_BATCH_PRODUCTS_PATH);
    parts.push(`batch:${st.mtimeMs}`);
  }
  if (!fs.existsSync(ENRICHMENT_OUTPUT)) return parts.join("|");
  for (const name of fs.readdirSync(ENRICHMENT_OUTPUT)) {
    if (!/^timex-/i.test(name) || name === "timex-batch") continue;
    const productsPath = path.join(ENRICHMENT_OUTPUT, name, "products.json");
    if (!fs.existsSync(productsPath)) continue;
    parts.push(`${name}:${fs.statSync(productsPath).mtimeMs}`);
  }
  return parts.sort().join("|");
}

function loadTimexBatchIndex() {
  const fingerprint = timexCacheFingerprint();
  if (fingerprint === timexBatchCache.fingerprint && timexBatchCache.bySku.size > 0) {
    return timexBatchCache.bySku;
  }
  const bySku = new Map();
  if (fs.existsSync(ENRICHMENT_OUTPUT)) {
    for (const name of fs.readdirSync(ENRICHMENT_OUTPUT)) {
      if (!/^timex-/i.test(name) || name === "timex-batch") continue;
      indexProductsFile(
        path.join(ENRICHMENT_OUTPUT, name, "products.json"),
        bySku,
        timexSkuKey,
        { timexDualKey: true }
      );
    }
  }
  indexProductsFile(TIMEX_BATCH_PRODUCTS_PATH, bySku, timexSkuKey, {
    timexDualKey: true,
  });
  timexBatchCache = { mtimeMs: Date.now(), fingerprint, bySku };
  return bySku;
}

function loadTissotBatchIndex() {
  return loadPrefixedBrandBatchIndex(
    "tissot",
    TISSOT_BATCH_PRODUCTS_PATH,
    tissotBatchCache,
    tissotSkuKey
  );
}

function loadFossilBatchIndex() {
  return loadPrefixedBrandBatchIndex(
    "fossil",
    FOSSIL_BATCH_PRODUCTS_PATH,
    fossilBatchCache,
    fossilSkuKey
  );
}

function loadCasioBatchIndex() {
  return loadPrefixedBrandBatchIndex(
    "casio",
    CASIO_BATCH_PRODUCTS_PATH,
    casioBatchCache,
    casioSkuKey
  );
}

function loadSeikoBatchIndex() {
  return loadPrefixedBrandBatchIndex(
    "seiko",
    SEIKO_BATCH_PRODUCTS_PATH,
    seikoBatchCache,
    seikoSkuKey
  );
}

/** Index a Longines ok product under compact + typo aliases (L22734716 ↔ L27734716). */
function indexLonginesProduct(item, bySku) {
  if (!item || item.status !== "ok") return false;
  const keys = new Set();
  try {
    for (const k of longines.skuMatchKeys(
      item.sku || item.officialSku || item.styleCode
    )) {
      keys.add(k);
    }
  } catch {
    /* fall through */
  }
  for (const raw of [
    item.sku,
    item.officialSku,
    item.styleCode,
    item.typoFrom,
    item.imsSku,
    ...(Array.isArray(item.imsSkuAliases) ? item.imsSkuAliases : []),
  ]) {
    const key = longinesSkuKey(raw);
    if (key) keys.add(key);
  }
  let added = false;
  for (const key of keys) {
    if (!key || bySku.has(key)) continue;
    bySku.set(key, item);
    added = true;
  }
  return added;
}

function loadLonginesBatchIndex() {
  const fingerprint = brandCacheFingerprint(
    "longines",
    LONGINES_BATCH_PRODUCTS_PATH
  );
  if (
    fingerprint === longinesBatchCache.fingerprint &&
    longinesBatchCache.bySku.size > 0
  ) {
    return longinesBatchCache.bySku;
  }
  const bySku = new Map();
  if (fs.existsSync(ENRICHMENT_OUTPUT)) {
    const re = /^longines-/i;
    for (const name of fs.readdirSync(ENRICHMENT_OUTPUT)) {
      if (!re.test(name) || name === "longines-batch") continue;
      const filePath = path.join(ENRICHMENT_OUTPUT, name, "products.json");
      if (!fs.existsSync(filePath)) continue;
      const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const list = Array.isArray(raw) ? raw : raw.products || [];
      for (const item of list) indexLonginesProduct(item, bySku);
    }
  }
  if (fs.existsSync(LONGINES_BATCH_PRODUCTS_PATH)) {
    const raw = JSON.parse(
      fs.readFileSync(LONGINES_BATCH_PRODUCTS_PATH, "utf8")
    );
    const list = Array.isArray(raw) ? raw : raw.products || [];
    for (const item of list) indexLonginesProduct(item, bySku);
  }
  longinesBatchCache.mtimeMs = Date.now();
  longinesBatchCache.fingerprint = fingerprint;
  longinesBatchCache.bySku = bySku;
  return bySku;
}

function isBalmainBrand(brand) {
  return /^balmain$/i.test(String(brand || "").trim());
}

function isTitanBrand(brand) {
  return /^titan$/i.test(String(brand || "").trim());
}

function isTimexBrand(brand) {
  return /^timex$/i.test(String(brand || "").trim());
}

function isTissotBrand(brand) {
  return /^tissot$/i.test(String(brand || "").trim());
}

function isFossilBrand(brand) {
  return /^fossil$/i.test(String(brand || "").trim());
}

function isCasioBrand(brand) {
  return /^casio$/i.test(String(brand || "").trim());
}

function isSeikoBrand(brand) {
  return /^seiko$/i.test(String(brand || "").trim());
}

function isLonginesBrand(brand) {
  return /^longines$/i.test(String(brand || "").trim());
}

function isRadoBrand(brand) {
  return /^rado$/i.test(String(brand || "").trim());
}

function isEmporioArmaniBrand(brand) {
  const b = String(brand || "").trim();
  return /^emporio\s*armani$/i.test(b) || /^emporio-armani$/i.test(b);
}

function isArmaniExchangeBrand(brand) {
  const b = String(brand || "").trim();
  if (/^armani[\s-]*exchange$/i.test(b)) return true;
  if (/^a\s*\|\s*x$/i.test(b)) return true;
  if (/^ax$/i.test(b)) return true;
  return false;
}

function isEarnshawBrand(brand) {
  const b = String(brand || "").trim();
  return /^earnshaw$/i.test(b) || /^thomas\s*earnshaw$/i.test(b);
}

function isAlexandreChristieBrand(brand) {
  const b = String(brand || "").trim();
  return (
    /^alexandre\s*christie$/i.test(b) ||
    /^alexandre-christie$/i.test(b) ||
    /^alexandra\s*christie$/i.test(b) ||
    /^alexandra-christie$/i.test(b)
  );
}

function isMichaelKorsBrand(brand) {
  const b = String(brand || "").trim();
  return (
    /^michael\s*kors$/i.test(b) ||
    /^michael-kors$/i.test(b) ||
    /^mk$/i.test(b)
  );
}

function loadRadoBatchIndex() {
  return loadPrefixedBrandBatchIndex(
    "rado",
    RADO_BATCH_PRODUCTS_PATH,
    radoBatchCache,
    radoSkuKey
  );
}

function loadEmporioArmaniBatchIndex() {
  return loadPrefixedBrandBatchIndex(
    "emporio-armani",
    EMPORIO_ARMANI_BATCH_PRODUCTS_PATH,
    emporioArmaniBatchCache,
    emporioArmaniSkuKey
  );
}

function loadArmaniExchangeBatchIndex() {
  return loadPrefixedBrandBatchIndex(
    "armani-exchange",
    ARMANI_EXCHANGE_BATCH_PRODUCTS_PATH,
    armaniExchangeBatchCache,
    armaniExchangeSkuKey
  );
}

function loadEarnshawBatchIndex() {
  return loadPrefixedBrandBatchIndex(
    "earnshaw",
    EARNSHAW_BATCH_PRODUCTS_PATH,
    earnshawBatchCache,
    earnshawSkuKey
  );
}

function loadAlexandreChristieBatchIndex() {
  return loadPrefixedBrandBatchIndex(
    "alexandre-christie",
    ALEXANDRE_CHRISTIE_BATCH_PRODUCTS_PATH,
    alexandreChristieBatchCache,
    alexandreChristieSkuKey
  );
}

function loadMichaelKorsBatchIndex() {
  return loadPrefixedBrandBatchIndex(
    "michael-kors",
    MICHAEL_KORS_BATCH_PRODUCTS_PATH,
    michaelKorsBatchCache,
    michaelKorsSkuKey
  );
}

const ENRICHABLE_BRANDS = [
  "Balmain",
  "Titan",
  "Timex",
  "Tissot",
  "Fossil",
  "Casio",
  "Seiko",
  "Longines",
  "Rado",
  "Emporio Armani",
  "Armani Exchange",
  "Earnshaw",
  "Alexandre Christie",
  "Michael Kors",
];

function detectEnrichmentBrand(brand) {
  if (isBalmainBrand(brand)) return "balmain";
  if (isTitanBrand(brand)) return "titan";
  if (isTimexBrand(brand)) return "timex";
  if (isTissotBrand(brand)) return "tissot";
  if (isFossilBrand(brand)) return "fossil";
  if (isCasioBrand(brand)) return "casio";
  if (isSeikoBrand(brand)) return "seiko";
  if (isLonginesBrand(brand)) return "longines";
  if (isRadoBrand(brand)) return "rado";
  if (isEmporioArmaniBrand(brand)) return "emporio-armani";
  if (isArmaniExchangeBrand(brand)) return "armani-exchange";
  if (isEarnshawBrand(brand)) return "earnshaw";
  if (isAlexandreChristieBrand(brand)) return "alexandre-christie";
  if (isMichaelKorsBrand(brand)) return "michael-kors";
  return null;
}

function nearMatchFromRecord(record) {
  if (!record) return null;
  const near =
    record.nearMatch === true ||
    Boolean(record.typoFrom) ||
    Boolean(record.matchedStyle && record.imsSku);
  if (!near) return null;
  return {
    nearMatch: true,
    from: record.typoFrom || record.imsSku || record.sku || null,
    matchedStyle: record.matchedStyle || record.officialSku || record.style || null,
    method: record.nearMatchMethod || null,
  };
}

function prepareIncoming(scraped) {
  // Prefer raw scrape gender (Women/Men/…) so UI can show from → to even when
  // the product bag was already normalized to Female/Male by the scraper.
  const rawGender =
    scraped?.rawAttributes?.gender ||
    scraped?.rawAttributes?.Gender ||
    scraped?.extras?.gender ||
    scraped?.gender ||
    "";
  const genderInfo = normalizeGender(rawGender);
  const incoming = scrapedToIncoming(scraped);
  const fieldMapped = incoming._fieldMapped || scraped?.fieldMapped || {};
  const fieldUnmapped = incoming._fieldUnmapped || scraped?.fieldUnmapped || {};
  delete incoming._fieldMapped;
  delete incoming._fieldUnmapped;

  if (genderInfo.unknown) {
    incoming.gender = "";
  } else if (genderInfo.value) {
    incoming.gender = genderInfo.value;
  } else {
    delete incoming.gender;
  }
  // Never pull brand CHF / Tata / INR price into IMS unless staff left price empty
  // AND scrape explicitly had a numeric price — batch JSON usually has null.
  if (incoming.price == null) delete incoming.price;
  if (incoming.oldPrice == null) delete incoming.oldPrice;
  return { incoming, genderInfo, fieldMapped, fieldUnmapped };
}

async function resolveBalmainEnrichmentRecord(sku, { liveScrape = false } = {}) {
  const key = balmainSkuKey(sku);
  const batch = loadBalmainBatchIndex();
  const cached = batch.get(key);
  if (cached) {
    return { record: cached, source: "batch-cache" };
  }
  if (!liveScrape) {
    return { record: null, source: "miss", reason: "SKU not in balmain-batch cache" };
  }
  const scraped = await balmain.enrichSku(sku, {});
  if (!scraped || scraped.status !== "ok") {
    return {
      record: null,
      source: "live-scrape",
      reason: scraped?.reason || scraped?.status || "live scrape failed",
    };
  }
  return { record: scraped, source: "live-scrape" };
}

async function resolveTitanEnrichmentRecord(sku, { liveScrape = false } = {}) {
  const batch = loadTitanBatchIndex();
  // Match IMS typo (9210QM01) or correct style (90210QM01) via dual-keyed index
  const tryKeys = titan.skuMatchKeys ? titan.skuMatchKeys(sku) : [titanSkuKey(sku)];
  for (const key of tryKeys) {
    const cached = batch.get(key) || batch.get(titanSkuKey(key));
    if (cached) {
      return { record: cached, source: "batch-cache" };
    }
  }
  if (!liveScrape) {
    const typo = titan.resolveSkuTypo && titan.resolveSkuTypo(sku);
    return {
      record: null,
      source: "miss",
      reason: typo
        ? `SKU not in titan-batch / titan-* cache (IMS typo ${typo.from} → try ${typo.to})`
        : "SKU not in titan-batch / titan-* cache",
    };
  }
  // Cloudflare often blocks Node — prefer fixture when present, else live
  // enrichSku applies SKU_TYPO_MAP (e.g. 9210QM01 → 90210QM01 PDP)
  const scraped = await titan.enrichSku(sku, {
    fixtureDir: FIXTURES_DIR,
    preferFixture: true,
  });
  if (!scraped || scraped.status !== "ok") {
    return {
      record: null,
      source: scraped?.fetchMode === "fixture" ? "fixture-scrape" : "live-scrape",
      reason: scraped?.reason || scraped?.status || "live scrape failed",
    };
  }
  const source =
    scraped.fetchMode === "fixture" ? "fixture-scrape" : "live-scrape";
  return { record: scraped, source };
}

async function resolveTimexEnrichmentRecord(sku, { liveScrape = false } = {}) {
  const batch = loadTimexBatchIndex();
  const tryKeys = timex.skuMatchKeys ? timex.skuMatchKeys(sku) : [timexSkuKey(sku)];
  for (const key of tryKeys) {
    const cached = batch.get(key) || batch.get(timexSkuKey(key));
    if (cached) {
      return { record: cached, source: "batch-cache" };
    }
  }
  if (!liveScrape) {
    const typo = timex.resolveSkuTypo && timex.resolveSkuTypo(sku);
    return {
      record: null,
      source: "miss",
      reason: typo
        ? `SKU not in timex-batch / timex-* cache (IMS typo ${typo.from} → try ${typo.to})`
        : "SKU not in timex-batch / timex-* cache",
    };
  }
  const scraped = await timex.enrichSku(sku, {
    fixtureDir: FIXTURES_DIR,
    preferFixture: true,
  });
  if (!scraped || scraped.status !== "ok") {
    return {
      record: null,
      source: scraped?.fetchMode === "fixture" ? "fixture-scrape" : "live-scrape",
      reason: scraped?.reason || scraped?.status || "live scrape failed",
    };
  }
  const source =
    scraped.fetchMode === "fixture" ? "fixture-scrape" : "live-scrape";
  return { record: scraped, source };
}

async function resolveSimpleBrandRecord(
  sku,
  {
    liveScrape = false,
    loadBatch,
    skuMatchKeys,
    keyFn,
    enrichSku,
    missLabel,
  }
) {
  const batch = loadBatch();
  const tryKeys = skuMatchKeys ? skuMatchKeys(sku) : [keyFn(sku)];
  for (const key of tryKeys) {
    const cached = batch.get(key) || batch.get(keyFn(key));
    if (cached) {
      return { record: cached, source: "batch-cache" };
    }
  }
  if (!liveScrape) {
    return {
      record: null,
      source: "miss",
      reason: `SKU not in ${missLabel} cache`,
    };
  }
  const scraped = await enrichSku(sku, {
    fixtureDir: FIXTURES_DIR,
    preferFixture: true,
  });
  if (!scraped || scraped.status !== "ok") {
    return {
      record: null,
      source: scraped?.fetchMode === "fixture" ? "fixture-scrape" : "live-scrape",
      reason: scraped?.reason || scraped?.status || "live scrape failed",
    };
  }
  return {
    record: scraped,
    source: scraped.fetchMode === "fixture" ? "fixture-scrape" : "live-scrape",
  };
}

async function resolveTissotEnrichmentRecord(sku, opts = {}) {
  return resolveSimpleBrandRecord(sku, {
    ...opts,
    loadBatch: loadTissotBatchIndex,
    skuMatchKeys: tissot.skuMatchKeys,
    keyFn: tissotSkuKey,
    enrichSku: tissot.enrichSku,
    missLabel: "tissot-batch / tissot-*",
  });
}

async function resolveFossilEnrichmentRecord(sku, opts = {}) {
  return resolveSimpleBrandRecord(sku, {
    ...opts,
    loadBatch: loadFossilBatchIndex,
    skuMatchKeys: fossil.skuMatchKeys,
    keyFn: fossilSkuKey,
    enrichSku: fossil.enrichSku,
    missLabel: "fossil-batch / fossil-*",
  });
}

async function resolveCasioEnrichmentRecord(sku, opts = {}) {
  return resolveSimpleBrandRecord(sku, {
    ...opts,
    loadBatch: loadCasioBatchIndex,
    skuMatchKeys: casio.skuMatchKeys,
    keyFn: casioSkuKey,
    enrichSku: casio.enrichSku,
    missLabel: "casio-batch / casio-*",
  });
}

async function resolveSeikoEnrichmentRecord(sku, opts = {}) {
  return resolveSimpleBrandRecord(sku, {
    ...opts,
    loadBatch: loadSeikoBatchIndex,
    skuMatchKeys: seiko.skuMatchKeys,
    keyFn: seikoSkuKey,
    enrichSku: seiko.enrichSku,
    missLabel: "seiko-batch / seiko-*",
  });
}

async function resolveLonginesEnrichmentRecord(sku, opts = {}) {
  return resolveSimpleBrandRecord(sku, {
    ...opts,
    loadBatch: loadLonginesBatchIndex,
    skuMatchKeys: longines.skuMatchKeys,
    keyFn: longinesSkuKey,
    enrichSku: longines.enrichSku,
    missLabel: "longines-batch / longines-*",
  });
}

async function resolveRadoEnrichmentRecord(sku, opts = {}) {
  return resolveSimpleBrandRecord(sku, {
    ...opts,
    loadBatch: loadRadoBatchIndex,
    skuMatchKeys: rado.skuMatchKeys,
    keyFn: radoSkuKey,
    enrichSku: rado.enrichSku,
    missLabel: "rado-batch / rado-*",
  });
}

async function resolveArmaniExchangeEnrichmentRecord(sku, opts = {}) {
  return resolveSimpleBrandRecord(sku, {
    ...opts,
    loadBatch: loadArmaniExchangeBatchIndex,
    skuMatchKeys: armaniExchange.skuMatchKeys,
    keyFn: armaniExchangeSkuKey,
    enrichSku: armaniExchange.enrichSku,
    missLabel: "armani-exchange-batch / armani-exchange-*",
  });
}

async function resolveEmporioArmaniEnrichmentRecord(sku, opts = {}) {
  return resolveSimpleBrandRecord(sku, {
    ...opts,
    loadBatch: loadEmporioArmaniBatchIndex,
    skuMatchKeys: emporioArmani.skuMatchKeys,
    keyFn: emporioArmaniSkuKey,
    enrichSku: emporioArmani.enrichSku,
    missLabel: "emporio-armani-batch / emporio-armani-*",
  });
}

async function resolveEarnshawEnrichmentRecord(sku, opts = {}) {
  return resolveSimpleBrandRecord(sku, {
    ...opts,
    loadBatch: loadEarnshawBatchIndex,
    skuMatchKeys: earnshaw.skuMatchKeys,
    keyFn: earnshawSkuKey,
    enrichSku: earnshaw.enrichSku,
    missLabel: "earnshaw-batch / earnshaw-*",
  });
}

async function resolveAlexandreChristieEnrichmentRecord(sku, opts = {}) {
  return resolveSimpleBrandRecord(sku, {
    ...opts,
    loadBatch: loadAlexandreChristieBatchIndex,
    skuMatchKeys: alexandreChristie.skuMatchKeys,
    keyFn: alexandreChristieSkuKey,
    enrichSku: alexandreChristie.enrichSku,
    missLabel: "alexandre-christie-batch / alexandre-christie-*",
  });
}

async function resolveMichaelKorsEnrichmentRecord(sku, opts = {}) {
  return resolveSimpleBrandRecord(sku, {
    ...opts,
    loadBatch: loadMichaelKorsBatchIndex,
    skuMatchKeys: michaelKors.skuMatchKeys,
    keyFn: michaelKorsSkuKey,
    enrichSku: michaelKors.enrichSku,
    missLabel: "michael-kors-batch / michael-kors-*",
  });
}

async function pullBrandEnrichment(req, res, {
  brandLabel,
  enrichmentKey,
  isBrand,
  resolveRecord,
}) {
  try {
    const { id } = req.params;
    const forceOverwrite =
      req.body?.forceOverwrite === true ||
      req.query.forceOverwrite === "true" ||
      req.query.forceOverwrite === "1";
    const liveScrape =
      req.body?.liveScrape === true ||
      req.query.liveScrape === "true" ||
      req.query.liveScrape === "1" ||
      // Default: try live scrape when batch miss
      req.body?.liveScrape === undefined;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (!isBrand(product.brand)) {
      return res.status(400).json({
        success: false,
        message: `Enrichment is only available for ${brandLabel} products (got "${product.brand || ""}")`,
      });
    }

    if (!product.sku || !String(product.sku).trim()) {
      return res.status(400).json({
        success: false,
        message: "Product has no SKU — cannot look up enrichment data",
      });
    }

    const denied = staffWriteError(req.user, product, {});
    if (denied) {
      return res.status(403).json({ success: false, message: denied });
    }

    const resolved = await resolveRecord(product.sku, { liveScrape });
    if (!resolved.record) {
      return res.status(404).json({
        success: false,
        message: resolved.reason || "No enrichment data found for this SKU",
        data: { sku: product.sku, source: resolved.source },
      });
    }

    const { incoming, genderInfo, fieldMapped, fieldUnmapped } =
      prepareIncoming(resolved.record);
    const existing = product.toObject();
    // Broken/unreachable galleries count as empty so scrape can refill
    const { usable: existingUsableUrls } = await filterUsableImageUrls(
      collectImageUrls(existing)
    );
    const merge = mergeProductFields(existing, incoming, {
      forceOverwrite,
      existingUsableUrls,
    });

    // Scrape/Scan/Pull ≠ approve. Never set isPublished here.
    // Approve & publish (POST /publish) or approved-batch apply sets it.
    // Policy: "Approved enrichment ⇒ isPublished true immediately (sold-out allowed)."
    delete merge.patch.isPublished;

    // Fill slug only when empty and we now have brand+sku
    if (
      (!existing.slug || !String(existing.slug).trim()) &&
      !merge.patch.slug
    ) {
      const brand = merge.patch.brand || existing.brand;
      const sku = merge.patch.sku || existing.sku;
      if (brand && sku) {
        merge.patch.slug = generateProductSlug(brand, sku);
        if (!merge.fill.includes("slug")) merge.fill.push("slug");
      }
    }

    const nearMatch = nearMatchFromRecord(resolved.record);

    if (Object.keys(merge.patch).length === 0) {
      const preview = buildMergePreview(existing, incoming, {
        forceOverwrite,
        existingUsableUrls,
      });
      return res.json({
        success: true,
        message: "No empty fields to fill — staff data already present",
        data: {
          product,
          source: resolved.source,
          fill: [],
          skip: merge.skip,
          omit: merge.omit,
          fillCount: 0,
          skipCount: merge.skip.length,
          gender: {
            ...genderInfo,
            filled: false,
            mappingLabel:
              genderInfo.unknown && genderInfo.from
                ? `${genderInfo.from} → (needs review)`
                : genderInfo.from && genderInfo.to && genderInfo.mapped
                  ? `${genderInfo.from} → ${genderInfo.to} (skipped — staff gender set)`
                  : null,
          },
          nearMatch,
          fieldMapped,
          fieldUnmapped,
          policy: merge.policy,
          decisions: preview.decisions,
          existingUsableImageCount: existingUsableUrls.length,
        },
      });
    }

    const mergedPreview = { ...existing, ...merge.patch };
    const changes = compareProductChanges(product, mergedPreview);

    const updated = await Product.findByIdAndUpdate(
      id,
      { $set: merge.patch },
      { new: true, runValidators: true }
    );

    if (merge.patch.images && Array.isArray(merge.patch.images) && merge.patch.images.length > 0) {
      migrateUrlsToDoSpacesInBackground(updated._id, merge.patch.images);
    }

    logActivity({
      actionType: "UPDATE",
      brand: updated.brand || "",
      sku: updated.sku || "",
      productId: updated._id,
      adminId: req.user.id,
      adminName: req.user.name || "Unknown",
      adminEmail: req.user.email || "",
      changes,
      metadata: {
        enrichment: enrichmentKey,
        source: resolved.source,
        fill: merge.fill,
        skip: merge.skip,
        forceOverwrite,
      },
    });

    const preview = buildMergePreview(existing, incoming, {
      forceOverwrite,
      existingUsableUrls,
    });
    const genderFilled = merge.fill.includes("gender");
    const genderFeedback = {
      ...genderInfo,
      filled: genderFilled,
      mappingLabel:
        genderFilled && genderInfo.from && genderInfo.to
          ? `${genderInfo.from} → ${genderInfo.to}`
          : genderInfo.unknown && genderInfo.from
            ? `${genderInfo.from} → (needs review)`
            : null,
    };

    res.json({
      success: true,
      message: `Filled ${merge.fill.length} field(s), skipped ${merge.skip.length}`,
      data: {
        product: updated,
        source: resolved.source,
        fill: merge.fill,
        skip: merge.skip,
        omit: merge.omit,
        fillCount: merge.fill.length,
        skipCount: merge.skip.length,
        gender: genderFeedback,
        nearMatch,
        fieldMapped,
        fieldUnmapped,
        policy: merge.policy,
        decisions: preview.decisions,
        forceOverwrite,
      },
    });
  } catch (error) {
    console.error(`${brandLabel} enrichment pull failed:`, error);
    res.status(500).json({
      success: false,
      message: error.message || "Enrichment pull failed",
    });
  }
}

// @desc    Pull Balmain enrichment into a product (staff-wins fill-empty)
// @route   POST /api/products/:id/enrich/balmain
// @access  Private (IMS)
const pullBalmainEnrichment = async (req, res) =>
  pullBrandEnrichment(req, res, {
    brandLabel: "Balmain",
    enrichmentKey: "balmain",
    isBrand: isBalmainBrand,
    resolveRecord: resolveBalmainEnrichmentRecord,
  });

// @desc    Pull Titan enrichment into a product (staff-wins fill-empty)
// @route   POST /api/products/:id/enrich/titan
// @access  Private (IMS)
const pullTitanEnrichment = async (req, res) =>
  pullBrandEnrichment(req, res, {
    brandLabel: "Titan",
    enrichmentKey: "titan",
    isBrand: isTitanBrand,
    resolveRecord: resolveTitanEnrichmentRecord,
  });

// @desc    Pull Timex enrichment into a product (staff-wins fill-empty)
// @route   POST /api/products/:id/enrich/timex
// @access  Private (IMS)
const pullTimexEnrichment = async (req, res) =>
  pullBrandEnrichment(req, res, {
    brandLabel: "Timex",
    enrichmentKey: "timex",
    isBrand: isTimexBrand,
    resolveRecord: resolveTimexEnrichmentRecord,
  });

const pullTissotEnrichment = async (req, res) =>
  pullBrandEnrichment(req, res, {
    brandLabel: "Tissot",
    enrichmentKey: "tissot",
    isBrand: isTissotBrand,
    resolveRecord: resolveTissotEnrichmentRecord,
  });

const pullFossilEnrichment = async (req, res) =>
  pullBrandEnrichment(req, res, {
    brandLabel: "Fossil",
    enrichmentKey: "fossil",
    isBrand: isFossilBrand,
    resolveRecord: resolveFossilEnrichmentRecord,
  });

const pullCasioEnrichment = async (req, res) =>
  pullBrandEnrichment(req, res, {
    brandLabel: "Casio",
    enrichmentKey: "casio",
    isBrand: isCasioBrand,
    resolveRecord: resolveCasioEnrichmentRecord,
  });

const pullSeikoEnrichment = async (req, res) =>
  pullBrandEnrichment(req, res, {
    brandLabel: "Seiko",
    enrichmentKey: "seiko",
    isBrand: isSeikoBrand,
    resolveRecord: resolveSeikoEnrichmentRecord,
  });

const pullLonginesEnrichment = async (req, res) =>
  pullBrandEnrichment(req, res, {
    brandLabel: "Longines",
    enrichmentKey: "longines",
    isBrand: isLonginesBrand,
    resolveRecord: resolveLonginesEnrichmentRecord,
  });

const pullRadoEnrichment = async (req, res) =>
  pullBrandEnrichment(req, res, {
    brandLabel: "Rado",
    enrichmentKey: "rado",
    isBrand: isRadoBrand,
    resolveRecord: resolveRadoEnrichmentRecord,
  });

const pullEmporioArmaniEnrichment = async (req, res) =>
  pullBrandEnrichment(req, res, {
    brandLabel: "Emporio Armani",
    enrichmentKey: "emporio-armani",
    isBrand: isEmporioArmaniBrand,
    resolveRecord: resolveEmporioArmaniEnrichmentRecord,
  });

const pullArmaniExchangeEnrichment = async (req, res) =>
  pullBrandEnrichment(req, res, {
    brandLabel: "Armani Exchange",
    enrichmentKey: "armani-exchange",
    isBrand: isArmaniExchangeBrand,
    resolveRecord: resolveArmaniExchangeEnrichmentRecord,
  });

const pullEarnshawEnrichment = async (req, res) =>
  pullBrandEnrichment(req, res, {
    brandLabel: "Earnshaw",
    enrichmentKey: "earnshaw",
    isBrand: isEarnshawBrand,
    resolveRecord: resolveEarnshawEnrichmentRecord,
  });

const pullAlexandreChristieEnrichment = async (req, res) =>
  pullBrandEnrichment(req, res, {
    brandLabel: "Alexandre Christie",
    enrichmentKey: "alexandre-christie",
    isBrand: isAlexandreChristieBrand,
    resolveRecord: resolveAlexandreChristieEnrichmentRecord,
  });

const pullMichaelKorsEnrichment = async (req, res) =>
  pullBrandEnrichment(req, res, {
    brandLabel: "Michael Kors",
    enrichmentKey: "michael-kors",
    isBrand: isMichaelKorsBrand,
    resolveRecord: resolveMichaelKorsEnrichmentRecord,
  });

const ENRICH_HANDLERS = {
  balmain: pullBalmainEnrichment,
  titan: pullTitanEnrichment,
  timex: pullTimexEnrichment,
  tissot: pullTissotEnrichment,
  fossil: pullFossilEnrichment,
  casio: pullCasioEnrichment,
  seiko: pullSeikoEnrichment,
  longines: pullLonginesEnrichment,
  rado: pullRadoEnrichment,
  "emporio-armani": pullEmporioArmaniEnrichment,
  "armani-exchange": pullArmaniExchangeEnrichment,
  earnshaw: pullEarnshawEnrichment,
  "alexandre-christie": pullAlexandreChristieEnrichment,
  "michael-kors": pullMichaelKorsEnrichment,
};

// @desc    Pull brand enrichment — detects Balmain / Titan / Timex / Tissot / Fossil / Casio / Seiko / Longines / Rado / Emporio Armani / Armani Exchange / Earnshaw / Alexandre Christie / Michael Kors
// @route   POST /api/products/:id/enrich
// @access  Private (IMS)
const pullProductEnrichment = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select("brand");
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    const key = detectEnrichmentBrand(product.brand);
    if (!key || !ENRICH_HANDLERS[key]) {
      return res.status(400).json({
        success: false,
        message: `Get details is only available for ${ENRICHABLE_BRANDS.join(", ")} (got "${product.brand || ""}")`,
      });
    }
    return ENRICH_HANDLERS[key](req, res);
  } catch (error) {
    console.error("Product enrichment pull failed:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Enrichment pull failed",
    });
  }
};

// @desc    Approve & publish — set isPublished=true when title + ≥1 image
//          (inventory 0 OK). Immediate go-live; scrape/pull alone never does this.
// @route   POST /api/products/:id/publish
// @access  Private (owner / admin only)
const publishProduct = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();
    if (role !== "owner" && role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only owner or admin can approve and publish listings",
      });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (product.isPublished === true) {
      return res.json({
        success: true,
        message: "Product is already live",
        data: { product },
      });
    }

    if (!hasMinimalStorefrontData(product)) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot publish — product needs a non-empty title and at least one image (inventory may be 0)",
        data: {
          hasTitle: hasNonEmptyTitle(product),
          hasImage: hasProductImage(product),
        },
      });
    }

    const previous = product.toObject();
    // Approve = publish immediately (sold-out allowed).
    product.isPublished = true;
    await product.save();

    const changes = compareProductChanges(previous, product.toObject());
    logActivity({
      actionType: "UPDATE",
      brand: product.brand || "",
      sku: product.sku || "",
      productId: product._id,
      adminId: req.user.id,
      adminName: req.user.name || "Unknown",
      adminEmail: req.user.email || "",
      changes,
      metadata: {
        published: true,
        action: "approve-publish",
        policy:
          "Approved enrichment ⇒ isPublished true immediately (sold-out allowed).",
      },
    });

    res.json({
      success: true,
      message:
        "Listing approved and published (live now; sold-out inventory OK)",
      data: { product },
    });
  } catch (error) {
    console.error("Publish product failed:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Publish failed",
    });
  }
};

module.exports = {
  pullBalmainEnrichment,
  pullTitanEnrichment,
  pullTimexEnrichment,
  pullTissotEnrichment,
  pullFossilEnrichment,
  pullCasioEnrichment,
  pullSeikoEnrichment,
  pullLonginesEnrichment,
  pullRadoEnrichment,
  pullEmporioArmaniEnrichment,
  pullArmaniExchangeEnrichment,
  pullEarnshawEnrichment,
  pullAlexandreChristieEnrichment,
  pullMichaelKorsEnrichment,
  pullProductEnrichment,
  publishProduct,
  loadBatchIndex,
  loadBalmainBatchIndex,
  loadTitanBatchIndex,
  loadTimexBatchIndex,
  loadTissotBatchIndex,
  loadFossilBatchIndex,
  loadCasioBatchIndex,
  loadSeikoBatchIndex,
  loadLonginesBatchIndex,
  loadRadoBatchIndex,
  loadEmporioArmaniBatchIndex,
  loadArmaniExchangeBatchIndex,
  loadEarnshawBatchIndex,
  loadAlexandreChristieBatchIndex,
  loadMichaelKorsBatchIndex,
  detectEnrichmentBrand,
  ENRICHABLE_BRANDS,
};
