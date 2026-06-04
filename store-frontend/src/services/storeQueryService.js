import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_BASE}/api/store/queries`,
});

// Interceptor to add Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("storeToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const storeQueryService = {
  getMyQueries: async () => {
    const response = await api.get("/my-queries");
    return response.data;
  },
  submitQuery: async (queryData) => {
    const response = await api.post("/", queryData);
    return response.data;
  },
};

export default storeQueryService;
