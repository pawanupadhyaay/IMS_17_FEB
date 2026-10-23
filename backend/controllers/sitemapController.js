const { Product } = require("../models/Product");
const { Brand } = require("../models/Brand");
const Blog = require("../models/Blog");
const { getStrictStorefrontFilter } = require("../utils/storeEligibility");

// In-memory cache for sitemap XML (1 hour TTL)
let cachedSitemap = null;
let lastGeneratedTime = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

function escapeXml(unsafe) {
  if (!unsafe) return "";
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

function formatDate(date) {
  if (!date) return new Date().toISOString().split("T")[0];
  try {
    return new Date(date).toISOString().split("T")[0];
  } catch (_) {
    return new Date().toISOString().split("T")[0];
  }
}

/**
 * Generate high-fidelity Google XML Sitemap with Image extensions
 */
async function generateSitemapXml() {
  const SITE_URL = process.env.SITE_URL || "https://samaywatch.com";

  // 1. Core Static Pages
  const staticPages = [
    { loc: `${SITE_URL}/`, priority: "1.0", changefreq: "daily" },
    { loc: `${SITE_URL}/all-products`, priority: "0.9", changefreq: "daily" },
    { loc: `${SITE_URL}/repair-service`, priority: "0.7", changefreq: "monthly" },
    { loc: `${SITE_URL}/find-your-watch`, priority: "0.7", changefreq: "monthly" },
    { loc: `${SITE_URL}/our-presence`, priority: "0.6", changefreq: "monthly" },
    { loc: `${SITE_URL}/about-us`, priority: "0.6", changefreq: "monthly" },
    { loc: `${SITE_URL}/contact`, priority: "0.6", changefreq: "monthly" },
    { loc: `${SITE_URL}/blog`, priority: "0.7", changefreq: "weekly" },
    { loc: `${SITE_URL}/policies/terms`, priority: "0.3", changefreq: "yearly" },
    { loc: `${SITE_URL}/policies/privacy`, priority: "0.3", changefreq: "yearly" },
    { loc: `${SITE_URL}/policies/shipping`, priority: "0.3", changefreq: "yearly" },
  ];

  // 2. Fetch Live Products
  const productFilter = getStrictStorefrontFilter({ slug: { $exists: true, $ne: "" } });
  const products = await Product.find(productFilter)
    .select("slug title brand images updatedAt createdAt")
    .sort({ updatedAt: -1 })
    .lean();

  // 3. Fetch Published Brands
  const brands = await Brand.find({ isPublished: { $ne: false } })
    .select("slug name updatedAt")
    .lean();

  // 4. Fetch Live Blogs
  const blogs = await Blog.find({ status: "Live" })
    .select("slug title coverImage updatedAt")
    .lean();

  const today = new Date().toISOString().split("T")[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  // Static routes
  for (const page of staticPages) {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(page.loc)}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  // Brands / Collections
  for (const brand of brands) {
    if (!brand.slug) continue;
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(`${SITE_URL}/collections/${brand.slug}`)}</loc>\n`;
    xml += `    <lastmod>${formatDate(brand.updatedAt)}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.85</priority>\n`;
    xml += `  </url>\n`;
  }

  // Live Products with Google Image Extension
  for (const product of products) {
    if (!product.slug) continue;
    const prodUrl = `${SITE_URL}/products/${product.slug}`;
    const primaryImage = product.images?.[0];

    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(prodUrl)}</loc>\n`;
    xml += `    <lastmod>${formatDate(product.updatedAt || product.createdAt)}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.9</priority>\n`;

    if (primaryImage && typeof primaryImage === "string" && primaryImage.trim()) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXml(primaryImage.trim())}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(product.title || product.brand || "Watch")}</image:title>\n`;
      xml += `    </image:image>\n`;
    }

    xml += `  </url>\n`;
  }

  // Live Blogs
  for (const blog of blogs) {
    if (!blog.slug) continue;
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(`${SITE_URL}/blog/${blog.slug}`)}</loc>\n`;
    xml += `    <lastmod>${formatDate(blog.updatedAt)}</lastmod>\n`;
    xml += `    <changefreq>monthly</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    if (blog.coverImage) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXml(blog.coverImage)}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(blog.title || "Blog Post")}</image:title>\n`;
      xml += `    </image:image>\n`;
    }
    xml += `  </url>\n`;
  }

  xml += `</urlset>`;
  return xml;
}

/**
 * Controller to serve dynamic XML sitemap
 */
exports.getSitemapXml = async (req, res) => {
  try {
    const now = Date.now();
    // Return cached XML if fresh
    if (cachedSitemap && now - lastGeneratedTime < CACHE_DURATION_MS) {
      res.header("Content-Type", "application/xml; charset=utf-8");
      res.header("Cache-Control", "public, max-age=3600, s-maxage=3600");
      return res.send(cachedSitemap);
    }

    const xml = await generateSitemapXml();
    cachedSitemap = xml;
    lastGeneratedTime = now;

    res.header("Content-Type", "application/xml; charset=utf-8");
    res.header("Cache-Control", "public, max-age=3600, s-maxage=3600");
    return res.send(xml);
  } catch (error) {
    console.error("Error generating dynamic sitemap:", error);
    res.status(500).send("<!-- Error generating sitemap -->");
  }
};

exports.generateSitemapXml = generateSitemapXml;
