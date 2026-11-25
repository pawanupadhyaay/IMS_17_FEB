"use strict";

/**
 * Map scraped / retailer values onto IMS + storefront constrained option lists.
 *
 * Canonical lists mirror `frontend/src/constants/productOptions.js`.
 * Unknown / ambiguous values → "" (leave blank so staff can set).
 * Never invent values outside the allowed sets.
 *
 * Gender delegates to `./gender.js` (Male / Female / Unisex / Pair).
 */

const { toCanonicalGender, mapGender } = require("./gender");

// ---------- Allowed sets (keep in sync with productOptions.js) ----------

const CATEGORY_OPTIONS = [
  "Analog",
  "Fashion",
  "Mass",
  "Digital",
  "Smartwatch",
  "Chronograph",
  "Diving",
  "Sports",
  "Luxury",
  "Casual",
  "Formal",
  "Vintage",
  "WatchMaker",
];

const CASE_MATERIAL_OPTIONS = [
  "Stainless Steel",
  "Titanium",
  "Gold",
  "Rose Gold",
  "Silver",
  "Plastic",
  "Ceramic",
  "Carbon Fiber",
  "Brass",
  "Aluminum",
  "Resin",
  "Rubber",
];

const DIAL_COLOR_OPTIONS = [
  "Black",
  "Brown",
  "Blue",
  "Red",
  "Green",
  "White",
  "Grey",
  "Silver",
  "Gold",
  "Rose Gold",
  "Yellow",
  "Orange",
  "Olive Green",
  "Light Blue",
  "Light Green",
  "Leather Brown",
  "Leather Black",
  "Metal Silver",
  "Metal Gold",
  "Rubber Black",
  "Rubber Blue",
  "Fabric",
  "NATO",
  "Two Toned",
  "Multi Color",
  "Champagne",
  "Mother of Pearl",
  "Beige",
  "Bronze",
  "Pink",
  "Maroon",
  "Transparent",
  "GunMetal",
  "Lavender",
  "Ivory",
  "Anthracite",
  "Sunray Gilt",
  "Bordeaux",
  "Purple",
];

const WATER_RESISTANCE_OPTIONS = [
  "10m (1 ATM)",
  "30m (3 ATM)",
  "50m (5 ATM)",
  "70m (7 ATM)",
  "100m (10 ATM)",
  "150m (15 ATM)",
  "200m (20 ATM)",
  "250m (25 ATM)",
  "300m (30 ATM)",
  "500m (50 ATM)",
  "1000m (100 ATM)",
  "Not Water Resistant",
];

const WARRANTY_OPTIONS = [
  "1 years",
  "1.5 years",
  "2 years",
  "2.5 years",
  "3 years",
  "3.5 years",
  "4 years",
  "4.5 years",
  "5 years",
  "7 years",
];

const MOVEMENT_OPTIONS = [
  "Quartz",
  "Automatic",
  "Mechanical",
  "Solar-Powered",
  "Kinetic",
  "Eco-Drive",
  "Hybrid",
  "Smart",
];

/** IMS ProductModal / Dashboard dropdowns. Store filters surface Male/Female/Unisex from data. */
const GENDER_OPTIONS = ["Male", "Female", "Unisex", "Pair"];

const STRAP_COLOR_OPTIONS = [...DIAL_COLOR_OPTIONS];

const CASE_SHAPE_OPTIONS = [
  "Round",
  "Square",
  "Rectangular",
  "Hexagonal",
  "Octagon",
  "Oval",
  "Asymmetrical",
  "Tonneau",
];

const STRAP_MATERIAL_OPTIONS = [
  "Leather",
  "Stainless Steel",
  "Rubber",
  "Silicone",
  "Fabric",
  "Titanium",
  "Ceramic",
  "NATO",
  "Mesh",
  "Gold Plated",
  "Carbon Fiber",
  "Alligator Leather",
  "Crocodile Leather",
  "Calf Leather",
  "Synthetic",
  "Yellow PVD Coating",
  "Red PVD Coating",
];

const CONSTRAINED_FIELDS = [
  "gender",
  "movement",
  "caseShape",
  "caseMaterial",
  "strapMaterial",
  "dialColor",
  "strapColor",
  "waterResistance",
  "warrantyPeriod",
  "category",
];

// ---------- Helpers ----------

function clean(raw) {
  return String(raw == null ? "" : raw)
    .trim()
    .replace(/\s+/g, " ");
}

function fold(raw) {
  return clean(raw)
    .toLowerCase()
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[_/]+/g, " ")
    .replace(/[^a-z0-9.\s%-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function exactFromList(raw, list) {
  const s = clean(raw);
  if (!s) return "";
  const hit = list.find((opt) => opt.toLowerCase() === s.toLowerCase());
  return hit || "";
}

/**
 * Match against allowed list via synonym map + exact/case-insensitive.
 * Synonym keys must be fold()'d. Unknown → "".
 */
function mapToAllowed(raw, list, synonyms = {}) {
  const s = clean(raw);
  if (!s) return "";
  const exact = exactFromList(s, list);
  if (exact) return exact;

  const key = fold(s);
  if (Object.prototype.hasOwnProperty.call(synonyms, key)) {
    const mapped = synonyms[key];
    if (!mapped) return "";
    return exactFromList(mapped, list) || "";
  }
  return "";
}

// ---------- Field normalizers ----------

/** String canonical gender (or ""). Detailed map → `mapGender` in gender.js. */
function normalizeGender(raw) {
  return toCanonicalGender(raw);
}

const MOVEMENT_SYNONYMS = {
  quartz: "Quartz",
  "swiss quartz": "Quartz",
  "quartz movement": "Quartz",
  "quartz three hands": "Quartz",
  "quartz chronograph": "Quartz",
  automatic: "Automatic",
  "self winding": "Automatic",
  "self-winding": "Automatic",
  auto: "Automatic",
  mechanical: "Mechanical",
  "hand wound": "Mechanical",
  "hand-wound": "Mechanical",
  manual: "Mechanical",
  solar: "Solar-Powered",
  "solar powered": "Solar-Powered",
  "solar-powered": "Solar-Powered",
  kinetic: "Kinetic",
  "eco drive": "Eco-Drive",
  "eco-drive": "Eco-Drive",
  hybrid: "Hybrid",
  smart: "Smart",
  smartwatch: "Smart",
};

function normalizeMovement(raw) {
  return mapToAllowed(raw, MOVEMENT_OPTIONS, MOVEMENT_SYNONYMS);
}

const CASE_SHAPE_SYNONYMS = {
  round: "Round",
  circular: "Round",
  circle: "Round",
  square: "Square",
  rectangular: "Rectangular",
  rectangle: "Rectangular",
  rect: "Rectangular",
  hexagonal: "Hexagonal",
  hexagon: "Hexagonal",
  octagon: "Octagon",
  octagonal: "Octagon",
  oval: "Oval",
  asymmetrical: "Asymmetrical",
  asymmetric: "Asymmetrical",
  tonneau: "Tonneau",
  cushion: "Tonneau",
};

function normalizeCaseShape(raw) {
  return mapToAllowed(raw, CASE_SHAPE_OPTIONS, CASE_SHAPE_SYNONYMS);
}

const CASE_MATERIAL_SYNONYMS = {
  "stainless steel": "Stainless Steel",
  steel: "Stainless Steel",
  "inox": "Stainless Steel",
  "ss": "Stainless Steel",
  titanium: "Titanium",
  gold: "Gold",
  "yellow gold": "Gold",
  "rose gold": "Rose Gold",
  "pink gold": "Rose Gold",
  silver: "Silver",
  plastic: "Plastic",
  resin: "Resin",
  ceramic: "Ceramic",
  "carbon fiber": "Carbon Fiber",
  "carbon fibre": "Carbon Fiber",
  brass: "Brass",
  aluminum: "Aluminum",
  aluminium: "Aluminum",
  rubber: "Rubber",
  // Titan / SFCC often labels steel cases as generic "Metal"
  metal: "Stainless Steel",
};

function normalizeCaseMaterial(raw) {
  const s = clean(raw);
  if (!s) return "";
  // Complex bi-color / PVD phrases are not in the dropdown — leave for staff
  const key = fold(s);
  if (
    /\bbicolor\b|\bbi color\b|\bpvd\b|\bcoating\b|\band\b/.test(key) &&
    !CASE_MATERIAL_SYNONYMS[key]
  ) {
    return "";
  }
  return mapToAllowed(s, CASE_MATERIAL_OPTIONS, CASE_MATERIAL_SYNONYMS);
}

const STRAP_MATERIAL_SYNONYMS = {
  leather: "Leather",
  "genuine leather": "Leather",
  "stainless steel": "Stainless Steel",
  steel: "Stainless Steel",
  bracelet: "Stainless Steel",
  "metal bracelet": "Stainless Steel",
  metal: "Stainless Steel",
  rubber: "Rubber",
  silicone: "Silicone",
  silicon: "Silicone",
  fabric: "Fabric",
  textile: "Fabric",
  nylon: "Fabric",
  titanium: "Titanium",
  ceramic: "Ceramic",
  nato: "NATO",
  mesh: "Mesh",
  milanese: "Mesh",
  "gold plated": "Gold Plated",
  "gold-plated": "Gold Plated",
  "carbon fiber": "Carbon Fiber",
  "carbon fibre": "Carbon Fiber",
  alligator: "Alligator Leather",
  "alligator leather": "Alligator Leather",
  crocodile: "Crocodile Leather",
  "crocodile leather": "Crocodile Leather",
  calf: "Calf Leather",
  "calf leather": "Calf Leather",
  synthetic: "Synthetic",
  "yellow pvd": "Yellow PVD Coating",
  "yellow pvd coating": "Yellow PVD Coating",
  "red pvd": "Red PVD Coating",
  "red pvd coating": "Red PVD Coating",
};

function normalizeStrapMaterial(raw) {
  return mapToAllowed(raw, STRAP_MATERIAL_OPTIONS, STRAP_MATERIAL_SYNONYMS);
}

const COLOR_SYNONYMS = {
  black: "Black",
  brown: "Brown",
  blue: "Blue",
  red: "Red",
  green: "Green",
  white: "White",
  grey: "Grey",
  gray: "Grey",
  silver: "Silver",
  gold: "Gold",
  "yellow gold": "Gold",
  "mirror gold": "Gold",
  "rose gold": "Rose Gold",
  "pink gold": "Rose Gold",
  yellow: "Yellow",
  orange: "Orange",
  "olive green": "Olive Green",
  "olive": "Olive Green",
  "light blue": "Light Blue",
  "light green": "Light Green",
  "leather brown": "Leather Brown",
  "leather black": "Leather Black",
  "metal silver": "Metal Silver",
  "metal gold": "Metal Gold",
  "rubber black": "Rubber Black",
  "rubber blue": "Rubber Blue",
  fabric: "Fabric",
  nato: "NATO",
  "two toned": "Two Toned",
  "two-tone": "Two Toned",
  "two tone": "Two Toned",
  bicolor: "Two Toned",
  "bi color": "Two Toned",
  multicolor: "Multi Color",
  "multi color": "Multi Color",
  "multi-colour": "Multi Color",
  "multi colour": "Multi Color",
  multi: "Multi Color",
  champagne: "Champagne",
  "mother of pearl": "Mother of Pearl",
  mop: "Mother of Pearl",
  "white mother of pearl": "Mother of Pearl",
  "pink mother of pearl": "Mother of Pearl",
  beige: "Beige",
  bronze: "Bronze",
  pink: "Pink",
  maroon: "Maroon",
  transparent: "Transparent",
  clear: "Transparent",
  gunmetal: "GunMetal",
  "gun metal": "GunMetal",
  lavender: "Lavender",
  ivory: "Ivory",
  "opaline ivory": "Ivory",
  "silver opaline": "Silver",
  "opaline silver": "Silver",
  anthracite: "Anthracite",
  "sunray gilt": "Sunray Gilt",
  bordeaux: "Bordeaux",
  burgundy: "Bordeaux",
  purple: "Purple",
};

function normalizeDialColor(raw) {
  return mapToAllowed(raw, DIAL_COLOR_OPTIONS, COLOR_SYNONYMS);
}

function normalizeStrapColor(raw) {
  return mapToAllowed(raw, STRAP_COLOR_OPTIONS, COLOR_SYNONYMS);
}

/**
 * Map metres / ATM / bar phrases onto WATER_RESISTANCE_OPTIONS.
 * Unknown depths → "".
 */
function normalizeWaterResistance(raw) {
  const s = clean(raw);
  if (!s) return "";
  const exact = exactFromList(s, WATER_RESISTANCE_OPTIONS);
  if (exact) return exact;

  const key = fold(s);
  if (
    /not water|non.?water|no water/.test(key) ||
    key === "0m" ||
    key === "0"
  ) {
    return "Not Water Resistant";
  }

  let metres = null;
  const bar = s.match(/([\d.]+)\s*bar/i);
  const atm = s.match(/([\d.]+)\s*atm/i);
  const mOnly = s.match(/([\d.]+)\s*m(?:eters?|etres?)?\b/i);
  if (bar) metres = Math.round(Number(bar[1]) * 10);
  else if (atm) metres = Math.round(Number(atm[1]) * 10);
  else if (mOnly) metres = Math.round(Number(mOnly[1]));

  // Also accept "~50m" inside "5 bar (~50m)"
  if (metres == null) {
    const approx = s.match(/~\s*([\d.]+)\s*m/i);
    if (approx) metres = Math.round(Number(approx[1]));
  }

  if (metres == null || !Number.isFinite(metres)) return "";

  const byMetres = {
    10: "10m (1 ATM)",
    30: "30m (3 ATM)",
    50: "50m (5 ATM)",
    70: "70m (7 ATM)",
    100: "100m (10 ATM)",
    150: "150m (15 ATM)",
    200: "200m (20 ATM)",
    250: "250m (25 ATM)",
    300: "300m (30 ATM)",
    500: "500m (50 ATM)",
    1000: "1000m (100 ATM)",
  };
  return byMetres[metres] || "";
}

function normalizeWarrantyPeriod(raw) {
  const s = clean(raw);
  if (!s) return "";
  const exact = exactFromList(s, WARRANTY_OPTIONS);
  if (exact) return exact;

  const years = s.match(/(\d+(?:\.\d+)?)\s*years?/i);
  if (years) {
    const n = years[1];
    const candidate = `${n} years`;
    return exactFromList(candidate, WARRANTY_OPTIONS) || "";
  }

  // Titan / retailers often say "24 Months"
  const months = s.match(/(\d+(?:\.\d+)?)\s*months?/i);
  if (months) {
    const m = Number(months[1]);
    if (Number.isFinite(m) && m > 0) {
      const y = m / 12;
      const pretty = Number.isInteger(y) ? String(y) : String(y);
      return exactFromList(`${pretty} years`, WARRANTY_OPTIONS) || "";
    }
  }
  return "";
}

const CATEGORY_SYNONYMS = {
  analog: "Analog",
  analogue: "Analog",
  fashion: "Fashion",
  mass: "Mass",
  digital: "Digital",
  smartwatch: "Smartwatch",
  "smart watch": "Smartwatch",
  chronograph: "Chronograph",
  diving: "Diving",
  diver: "Diving",
  sports: "Sports",
  sport: "Sports",
  luxury: "Luxury",
  casual: "Casual",
  formal: "Formal",
  vintage: "Vintage",
  watchmaker: "WatchMaker",
  "watch maker": "WatchMaker",
};

function normalizeCategory(raw) {
  return mapToAllowed(raw, CATEGORY_OPTIONS, CATEGORY_SYNONYMS);
}

/**
 * Brand is free-text on Product but should match Brands.name casing when known.
 * Pass optional `brandNames` (array of canonical names). Unknown → trimmed original
 * only when it already matches a brand; otherwise leave as trimmed scrape (staff
 * can fix). We do NOT blank brand — empty brand breaks listing.
 */
function normalizeBrand(raw, brandNames = []) {
  const s = clean(raw);
  if (!s) return "";
  if (Array.isArray(brandNames) && brandNames.length) {
    const hit = brandNames.find((b) => fold(b) === fold(s));
    if (hit) return hit;
  }
  // Common scrape casing for known brands
  if (fold(s) === "balmain") return "Balmain";
  if (fold(s) === "titan") return "Titan";
  return s;
}

function normalizeCaseSize(raw) {
  if (!raw) return "";
  const n = String(raw).trim();
  if (/mm/i.test(n)) {
    return n
      .replace(/\s+/g, "")
      .replace(/\.00(?=mm)/i, "")
      .replace(/mm$/i, "mm");
  }
  const num = n.replace(/[^\d.]/g, "");
  if (!num) return n;
  const pretty = num.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  return `${pretty}mm`;
}

/**
 * Normalize all constrained product fields on a scrape / merge bag.
 * Free-text fields (title, description, caseSize, seo*, images) pass through.
 * Returns { product, mapped, unmapped } for UI feedback.
 */
function normalizeProductFields(input, options = {}) {
  const src = input && typeof input === "object" ? { ...input } : {};
  const mapped = {};
  const unmapped = {};

  const apply = (field, fn, raw) => {
    if (raw == null || (typeof raw === "string" && !raw.trim())) {
      src[field] = src[field] == null ? "" : src[field];
      return;
    }
    const before = clean(raw);
    const after = fn(raw);
    src[field] = after;
    if (after && fold(after) !== fold(before)) {
      mapped[field] = { from: before, to: after };
    } else if (!after && before) {
      unmapped[field] = before;
      // blank so staff can set — do not keep invalid enum
      src[field] = "";
    } else if (after && fold(after) === fold(before) && after !== before) {
      // casing-only fix
      mapped[field] = { from: before, to: after };
    }
  };

  if ("gender" in src) apply("gender", normalizeGender, src.gender);
  if ("movement" in src) apply("movement", normalizeMovement, src.movement);
  if ("caseShape" in src) apply("caseShape", normalizeCaseShape, src.caseShape);
  if ("caseMaterial" in src)
    apply("caseMaterial", normalizeCaseMaterial, src.caseMaterial);
  if ("strapMaterial" in src)
    apply("strapMaterial", normalizeStrapMaterial, src.strapMaterial);
  if ("dialColor" in src) apply("dialColor", normalizeDialColor, src.dialColor);
  if ("strapColor" in src)
    apply("strapColor", normalizeStrapColor, src.strapColor);
  if ("waterResistance" in src)
    apply("waterResistance", normalizeWaterResistance, src.waterResistance);
  if ("warrantyPeriod" in src)
    apply("warrantyPeriod", normalizeWarrantyPeriod, src.warrantyPeriod);
  if ("category" in src) apply("category", normalizeCategory, src.category);
  if ("caseSize" in src && src.caseSize) {
    const before = clean(src.caseSize);
    const after = normalizeCaseSize(src.caseSize);
    src.caseSize = after;
    if (after && after !== before) mapped.caseSize = { from: before, to: after };
  }
  if ("brand" in src && src.brand) {
    const before = clean(src.brand);
    const after = normalizeBrand(src.brand, options.brandNames);
    src.brand = after;
    if (after && after !== before) mapped.brand = { from: before, to: after };
  }

  // Never invent publish state from scrape (scrape ≠ approve).
  // Approve / approved-batch apply sets isPublished — see lib/publishOnApprove.js.
  if ("isPublished" in src && src.isPublished != null) {
    // scrapes should omit; ignore inventing publish here
  }

  return { product: src, mapped, unmapped };
}

module.exports = {
  CATEGORY_OPTIONS,
  CASE_MATERIAL_OPTIONS,
  DIAL_COLOR_OPTIONS,
  WATER_RESISTANCE_OPTIONS,
  WARRANTY_OPTIONS,
  MOVEMENT_OPTIONS,
  GENDER_OPTIONS,
  STRAP_COLOR_OPTIONS,
  CASE_SHAPE_OPTIONS,
  STRAP_MATERIAL_OPTIONS,
  CONSTRAINED_FIELDS,
  normalizeGender,
  mapGender,
  toCanonicalGender,
  normalizeMovement,
  normalizeCaseShape,
  normalizeCaseMaterial,
  normalizeStrapMaterial,
  normalizeDialColor,
  normalizeStrapColor,
  normalizeWaterResistance,
  normalizeWarrantyPeriod,
  normalizeCategory,
  normalizeBrand,
  normalizeCaseSize,
  normalizeProductFields,
  exactFromList,
  fold,
  clean,
};
