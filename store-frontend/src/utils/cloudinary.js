const CLOUD_NAME = "dnrbahpzc"

export const getSquareImage = (imageUrl, dimension = 800) => {
  if (!imageUrl) return ""

  // If Cloudinary bypass is active, return the raw imageUrl directly
  if (import.meta.env.VITE_BYPASS_CLOUDINARY === 'true') {
    if (imageUrl.startsWith("/")) {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      return `${API_BASE}${imageUrl}`
    }
    return imageUrl
  }

  const transforms = `e_trim/c_pad,ar_1:1,b_white,w_${dimension},h_${dimension}/f_auto/q_auto`

  // If the URL is already a Cloudinary URL, we should still apply transformations
  if (imageUrl.includes("res.cloudinary.com")) {
    // If it already has transformations (contains /upload/v123/ or similar), 
    // we try to inject ours or replace them.
    // Simple approach: if it has /upload/, inject transforms after it.
    if (imageUrl.includes("/upload/")) {
      return imageUrl.replace("/upload/", `/upload/${transforms}/`)
    }
    return imageUrl
  }

  // If we're on localhost or the URL is a relative path (like /uploads/...), 
  // skip Cloudinary fetch as it won't be able to reach local files.
  const isLocal =
    imageUrl.startsWith("/") ||
    imageUrl.includes("localhost") ||
    imageUrl.includes("127.0.0.1")

  if (isLocal) {
    // If it's a relative path, we need to prepend the API base URL
    if (imageUrl.startsWith("/")) {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      return `${API_BASE}${imageUrl}`
    }
    return imageUrl
  }

  const encodedUrl = encodeURIComponent(imageUrl);

  // Domain Bypass: Some domains (like Longines) block Cloudinary fetch.
  // We skip Cloudinary for these to prevent console noise (400 errors).
  const BLOCKED_DOMAINS = [
    'api.ecom.longines.com',
    'ecom.longines.com',
    'swarovski.com', // Added preventive bypasses
    'casio.com',
    'digitaloceanspaces.com'
  ];
  const isBlocked = BLOCKED_DOMAINS.some(domain => imageUrl.includes(domain));
  if (isBlocked) return imageUrl;

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/${transforms}/${encodedUrl}`;
}