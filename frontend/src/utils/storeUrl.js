/**
 * Returns the public storefront URL for a given path (products, blogs, etc.)
 * Dynamically handles local development (http://localhost:5174) vs production (https://samaywatch.in)
 */
export const getStoreUrl = (path = '') => {
  const storeBase = import.meta.env.VITE_STORE_URL || (
    typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5174'
      : 'https://samaywatch.in'
  );
  
  if (!path) return storeBase;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${storeBase}${cleanPath}`;
};
