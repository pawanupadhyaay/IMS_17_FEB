import api from './api';

const storeAdminService = {
  getDashboardStats: async () => {
    const response = await api.get('/store-admin/dashboard');
    return response.data;
  },
  getNotificationCounts: async () => {
    const response = await api.get('/store-admin/notifications/counts');
    return response.data;
  },
  markReviewsAsRead: async () => {
    const response = await api.post('/store-admin/reviews/mark-read');
    return response.data;
  },
  markOrdersAsRead: async () => {
    const response = await api.post('/store-admin/orders/mark-read');
    return response.data;
  },
  markQueriesAsRead: async () => {
    const response = await api.post('/store-admin/queries/mark-read');
    return response.data;
  },
  getOrders: async () => {
    const response = await api.get('/store-admin/orders');
    return response.data;
  },
  getCoupons: async () => {
    const response = await api.get('/store-admin/coupons');
    return response.data;
  },
  createCoupon: async (couponData) => {
    const response = await api.post('/store-admin/coupons', couponData);
    return response.data;
  },
  deleteCoupon: async (id) => {
    const response = await api.delete(`/store-admin/coupons/${id}`);
    return response.data;
  },
  updateCoupon: async (id, couponData) => {
    const response = await api.put(`/store-admin/coupons/${id}`, couponData);
    return response.data;
  },
  getBlogs: async () => {
    const response = await api.get('/store-admin/blogs');
    return response.data;
  },
  createBlog: async (blogData) => {
    const response = await api.post('/store-admin/blogs', blogData);
    return response.data;
  },
  deleteBlog: async (id) => {
    const response = await api.delete(`/store-admin/blogs/${id}`);
    return response.data;
  },
  updateBlog: async (id, blogData) => {
    const response = await api.put(`/store-admin/blogs/${id}`, blogData);
    return response.data;
  },
  getReviews: async () => {
    const response = await api.get('/store-admin/reviews');
    return response.data;
  },
  deleteReview: async (id) => {
    const response = await api.delete(`/store-admin/reviews/${id}`);
    return response.data;
  },
  updateReview: async (id, reviewData) => {
    const response = await api.put(`/store-admin/reviews/${id}`, reviewData);
    return response.data;
  },
  getCustomers: async () => {
    const response = await api.get('/store-admin/customers');
    return response.data;
  },
  getQueries: async () => {
    const response = await api.get('/store-admin/queries');
    return response.data;
  },
  updateQueryStatus: async (id, status) => {
    const response = await api.put(`/store-admin/queries/${id}`, { status });
    return response.data;
  },
  deleteQuery: async (id) => {
    const response = await api.delete(`/store-admin/queries/${id}`);
    return response.data;
  },
  getStaffs: async () => {
    const response = await api.get('/store-admin/staffs');
    return response.data;
  },
  createStaff: async (staffData) => {
    const response = await api.post('/store-admin/staffs', staffData);
    return response.data;
  },
  updateStaff: async (id, staffData) => {
    const response = await api.put(`/store-admin/staffs/${id}`, staffData);
    return response.data;
  },
  deleteStaff: async (id) => {
    const response = await api.delete(`/store-admin/staffs/${id}`);
    return response.data;
  }
};

export default storeAdminService;
