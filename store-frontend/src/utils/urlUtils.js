/**
 * Global URL Generator for Samay Watch.
 * Ensures consistent, tiered URL structure: domain/collections/:category/:brand/:slug
 */

const getBrandPath = (brand) => {
  if (!brand) return '/all-products';
  return `/collections/${brand.slug || ''}`;
};

const getProductPath = (product) => {
  if (!product) return '/all-products';
  return `/products/${product.slug || ''}`;
};

export { getBrandPath, getProductPath };
