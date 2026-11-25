"use strict";

/**
 * Shared India-retailer miss-recovery chain for enrichment brands.
 *
 * Default luxury order (official already missed):
 *   The Collective → Tata Cliq Luxury → TGT Luxe → Ethos
 *
 * Fashion / Armani order typically:
 *   Amazon.in (brand-owned) → Tata Cliq Luxury → Ethos
 *
 * Brands pass enabled steps; Tata Cliq is always included unless skipTataCliq.
 */

const { enrichFromTataCliq, SOURCE_ID: TATA } = require("./tatacliq");
const { enrichFromCollective, SOURCE_ID: COLLECTIVE } = require("./thecollective");
const { enrichFromTgtLuxe, SOURCE_ID: TGT } = require("./tgtluxe");
const { enrichFromEthos, SOURCE_ID: ETHOS } = require("./ethos");

/** Known Tata Cliq Luxury PDPs for recent miss recoveries (compact SKU → URL). */
const TATA_CLIQ_REF_URLS = {
  R22894153:
    "https://luxury.tatacliq.com/rado-coupole-classic-men-41-mm/p-mp000000010718112",
  AR11123:
    "https://luxury.tatacliq.com/emporio-armani-ar11123-silver-aviator-watch-for-men/p-mp000000004650721",
  AR1704:
    "https://luxury.tatacliq.com/emporio-armani-ar1704-men-watches/p-mp000000003291693",
  AX2706:
    "https://luxury.tatacliq.com/armani-exchange-ax2706-cayde-analog-watch-for-men/p-mp000000014437942",
  AX2716:
    "https://luxury.tatacliq.com/armani-exchange-ax2716-cayde-multifunction-analog-watch-for-men/p-mp000000014437964",
  AX4301:
    "https://luxury.tatacliq.com/armani-exchange-sync-men-42-mm/p-mp000000030943337",
  "2B58BFBROBO":
    "https://luxury.tatacliq.com/alexandre-christie-passion-quartz-multifunction-women-36-mm-2b58bfbrobo/p-mp000000032996347",
};

/** Known Ethos PDPs (compact SKU → URL). */
const ETHOS_REF_URLS = {
  R22894153:
    "https://www.ethoswatches.com/product-rado-coupole-r22894153.html",
  R22910153:
    "https://www.ethoswatches.com/product-rado-coupole-r22910153.html",
};

const PRESETS = {
  luxury: ["collective", "tatacliq", "tgtluxe", "ethos"],
  /** Always keep Tata Cliq; Ethos last for misses. */
  armani: ["tatacliq", "ethos"],
  tatacliq_ethos: ["tatacliq", "ethos"],
};

function compactSku(raw) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
}

function resolveTataUrl(compact, options = {}) {
  return (
    options.tataCliqUrl ||
    (options.tataCliqRefUrls && options.tataCliqRefUrls[compact]) ||
    TATA_CLIQ_REF_URLS[compact] ||
    null
  );
}

function resolveEthosUrl(compact, options = {}) {
  return (
    options.ethosUrl ||
    (options.ethosRefUrls && options.ethosRefUrls[compact]) ||
    ETHOS_REF_URLS[compact] ||
    null
  );
}

function buildSteps(sku, options = {}) {
  const compact = compactSku(sku);
  const brandHint = options.brandHint || "Watch";
  const preset = options.preset || "luxury";
  let order = Array.isArray(options.order)
    ? options.order.slice()
    : (PRESETS[preset] || PRESETS.luxury).slice();

  // Hard guarantee: Tata Cliq always present unless explicitly skipped.
  if (!options.skipTataCliq && !order.includes("tatacliq")) {
    // Insert before Ethos if present, else append.
    const ethosIdx = order.indexOf("ethos");
    if (ethosIdx >= 0) order.splice(ethosIdx, 0, "tatacliq");
    else order.push("tatacliq");
  }
  if (options.skipTataCliq) order = order.filter((s) => s !== "tatacliq");
  if (options.skipCollective) order = order.filter((s) => s !== "collective");
  if (options.skipTgtLuxe) order = order.filter((s) => s !== "tgtluxe");
  if (options.skipEthos) order = order.filter((s) => s !== "ethos");

  // Single-source force flags
  if (options.collectiveOnly) order = ["collective"];
  if (options.tataCliqOnly) order = ["tatacliq"];
  if (options.tgtLuxeOnly) order = ["tgtluxe"];
  if (options.ethosOnly) order = ["ethos"];

  const timeoutMs = options.timeoutMs;
  const steps = [];

  for (const id of order) {
    if (id === "collective") {
      steps.push({
        id: COLLECTIVE,
        label: "The Collective",
        run: () =>
          enrichFromCollective(compact, {
            collectiveUrl: options.collectiveUrl || null,
            brandHint,
            timeoutMs,
            resolveBySku: options.resolveCollectiveBySku !== false,
          }),
      });
    } else if (id === "tatacliq") {
      steps.push({
        id: TATA,
        label: "Tata Cliq Luxury",
        run: () =>
          enrichFromTataCliq(compact, {
            tataCliqUrl: resolveTataUrl(compact, options),
            brandHint,
            timeoutMs,
            resolveBySku: options.resolveTataCliqBySku !== false,
            refUrls: { ...TATA_CLIQ_REF_URLS, ...(options.tataCliqRefUrls || {}) },
          }),
      });
    } else if (id === "tgtluxe") {
      steps.push({
        id: TGT,
        label: "TGT Luxe",
        run: () =>
          enrichFromTgtLuxe(compact, {
            tgtLuxeUrl: options.tgtLuxeUrl || null,
            brandHint,
            timeoutMs,
            resolveBySku: options.resolveTgtLuxeBySku !== false,
          }),
      });
    } else if (id === "ethos") {
      steps.push({
        id: ETHOS,
        label: "Ethos",
        run: () =>
          enrichFromEthos(compact, {
            ethosUrl: resolveEthosUrl(compact, options),
            ethosHtmlPath: options.ethosHtmlPath || null,
            fixtureDir: options.fixtureDir || null,
            preferFixture: options.preferFixture || false,
            brandHint,
            timeoutMs,
            resolveBySku: options.resolveEthosBySku !== false,
            refUrls: { ...ETHOS_REF_URLS, ...(options.ethosRefUrls || {}) },
          }),
      });
    }
  }
  return steps;
}

/**
 * Run the retailer chain until the first ok product.
 * @returns {{ product: object|null, attempts: object }}
 */
async function enrichFromRetailerChain(sku, options = {}) {
  const steps = buildSteps(sku, options);
  const attempts = {};

  for (const step of steps) {
    try {
      if (options.log !== false) {
        console.warn(`  trying ${step.label}…`);
      }
      const result = await step.run();
      attempts[step.id] = {
        status: result && result.status,
        reason: (result && result.reason) || null,
        sourceUrl: (result && result.sourceUrl) || null,
      };
      if (result && result.status === "ok") {
        if (!result.source) result.source = step.id;
        if (!result.warnings) result.warnings = [];
        const warnKey = `india_retailer_${step.id}_fallback`;
        if (!result.warnings.includes(warnKey)) result.warnings.push(warnKey);
        return { product: result, attempts };
      }
    } catch (err) {
      attempts[step.id] = {
        status: err.code || "error",
        reason: err.message,
        sourceUrl: err.sourceUrl || null,
      };
    }
  }
  return { product: null, attempts };
}

module.exports = {
  PRESETS,
  TATA_CLIQ_REF_URLS,
  ETHOS_REF_URLS,
  compactSku,
  buildSteps,
  enrichFromRetailerChain,
  resolveTataUrl,
  resolveEthosUrl,
  SOURCE: { TATA, COLLECTIVE, TGT, ETHOS },
};
