import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE}/api/store`,
});

// Interceptor to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("storeToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const storeOrderService = {
  getMyOrders: async () => {
    const response = await api.get('/my-orders');
    return response.data;
  },
  getOrderTracking: async (id) => {
    const response = await api.get(`/my-orders/${id}/track`);
    return response.data;
  },
};

export default storeOrderService;
