import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * Fetch new arrivals for homepage.
 * @returns {Promise<Array>} Array of product objects
 */
export async function getNewArrivals(gender = '') {
  let url = '/api/store/products/home/new-arrivals'
  if (gender && gender !== 'ALL') {
    url += `?gender=${encodeURIComponent(gender)}`
  }
  const { data } = await api.get(url)
  if (data?.success && Array.isArray(data.data)) return data.data
  return []
}
