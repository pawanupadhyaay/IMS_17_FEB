/**
 * Single place for "can this product appear on the public storefront?"
 * Rule: non-empty trimmed title AND at least one image (images[], imageUrl, or image.url).
 */

function hasNonEmptyTitle(doc) {
  const t = doc?.title;
  return typeof t === "string" && t.trim().length > 0;
}

function hasProductImage(doc) {
  if (!doc) return false;
  if (Array.isArray(doc.images)) {
    for (const u of doc.images) {
      if (typeof u === "string" && u.trim()) return true;
      if (u && typeof u === "object" && typeof u.url === "string" && u.url.trim()) return true;
    }
  }
  if (doc.imageUrl && typeof doc.imageUrl === "string" && doc.imageUrl.trim()) {
    return true;
  }
  if (doc.image?.url && typeof doc.image.url === "string" && doc.image.url.trim()) {
    return true;
  }
  return false;
}

function hasMinimalStorefrontData(doc) {
  if (!doc) return false;
  return (
    (doc.inventory || 0) > 0 &&
    hasNonEmptyTitle(doc) &&
    hasProductImage(doc)
  );
}

function isStorefrontEligible(doc) {
  if (!doc) return false;
  // If the 3 core criteria are met, it should show up (instant reflect from IMS)
  return hasMinimalStorefrontData(doc);
}

function storefrontTitleMongoCondition() {
  return { $exists: true, $ne: "", $not: /^\s*$/ };
}

function storefrontImageMongoCondition() {
  return {
    $or: [
      { "images.0": { $exists: true } },
      { imageUrl: { $exists: true, $ne: "", $not: /^\s*$/ } },
      { "image.url": { $exists: true, $ne: "", $not: /^\s*$/ } },
    ],
  };
}

/**
 * Standard Mongo filter for storefront-ready products.
 * 
 * Eligibility is checked LIVE against DB values (not the pre-computed isPublished flag)
 * so that ANY IMS change (individual edit, bulk edit, direct DB update) is
 * immediately and dynamically reflected on the ecommerce website.
 * 
 * Rules:
 *   1. inventory > 0
 *   2. non-empty title
 *   3. at least 1 valid image
 */
function getStrictStorefrontFilter(customFilters = {}) {
  return {
    ...customFilters,
    inventory: { $gt: 0 },
    title: storefrontTitleMongoCondition(),
    ...storefrontImageMongoCondition(),
  };
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Brand names in the catalog often end with " Watch" / " Watches" while IMS uses the short name (e.g. Tissot).
 * Returns unique strings to exact-match against Product.brand (case-insensitive).
 */
function brandCatalogAliases(displayName) {
  const raw = String(displayName || "").trim();
  if (!raw) return [];
  const set = new Set([raw]);
  const stripped = raw.replace(/\s+Watches?$/i, "").trim();
  if (stripped) set.add(stripped);
  return [...set];
}

/**
 * @param {string} brandParam - single brand or comma-separated list (All Products filter)
 * @returns {null | { brand: RegExp } | { $or: Array<{ brand: RegExp }> }}
 */
function buildBrandMatchClause(brandParam) {
  if (brandParam == null || String(brandParam).trim() === "") return null;
  const names = String(brandParam)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const ors = [];
  for (const name of names) {
    for (const v of brandCatalogAliases(name)) {
      // Allow accidental leading/trailing spaces in Product.brand (IMS / imports)
      ors.push({ brand: new RegExp(`^\\s*${escapeRegex(v)}\\s*$`, "i") });
    }
  }
  if (ors.length === 0) return null;
  if (ors.length === 1) return ors[0];
  return { $or: ors };
}

module.exports = {
  hasMinimalStorefrontData,
  isStorefrontEligible,
  getStrictStorefrontFilter,
  storefrontImageMongoCondition,
  storefrontTitleMongoCondition,
  escapeRegex,
  brandCatalogAliases,
  buildBrandMatchClause,
};

