import axios from 'axios'

// Local default (macOS often binds :5000 to AirPlay Receiver → 403).
// Prefer VITE_API_URL from .env.development.local / .env.
const FALLBACK_API_URL = 'http://localhost:5055/api'

const baseURL = import.meta.env.VITE_API_URL || FALLBACK_API_URL

const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor (token)
api.interceptors.request.use(
  (config) => {
    // Prefer long-lived token from localStorage, fall back to sessionStorage
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('token') || sessionStorage.getItem('token')
        : null
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data)
    } else if (error.request) {
      console.error('API Error: No response received', error.request)
    } else {
      console.error('API Error:', error.message)
    }
    return Promise.reject(error)
  }
)

export default api
