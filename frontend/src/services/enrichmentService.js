import api from './api'

/** Summary of Done / Left / Failed for all enrichment brands. */
export const getEnrichmentStatus = async (params = {}) => {
  const response = await api.get('/enrichment/status', { params })
  return response.data
}

/** Detail for one brand including SKU lists. */
export const getEnrichmentBrandStatus = async (brand) => {
  const response = await api.get(
    `/enrichment/status/${encodeURIComponent(brand)}`
  )
  return response.data
}

export const getEnrichmentBrands = async () => {
  const response = await api.get('/enrichment/brands')
  return response.data
}
