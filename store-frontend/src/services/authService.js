import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_BASE}/api/auth`,
});

// Interceptor to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("storeToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const authService = {
  login: async (credentials) => {
    const response = await api.post("/login", credentials);
    return response.data;
  },
  register: async (userData) => {
    const response = await api.post("/register", userData);
    return response.data;
  },
  getMe: async () => {
    const response = await api.get("/me");
    return response.data;
  },
  updateProfile: async (data) => {
    const response = await api.put("/update-me", data);
    return response.data;
  },
  forgotPassword: async (email) => {
    const response = await api.post("/forgot-password", { email });
    return response.data;
  },
  resetPassword: async (payload) => {
    const response = await api.post("/reset-password", payload);
    return response.data;
  },
  sendPhoneOtp: async (mobile) => {
    const response = await api.post("/phone-login/send-otp", { mobile });
    return response.data;
  },
  verifyPhoneOtp: async (mobile, otp) => {
    const response = await api.post("/phone-login/verify-otp", { mobile, otp });
    return response.data;
  },
  completePhoneRegistration: async (payload) => {
    const response = await api.post("/phone-login/complete-registration", payload);
    return response.data;
  },
  sendEmailOtp: async (email) => {
    const response = await api.post("/email-login/send-otp", { email });
    return response.data;
  },
  verifyEmailOtp: async (email, otp) => {
    const response = await api.post("/email-login/verify-otp", { email, otp });
    return response.data;
  },
  completeEmailRegistration: async (payload) => {
    const response = await api.post("/email-login/complete-registration", payload);
    return response.data;
  },
  changePassword: async (passwords) => {
    const response = await api.put("/change-password", passwords);
    return response.data;
  },
  getAddresses: async () => {
    const response = await api.get("/addresses");
    return response.data;
  },
  addAddress: async (addressData) => {
    const response = await api.post("/addresses", addressData);
    return response.data;
  },
  updateAddress: async (id, addressData) => {
    const response = await api.put(`/addresses/${id}`, addressData);
    return response.data;
  },
  deleteAddress: async (id) => {
    const response = await api.delete(`/addresses/${id}`);
    return response.data;
  },
};

export default authService;
