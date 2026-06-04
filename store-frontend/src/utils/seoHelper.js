/**
 * Dynamic SEO & Social Sharing Metadata Injector
 * Updates the document headers (Title, Meta description, Keywords, Robots, Canonical link, OpenGraph, and Twitter Cards) in real-time.
 * 
 * @param {Object} seoConfig Configuration details for page SEO
 * @param {string} seoConfig.title Page title tag
 * @param {string} seoConfig.description Page meta description tag (max 160 characters suggested)
 * @param {string} seoConfig.keywords Comma-separated list of keywords
 * @param {string} [seoConfig.ogImage] URL of the primary social sharing preview thumbnail
 * @param {string} [seoConfig.ogType] OpenGraph type (e.g. 'website', 'og:product')
 * @param {string} [seoConfig.canonicalUrl] Canonical master link of the page
 */
export function updatePageSEO({ title, description, keywords, ogImage, ogType = 'website', canonicalUrl }) {
  // 1. Dynamic Page Title
  if (title) {
    document.title = title;
  }

  // Helper to safely set/update meta elements
  const updateMetaTag = (attrName, attrVal, content) => {
    if (content == null) return;
    let el = document.querySelector(`meta[${attrName}="${attrVal}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // 2. Meta Description
  if (description) {
    updateMetaTag('name', 'description', description.slice(0, 160));
  }

  // 3. Meta Keywords
  if (keywords) {
    updateMetaTag('name', 'keywords', keywords);
  }

  // 4. Robots indexing (default index and follow for optimal crawl visibility)
  updateMetaTag('name', 'robots', 'index, follow');

  // 5. OpenGraph Tags
  if (title) updateMetaTag('property', 'og:title', title);
  if (description) updateMetaTag('property', 'og:description', description.slice(0, 160));
  updateMetaTag('property', 'og:type', ogType);
  updateMetaTag('property', 'og:url', canonicalUrl || window.location.href);
  if (ogImage) {
    updateMetaTag('property', 'og:image', ogImage);
  }

  // 6. Twitter Card Tags
  updateMetaTag('name', 'twitter:card', 'summary_large_image');
  if (title) updateMetaTag('name', 'twitter:title', title);
  if (description) updateMetaTag('name', 'twitter:description', description.slice(0, 160));
  if (ogImage) {
    updateMetaTag('name', 'twitter:image', ogImage);
  }

  // 7. Canonical Link Tag
  let canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonicalUrl || window.location.href);
}
