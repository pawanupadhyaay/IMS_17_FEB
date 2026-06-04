/**
 * Unified Image Pipeline - Single Source of Truth
 * Uses ONLY: product.images: string[]
 * 
 * No legacy fallbacks, no mixed contracts, no dual handling
 */

/**
 * Gets the primary (first) image URL for dashboard/thumbnails.
 * Order: product.images[0] (saved order from edit) then product.image.url (legacy).
 * @param {Object} product - Product object
 * @returns {string|null} - Primary image URL or null
 */
export function getThumbnailUrl(product) {
  if (!product) return null

  if (Array.isArray(product.images) && product.images.length > 0) {
    const first = product.images[0]
    if (typeof first === 'string' && first.trim() !== '') return first.trim()
  }

  if (product.image?.url && typeof product.image.url === 'string' && product.image.url.trim() !== '') {
    return product.image.url.trim()
  }
  return null
}

/**
 * Gets all valid image URLs from product.images array
 * @param {Object} product - Product object
 * @param {string[]} product.images - Array of image URLs
 * @returns {string[]} - Array of valid image URLs
 */
export function getImageUrls(product) {
  if (!product) return []
  
  // Single source of truth: product.images[]
  if (Array.isArray(product.images)) {
    // Filter and validate: only return valid string URLs
    return product.images.filter(
      (img) => typeof img === 'string' && img.trim() !== ''
    )
  }
  
  return []
}

/**
 * Checks if a value is a valid image URL string
 * @param {any} value - Value to check
 * @returns {boolean} - True if valid string URL
 */
export function isValidImageUrl(value) {
  return typeof value === 'string' && value.trim() !== ''
}

