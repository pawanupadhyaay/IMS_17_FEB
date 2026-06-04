/**
 * Slugify utility for eCommerce product URLs.
 * Generates URL-safe slugs from product fields.
 * @param {...string} parts - Parts to join (e.g. brand, title, sku)
 * @returns {string} Lowercase, hyphen-separated slug with special chars removed
 */
function slugify(...parts) {
  const combined = parts
    .filter(Boolean)
    .map((p) => String(p).trim())
    .join(" ");

  return combined
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters (keep alphanumeric, spaces, hyphens)
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, ""); // Trim leading/trailing hyphens
}

/**
 * Specifically generates a product slug in the format: brand-with-sku
 */
function generateProductSlug(brand, sku) {
  const brandPart = slugify(brand || "product");
  const skuPart = slugify(sku || String(Date.now()));
  return `${brandPart}-with-${skuPart}`;
}

module.exports = { slugify, generateProductSlug };
