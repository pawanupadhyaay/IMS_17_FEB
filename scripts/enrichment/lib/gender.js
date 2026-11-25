"use strict";

/**
 * Canonical gender values for IMS Product forms + storefront filters.
 *
 * Confirmed:
 *   - IMS: frontend/src/constants/productOptions.js → Male, Female, Unisex, Pair
 *   - Storefront filters / links: Male, Female (AllProducts, ProductDetail)
 *   - Product schema: free String (no enum) — write only canonical values
 *
 * Scraped Balmain often uses Women / Men / Woman / Man — map before save.
 */

const CANONICAL_GENDERS = Object.freeze(["Male", "Female", "Unisex", "Pair"]);

const FEMALE_ALIASES = new Set([
  "female",
  "woman",
  "women",
  "womens",
  "women's",
  "lady",
  "ladies",
  "w",
]);

const MALE_ALIASES = new Set([
  "male",
  "man",
  "men",
  "mens",
  "men's",
  "gent",
  "gents",
  "gentleman",
  "gentlemen",
  "m",
]);

const UNISEX_ALIASES = new Set([
  "unisex",
  "universal",
  "uni",
  "all",
  "both",
]);

const PAIR_ALIASES = new Set(["pair", "couple", "his and hers", "his & hers"]);

function cleanGenderToken(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[_./\\]+/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Map a scraped / CSV gender string to IMS/storefront enums.
 * Unknown values → empty string + needsReview/unknown (do not invent).
 *
 * @returns {{
 *   value: string,
 *   raw: string,
 *   from: string,
 *   to: string,
 *   mapped: boolean,
 *   needsReview: boolean,
 *   unknown: boolean,
 *   known: boolean
 * }}
 */
function mapGender(raw) {
  const original = raw == null ? "" : String(raw).trim();
  if (!original) {
    return {
      value: "",
      raw: "",
      from: "",
      to: "",
      mapped: false,
      needsReview: false,
      unknown: false,
      known: false,
    };
  }

  const s = cleanGenderToken(original);

  for (const canon of CANONICAL_GENDERS) {
    if (s === canon.toLowerCase()) {
      return {
        value: canon,
        raw: original,
        from: original,
        to: canon,
        mapped: original !== canon,
        needsReview: false,
        unknown: false,
        known: true,
      };
    }
  }

  let value = "";
  if (
    FEMALE_ALIASES.has(s) ||
    s.startsWith("wom") ||
    s.startsWith("lad")
  ) {
    value = "Female";
  } else if (
    MALE_ALIASES.has(s) ||
    s.startsWith("men") ||
    s === "man" ||
    s.startsWith("gent")
  ) {
    value = "Male";
  } else if (UNISEX_ALIASES.has(s) || s.startsWith("uni")) {
    value = "Unisex";
  } else if (PAIR_ALIASES.has(s)) {
    value = "Pair";
  }

  if (!value) {
    return {
      value: "",
      raw: original,
      from: original,
      to: "",
      mapped: false,
      needsReview: true,
      unknown: true,
      known: false,
    };
  }

  return {
    value,
    raw: original,
    from: original,
    to: value,
    mapped: original !== value,
    needsReview: false,
    unknown: false,
    known: true,
  };
}

/** Detailed result (IMS pull feedback). Alias of mapGender. */
function normalizeGender(raw) {
  return mapGender(raw);
}

/** String-only helper for scrapers: canonical enum or "". */
function toCanonicalGender(raw) {
  return mapGender(raw).value;
}

/**
 * Normalize gender on an incoming enrichment/import bag (copy).
 */
function applyGenderNormalization(incoming) {
  if (!incoming || typeof incoming !== "object") {
    return { product: incoming, genderMap: null };
  }
  const product = { ...incoming };
  if (!Object.prototype.hasOwnProperty.call(product, "gender")) {
    return { product, genderMap: null };
  }
  const genderMap = mapGender(product.gender);
  product.gender = genderMap.value;
  return { product, genderMap };
}

module.exports = {
  CANONICAL_GENDERS,
  mapGender,
  normalizeGender,
  toCanonicalGender,
  applyGenderNormalization,
};
