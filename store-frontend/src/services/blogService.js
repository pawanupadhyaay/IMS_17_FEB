import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

const blogService = {
  getBlogs: async () => {
    const response = await api.get('/api/blogs');
    return response.data;
  },

  getBlogBySlug: async (slug) => {
    const response = await api.get(`/api/blogs/${slug}`);
    return response.data;
  }
};

export default blogService;
