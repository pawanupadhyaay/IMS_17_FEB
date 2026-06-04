import { createContext, useContext, useState, useEffect } from "react";
import authService from "../services/authService";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from token on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem("storeToken");
      if (token) {
        try {
          const res = await authService.getMe();
          if (res.success) {
            setUser(res.user);
          } else {
            localStorage.removeItem("storeToken");
          }
        } catch (error) {
          console.error("Auth load error:", error);
          localStorage.removeItem("storeToken");
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const login = async (credentials) => {
    try {
      const data = await authService.login(credentials);
      if (data.success) {
        localStorage.setItem("storeToken", data.token);
        setUser(data.user);
        return { success: true };
      }
      return { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Login failed" };
    }
  };

  const register = async (userData) => {
    try {
      const data = await authService.register(userData);
      if (data.success) {
        localStorage.setItem("storeToken", data.token);
        setUser(data.user);
        return { success: true };
      }
      return { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Registration failed" };
    }
  };

  const logout = () => {
    localStorage.removeItem("storeToken");
    setUser(null);
  };

  const forgotPassword = async (email) => {
    try {
      const data = await authService.forgotPassword(email);
      return data;
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Failed to request password reset code" };
    }
  };

  const resetPassword = async (payload) => {
    try {
      const data = await authService.resetPassword(payload);
      return data;
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Failed to reset password" };
    }
  };

  const sendPhoneOtp = async (mobile) => {
    try {
      const data = await authService.sendPhoneOtp(mobile);
      return data;
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Failed to send OTP" };
    }
  };

  const verifyPhoneOtp = async (mobile, otp) => {
    try {
      const data = await authService.verifyPhoneOtp(mobile, otp);
      if (data.success && !data.isNewUser) {
        localStorage.setItem("storeToken", data.token);
        setUser(data.user);
      }
      return data;
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Failed to verify OTP" };
    }
  };

  const completePhoneRegistration = async (payload) => {
    try {
      const data = await authService.completePhoneRegistration(payload);
      if (data.success) {
        localStorage.setItem("storeToken", data.token);
        setUser(data.user);
      }
      return data;
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Failed to complete registration" };
    }
  };

  const sendEmailOtp = async (email) => {
    try {
      const data = await authService.sendEmailOtp(email);
      return data;
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Failed to send email OTP" };
    }
  };

  const verifyEmailOtp = async (email, otp) => {
    try {
      const data = await authService.verifyEmailOtp(email, otp);
      if (data.success && !data.isNewUser) {
        localStorage.setItem("storeToken", data.token);
        setUser(data.user);
      }
      return data;
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Failed to verify email OTP" };
    }
  };

  const completeEmailRegistration = async (payload) => {
    try {
      const data = await authService.completeEmailRegistration(payload);
      if (data.success) {
        localStorage.setItem("storeToken", data.token);
        setUser(data.user);
      }
      return data;
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Failed to complete email registration" };
    }
  };

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  return (
    <AuthContext.Provider value={{ 
      user, setUser, loading, login, register, logout,
      isAuthModalOpen, openAuthModal, closeAuthModal,
      forgotPassword, resetPassword,
      sendPhoneOtp, verifyPhoneOtp, completePhoneRegistration,
      sendEmailOtp, verifyEmailOtp, completeEmailRegistration
    }}>
      {children}
    </AuthContext.Provider>
  );
};
