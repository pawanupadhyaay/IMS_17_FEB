import api from './api'

export const getProducts = async (params = {}) => {
  const response = await api.get('/products', { params })
  return response.data
}

export const getProduct = async (id) => {
  const response = await api.get(`/products/${id}`)
  return response.data
}

export const createProduct = async (productData) => {
  const response = await api.post('/products', productData)
  return response.data
}

export const updateProduct = async (id, productData) => {
  const response = await api.put(`/products/${id}`, productData)
  return response.data
}

// Optimized partial update - only send changed fields
export const patchProduct = async (id, partialData) => {
  const response = await api.patch(`/products/${id}`, partialData)
  return response.data
}

export const deleteProduct = async (id) => {
  const response = await api.delete(`/products/${id}`)
  return response.data
}

export const patchProductsBulk = async (data) => {
  const response = await api.patch('/products/bulk/update', data)
  return response.data
}

export const deleteProductsBulk = async (data) => {
  const response = await api.post('/products/bulk/delete', data)
  return response.data
}

export const getBrands = async () => {
  const response = await api.get('/products/brands/list')
  return response.data
}

/** Pull Balmain enrichment into a product (staff-wins fill-empty). */
export const pullBalmainEnrichment = async (id, options = {}) => {
  const response = await api.post(`/products/${id}/enrich/balmain`, options)
  return response.data
}

/** Pull Titan enrichment into a product (staff-wins fill-empty). */
export const pullTitanEnrichment = async (id, options = {}) => {
  const response = await api.post(`/products/${id}/enrich/titan`, options)
  return response.data
}

/** Pull Timex enrichment into a product (staff-wins fill-empty). */
export const pullTimexEnrichment = async (id, options = {}) => {
  const response = await api.post(`/products/${id}/enrich/timex`, options)
  return response.data
}

/**
 * Pull enrichment by product brand (Balmain / Titan / Timex / Tissot / Fossil / Casio / Seiko / Longines / Rado / Emporio Armani).
 * Prefer this for the unified "Get details" button.
 */
export const pullProductEnrichment = async (id, options = {}) => {
  const response = await api.post(`/products/${id}/enrich`, options)
  return response.data
}

/** Approve & go live — sets isPublished=true immediately (owner/admin; sold-out OK). */
export const publishProduct = async (id) => {
  const response = await api.post(`/products/${id}/publish`)
  return response.data
}
