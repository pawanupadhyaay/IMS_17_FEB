import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Phone, CheckCircle2, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthModal() {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    login, 
    register, 
    forgotPassword, 
    resetPassword,
    sendPhoneOtp,
    verifyPhoneOtp,
    completePhoneRegistration,
    sendEmailOtp,
    verifyEmailOtp,
    completeEmailRegistration
  } = useAuth();
  
  const [view, setView] = useState('email-login'); // 'phone-login', 'phone-otp', 'phone-register', 'email-login', 'email-otp', 'email-register', 'login', 'signup', 'forgot', 'reset'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
  });

  // Forgot / Reset password local states
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Frictionless Phone Onboarding states
  const [phoneMobile, setPhoneMobile] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneRegData, setPhoneRegData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  // Frictionless Email Onboarding states
  const [emailAddress, setEmailAddress] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailRegData, setEmailRegData] = useState({
    firstName: '',
    lastName: '',
    mobile: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (view === 'login') {
      const res = await login({ email: formData.email, password: formData.password });
      if (res.success) {
        closeAuthModal();
      } else {
        setError(res.message);
      }
    } else if (view === 'signup') {
      const res = await register(formData);
      if (res.success) {
        closeAuthModal();
        resetForm();
        setView('login');
      } else {
        setError(res.message);
      }
    }
    setLoading(false);
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setError("Please enter your email address");
      return;
    }
    setLoading(true);
    setError('');

    const res = await forgotPassword(forgotEmail);
    if (res.success) {
      import('react-hot-toast').then(({ toast }) => {
        toast.success("Verification code sent to your email", { id: 'forgot-pass-toast', icon: '📧' });
      });
      setView('reset');
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetOtp.trim() || resetOtp.length !== 4) {
      setError("Please enter a valid 4-digit code");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    setError('');

    const res = await resetPassword({
      email: forgotEmail,
      otp: resetOtp,
      password: newPassword
    });

    if (res.success) {
      import('react-hot-toast').then(({ toast }) => {
        toast.success("Password updated successfully. Please sign in.", { id: 'reset-success-toast', icon: '🔑' });
      });
      setView('login');
      // Reset local states
      setForgotEmail('');
      setResetOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', mobile: '', password: '' });
    setForgotEmail('');
    setResetOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPhoneMobile('');
    setPhoneOtp('');
    setPhoneRegData({ firstName: '', lastName: '', email: '' });
    setEmailAddress('');
    setEmailOtp('');
    setEmailRegData({ firstName: '', lastName: '', mobile: '' });
    setError('');
  };

  const handlePhoneLoginSubmit = async (e) => {
    e.preventDefault();
    const cleanMobile = phoneMobile.replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    setError('');

    const res = await sendPhoneOtp(cleanMobile);
    if (res.success) {
      import('react-hot-toast').then(({ toast }) => {
        toast.success("Verification code sent to your phone", { id: 'phone-otp-toast', icon: '📱' });
      });
      setView('phone-otp');
      // Dev Mode Simulated OTP autofill or helper
      if (res.devOtp) {
        import('react-hot-toast').then(({ toast }) => {
          toast(`[DEV MODE] Simulated OTP: ${res.devOtp}`, { duration: 6000, icon: '🔑' });
        });
        setPhoneOtp(res.devOtp); // Pre-fill the OTP directly for seamless dev testing!
      }
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  const handlePhoneOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    if (phoneOtp.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }
    setLoading(true);
    setError('');

    const res = await verifyPhoneOtp(phoneMobile, phoneOtp);
    if (res.success) {
      if (res.isNewUser) {
        import('react-hot-toast').then(({ toast }) => {
          toast.success("Phone verified successfully", { id: 'phone-verified-toast', icon: '✅' });
        });
        setView('phone-register');
      } else {
        import('react-hot-toast').then(({ toast }) => {
          toast.success("Logged in successfully", { id: 'phone-login-success', icon: '🎉' });
        });
        closeAuthModal();
        resetForm();
      }
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  const handlePhoneRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!phoneRegData.firstName.trim() || !phoneRegData.lastName.trim() || !phoneRegData.email.trim()) {
      setError("Please provide your first name, last name, and email");
      return;
    }
    setLoading(true);
    setError('');

    const payload = {
      mobile: phoneMobile,
      firstName: phoneRegData.firstName,
      lastName: phoneRegData.lastName,
      email: phoneRegData.email
    };

    const res = await completePhoneRegistration(payload);
    if (res.success) {
      import('react-hot-toast').then(({ toast }) => {
        toast.success("Account created and verified", { id: 'phone-reg-success', icon: '🎉' });
      });
      closeAuthModal();
      resetForm();
    } else {
      setError(res.message);
    }
  };

  const handleEmailLoginSubmit = async (e) => {
    e.preventDefault();
    if (!emailAddress || !emailAddress.includes('@')) {
      setError("Please enter a valid email address");
      return;
    }
    setLoading(true);
    setError('');

    const res = await sendEmailOtp(emailAddress);
    if (res.success) {
      import('react-hot-toast').then(({ toast }) => {
        toast.success("Verification code sent to your email", { id: 'email-otp-toast', icon: '📧' });
      });
      setView('email-otp');
      // Dev Mode Simulated OTP autofill or helper
      if (res.devOtp) {
        import('react-hot-toast').then(({ toast }) => {
          toast(`[DEV MODE] Simulated OTP: ${res.devOtp}`, { duration: 6000, icon: '🔑' });
        });
        setEmailOtp(res.devOtp); // Pre-fill the OTP directly for seamless dev testing!
      }
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  const handleEmailOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    if (emailOtp.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }
    setLoading(true);
    setError('');

    const res = await verifyEmailOtp(emailAddress, emailOtp);
    if (res.success) {
      if (res.isNewUser) {
        import('react-hot-toast').then(({ toast }) => {
          toast.success("Email verified successfully", { id: 'email-verified-toast', icon: '✅' });
        });
        setView('email-register');
      } else {
        import('react-hot-toast').then(({ toast }) => {
          toast.success("Logged in successfully", { id: 'email-login-success', icon: '🎉' });
        });
        closeAuthModal();
        resetForm();
      }
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  const handleEmailRegisterSubmit = async (e) => {
    e.preventDefault();
    const cleanMobile = emailRegData.mobile.replace(/\D/g, '');
    if (!emailRegData.firstName.trim() || !emailRegData.lastName.trim() || !cleanMobile || cleanMobile.length !== 10) {
      setError("Please provide first name, last name, and a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    setError('');

    const payload = {
      email: emailAddress,
      firstName: emailRegData.firstName,
      lastName: emailRegData.lastName,
      mobile: cleanMobile
    };

    const res = await completeEmailRegistration(payload);
    if (res.success) {
      import('react-hot-toast').then(({ toast }) => {
        toast.success("Account created and verified", { id: 'email-reg-success', icon: '🎉' });
      });
      closeAuthModal();
      resetForm();
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  const toggleView = () => {
    setView(view === 'login' ? 'signup' : 'login');
    resetForm();
  };

  if (!isAuthModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAuthModal}
          className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-[1000px] overflow-hidden bg-white shadow-2xl rounded-3xl flex flex-col md:flex-row h-[90vh] max-h-[700px]"
        >
          {/* Close Button */}
          <button
            onClick={closeAuthModal}
            className="absolute right-4 top-4 md:left-[calc(50%-3rem)] md:right-auto md:bg-white/50 backdrop-blur-md rounded-full p-2 text-neutral-500 hover:text-neutral-900 transition-colors z-20"
          >
            <X className="size-5" />
          </button>

          {/* Left Panel - Form */}
          <div className="flex-1 w-full md:w-1/2 flex flex-col justify-center px-8 sm:px-16 py-10 overflow-y-auto">
            <div className="w-full max-w-sm mx-auto">
              {/* Logo / Brand Name */}
              <div className="mb-8 flex justify-center items-center">
                <img 
                  src="https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/samay_logo.png" 
                  alt="Samay Watch Logo" 
                  className="h-10 md:h-12 w-auto object-contain" 
                />
              </div>

              {/* Title & Desc depending on view */}
              <h2 className="font-serif text-3xl font-medium text-neutral-900 mb-2">
                {(view === 'phone-login' || view === 'email-login') && 'Login/Sign up'}
                {(view === 'phone-otp' || view === 'email-otp') && 'Verify OTP'}
                {(view === 'phone-register' || view === 'email-register') && 'Complete Profile'}
                {view === 'login' && 'Welcome!'}
                {view === 'signup' && 'Create Account'}
                {view === 'forgot' && 'Reset Password'}
                {view === 'reset' && 'Verify Reset Code'}
              </h2>
              <p className="text-sm text-neutral-500 mb-6 leading-relaxed pr-4">
                {view === 'phone-login' && 'Please enter your mobile number to instantly log in or register via OTP.'}
                {view === 'email-login' && 'Please enter your email address to instantly log in or register via OTP.'}
                {view === 'phone-otp' && `Please enter your 6-digit OTP code sent to your phone number +91 ${phoneMobile}.`}
                {view === 'email-otp' && `Please enter your 6-digit OTP code sent to your email address ${emailAddress}.`}
                {view === 'phone-register' && 'Please enter your email and name to finalize your profile registration.'}
                {view === 'email-register' && 'Please enter your mobile number and name to finalize your profile registration.'}
                {view === 'login' && 'Sign in to access your premium orders, exclusive wishlists, and tailored experiences.'}
                {view === 'signup' && 'Join our exclusive club to experience premium timepieces and VIP offers.'}
                {view === 'forgot' && 'Enter your registered email address below, and we will send you a 4-digit code to verify your identity.'}
                {view === 'reset' && `We have sent a verification code to ${forgotEmail}. Please enter the code along with your new password.`}
              </p>

              {error && (
                <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100 flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 font-bold">!</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Dynamic View rendering */}
              <AnimatePresence mode="wait">
                {view === 'phone-login' && (
                  <motion.form 
                    key="phone-login-form"
                    onSubmit={handlePhoneLoginSubmit} 
                    className="space-y-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="flex gap-2">
                      <div className="w-[80px] shrink-0 relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-neutral-400">
                          <span className="text-sm font-bold">+91</span>
                        </div>
                        <input
                          type="text"
                          disabled
                          className="block w-full rounded-2xl border-0 bg-[#E9ECEF] py-4 pl-12 text-neutral-500 font-bold select-none cursor-not-allowed sm:text-sm text-center"
                          value=""
                        />
                      </div>
                      <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-neutral-400">
                          <Phone className="size-4" />
                        </div>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          value={phoneMobile}
                          onChange={e => { setPhoneMobile(e.target.value.replace(/\D/g, '')); setError(''); }}
                          className="block w-full rounded-2xl border-0 bg-[#F5F7FA] py-4 pl-11 pr-4 text-neutral-900 ring-0 transition-colors focus:bg-[#EDF1F6] focus:outline-none sm:text-sm font-bold tracking-wider"
                          placeholder="Phone number"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-8 flex w-full items-center justify-center rounded-2xl bg-black py-4 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
                    >
                      {loading ? 'Sending OTP...' : 'GET OTP'}
                    </button>

                    <div className="text-center mt-4">
                      <button
                        type="button"
                        onClick={() => { setView('email-login'); setError(''); }}
                        className="text-xs font-semibold text-neutral-500 hover:text-black transition-colors focus:outline-none flex items-center justify-center gap-1.5 mx-auto"
                      >
                        <Mail className="size-3.5" />
                        Use Email instead
                      </button>
                    </div>
                  </motion.form>
                )}

                {view === 'email-login' && (
                  <motion.form 
                    key="email-login-form"
                    onSubmit={handleEmailLoginSubmit} 
                    className="space-y-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-neutral-400">
                        <Mail className="size-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={emailAddress}
                        onChange={e => { setEmailAddress(e.target.value); setError(''); }}
                        className="block w-full rounded-2xl border-0 bg-[#F5F7FA] py-4 pl-11 pr-4 text-neutral-900 ring-0 transition-colors focus:bg-[#EDF1F6] focus:outline-none sm:text-sm font-medium"
                        placeholder="Email ID"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-8 flex w-full items-center justify-center rounded-2xl bg-black py-4 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
                    >
                      {loading ? 'Sending OTP...' : 'GET OTP'}
                    </button>


                  </motion.form>
                )}

                {view === 'phone-otp' && (
                  <motion.form 
                    key="phone-otp-form"
                    onSubmit={handlePhoneOtpSubmit} 
                    className="space-y-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-neutral-400">
                        <Lock className="size-4" />
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={phoneOtp}
                        onChange={e => { 
                          const val = e.target.value.replace(/\D/g, '');
                          setPhoneOtp(val); 
                          setError('');
                          // Auto submit if 6 digits are entered
                          if (val.length === 6) {
                            setLoading(true);
                            verifyPhoneOtp(phoneMobile, val).then(res => {
                              setLoading(false);
                              if (res.success) {
                                if (res.isNewUser) {
                                  setView('phone-register');
                                } else {
                                  import('react-hot-toast').then(({ toast }) => {
                                    toast.success("Logged in successfully", { id: 'phone-login-success', icon: '🎉' });
                                  });
                                  closeAuthModal();
                                  resetForm();
                                }
                              } else {
                                setError(res.message);
                              }
                            });
                          }
                        }}
                        className="block w-full rounded-2xl border-0 bg-[#F5F7FA] py-4 pl-11 pr-4 text-neutral-900 ring-0 transition-colors focus:bg-[#EDF1F6] focus:outline-none sm:text-sm font-black uppercase tracking-[0.4em] text-center"
                        placeholder="6-Digit OTP"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-8 flex w-full items-center justify-center rounded-2xl bg-black py-4 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
                    >
                      {loading ? 'Verifying...' : 'VERIFY & LOGIN'}
                    </button>
                    
                    <div className="text-center mt-4">
                      <button
                        type="button"
                        onClick={() => { setView('phone-login'); setPhoneOtp(''); setError(''); }}
                        className="text-xs font-semibold text-neutral-500 hover:text-black transition-colors focus:outline-none"
                      >
                        Change Phone Number
                      </button>
                    </div>
                  </motion.form>
                )}

                {view === 'email-otp' && (
                  <motion.form 
                    key="email-otp-form"
                    onSubmit={handleEmailOtpSubmit} 
                    className="space-y-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-neutral-400">
                        <Lock className="size-4" />
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={emailOtp}
                        onChange={e => { 
                          const val = e.target.value.replace(/\D/g, '');
                          setEmailOtp(val); 
                          setError('');
                          // Auto submit if 6 digits are entered
                          if (val.length === 6) {
                            setLoading(true);
                            verifyEmailOtp(emailAddress, val).then(res => {
                              setLoading(false);
                              if (res.success) {
                                if (res.isNewUser) {
                                  setView('email-register');
                                } else {
                                  import('react-hot-toast').then(({ toast }) => {
                                    toast.success("Logged in successfully", { id: 'email-login-success', icon: '🎉' });
                                  });
                                  closeAuthModal();
                                  resetForm();
                                }
                              } else {
                                setError(res.message);
                              }
                            });
                          }
                        }}
                        className="block w-full rounded-2xl border-0 bg-[#F5F7FA] py-4 pl-11 pr-4 text-neutral-900 ring-0 transition-colors focus:bg-[#EDF1F6] focus:outline-none sm:text-sm font-black uppercase tracking-[0.4em] text-center"
                        placeholder="6-Digit OTP"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-8 flex w-full items-center justify-center rounded-2xl bg-black py-4 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
                    >
                      {loading ? 'Verifying...' : 'VERIFY & LOGIN'}
                    </button>
                    
                    <div className="text-center mt-4">
                      <button
                        type="button"
                        onClick={() => { setView('email-login'); setEmailOtp(''); setError(''); }}
                        className="text-xs font-semibold text-neutral-500 hover:text-black transition-colors focus:outline-none"
                      >
                        Change Email Address
                      </button>
                    </div>
                  </motion.form>
                )}

                {view === 'phone-register' && (
                  <motion.form 
                    key="phone-register-form"
                    onSubmit={handlePhoneRegisterSubmit} 
                    className="space-y-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-neutral-400">
                        <User className="size-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={phoneRegData.firstName}
                        onChange={e => { setPhoneRegData({ ...phoneRegData, firstName: e.target.value }); setError(''); }}
                        className="block w-full rounded-2xl border-0 bg-[#F5F7FA] py-4 pl-11 pr-4 text-neutral-900 ring-0 transition-colors focus:bg-[#EDF1F6] focus:outline-none sm:text-sm font-medium"
                        placeholder="First Name*"
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-neutral-400">
                        <User className="size-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={phoneRegData.lastName}
                        onChange={e => { setPhoneRegData({ ...phoneRegData, lastName: e.target.value }); setError(''); }}
                        className="block w-full rounded-2xl border-0 bg-[#F5F7FA] py-4 pl-11 pr-4 text-neutral-900 ring-0 transition-colors focus:bg-[#EDF1F6] focus:outline-none sm:text-sm font-medium"
                        placeholder="Last Name*"
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-neutral-400">
                        <Mail className="size-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={phoneRegData.email}
                        onChange={e => { setPhoneRegData({ ...phoneRegData, email: e.target.value }); setError(''); }}
                        className="block w-full rounded-2xl border-0 bg-[#F5F7FA] py-4 pl-11 pr-4 text-neutral-900 ring-0 transition-colors focus:bg-[#EDF1F6] focus:outline-none sm:text-sm font-medium"
                        placeholder="Email ID*"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-8 flex w-full items-center justify-center rounded-2xl bg-black py-4 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
                    >
                      {loading ? 'Registering...' : 'LOGIN'}
                    </button>
                  </motion.form>
                )}

                {view === 'email-register' && (
                  <motion.form 
                    key="email-register-form"
                    onSubmit={handleEmailRegisterSubmit} 
                    className="space-y-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-neutral-400">
                        <User className="size-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={emailRegData.firstName}
                        onChange={e => { setEmailRegData({ ...emailRegData, firstName: e.target.value }); setError(''); }}
                        className="block w-full rounded-2xl border-0 bg-[#F5F7FA] py-4 pl-11 pr-4 text-neutral-900 ring-0 transition-colors focus:bg-[#EDF1F6] focus:outline-none sm:text-sm font-medium"
                        placeholder="First Name*"
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-neutral-400">
                        <User className="size-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={emailRegData.lastName}
                        onChange={e => { setEmailRegData({ ...emailRegData, lastName: e.target.value }); setError(''); }}
                        className="block w-full rounded-2xl border-0 bg-[#F5F7FA] py-4 pl-11 pr-4 text-neutral-900 ring-0 transition-colors focus:bg-[#EDF1F6] focus:outline-none sm:text-sm font-medium"
                        placeholder="Last Name*"
                      />
                    </div>

                    <div className="flex gap-2">
                      <div className="w-[80px] shrink-0 relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-neutral-400">
                          <span className="text-sm font-bold">+91</span>
                        </div>
                        <input
                          type="text"
                          disabled
                          className="block w-full rounded-2xl border-0 bg-[#E9ECEF] py-4 pl-12 text-neutral-500 font-bold select-none cursor-not-allowed sm:text-sm text-center"
                          value=""
                        />
                      </div>
                      <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-neutral-400">
                          <Phone className="size-4" />
                        </div>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          value={emailRegData.mobile}
                          onChange={e => { setEmailRegData({ ...emailRegData, mobile: e.target.value.replace(/\D/g, '') }); setError(''); }}
                          className="block w-full rounded-2xl border-0 bg-[#F5F7FA] py-4 pl-11 pr-4 text-neutral-900 ring-0 transition-colors focus:bg-[#EDF1F6] focus:outline-none sm:text-sm font-bold tracking-wider"
                          placeholder="Phone number*"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-8 flex w-full items-center justify-center rounded-2xl bg-black py-4 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
                    >
                      {loading ? 'Registering...' : 'LOGIN'}
                    </button>
                  </motion.form>
                )}

                {(view === 'login' || view === 'signup') && (
                  <motion.form 
                    key="standard-form"
                    onSubmit={handleSubmit} 
                    className="space-y-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <AnimatePresence mode="wait">
                      {view === 'signup' && (
                        <motion.div
                          key="signup-fields"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4 overflow-hidden"
                        >
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-neutral-400">
                              <User className="size-4" />
                            </div>
                            <input
                              type="text"
                              name="name"
                              required={view === 'signup'}
                              value={formData.name}
                              onChange={handleChange}
                              className="block w-full rounded-2xl border-0 bg-[#F5F7FA] py-4 pl-11 pr-4 text-neutral-900 ring-0 transition-colors focus:bg-[#EDF1F6] focus:outline-none sm:text-sm font-medium"
                              placeholder="Your Full Name"
                            />
                          </div>

                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-neutral-400">
                              <Phone className="size-4" />
                            </div>
                            <input
                              type="tel"
                              name="mobile"
                              required={view === 'signup'}
                              value={formData.mobile}
                              onChange={handleChange}
                              className="block w-full rounded-2xl border-0 bg-[#F5F7FA] py-4 pl-11 pr-4 text-neutral-900 ring-0 transition-colors focus:bg-[#EDF1F6] focus:outline-none sm:text-sm font-medium"
                              placeholder="10-digit mobile number"
                              pattern="[0-9]{10}"
                              title="Please enter a valid 10-digit mobile number"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-neutral-400">
                        <Mail className="size-4" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="block w-full rounded-2xl border-0 bg-[#F5F7FA] py-4 pl-11 pr-4 text-neutral-900 ring-0 transition-colors focus:bg-[#EDF1F6] focus:outline-none sm:text-sm font-medium"
                        placeholder="Email Address"
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-neutral-400">
                        <Lock className="size-4" />
                      </div>
                      <input
                        type="password"
                        name="password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="block w-full rounded-2xl border-0 bg-[#F5F7FA] py-4 pl-11 pr-4 text-neutral-900 ring-0 transition-colors focus:bg-[#EDF1F6] focus:outline-none sm:text-sm font-medium"
                        placeholder="Password"
                        minLength={6}
                      />
                    </div>

                    {view === 'login' && (
                      <div className="flex justify-start pt-1">
                        <button
                          type="button"
                          onClick={() => { setView('forgot'); setError(''); }}
                          className="text-xs font-semibold text-neutral-500 hover:text-black transition-colors focus:outline-none"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-8 flex w-full items-center justify-center rounded-2xl bg-black py-4 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
                    >
                      {loading ? 'Processing...' : (view === 'login' ? 'Sign In to Samay Watch' : 'Create Account')}
                    </button>
                  </motion.form>
                )}

                {view === 'forgot' && (
                  <motion.form 
                    key="forgot-form"
                    onSubmit={handleForgotPasswordSubmit} 
                    className="space-y-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-neutral-400">
                        <Mail className="size-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={e => { setForgotEmail(e.target.value); setError(''); }}
                        className="block w-full rounded-2xl border-0 bg-[#F5F7FA] py-4 pl-11 pr-4 text-neutral-900 ring-0 transition-colors focus:bg-[#EDF1F6] focus:outline-none sm:text-sm font-medium"
                        placeholder="Email Address"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-8 flex w-full items-center justify-center rounded-2xl bg-black py-4 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
                    >
                      {loading ? 'Sending Code...' : 'Send Verification Code'}
                    </button>

                    <div className="text-center mt-4">
                      <button
                        type="button"
                        onClick={() => { setView('login'); setError(''); }}
                        className="text-xs font-semibold text-neutral-500 hover:text-black transition-colors focus:outline-none"
                      >
                        Back to Sign In
                      </button>
                    </div>
                  </motion.form>
                )}

                {view === 'reset' && (
                  <motion.form 
                    key="reset-form"
                    onSubmit={handleResetPasswordSubmit} 
                    className="space-y-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-neutral-400">
                        <Lock className="size-4" />
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={4}
                        value={resetOtp}
                        onChange={e => { setResetOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                        className="block w-full rounded-2xl border-0 bg-[#F5F7FA] py-4 pl-11 pr-4 text-neutral-900 ring-0 transition-colors focus:bg-[#EDF1F6] focus:outline-none sm:text-sm font-black uppercase tracking-[0.3em] text-center"
                        placeholder="4-Digit Code"
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-neutral-400">
                        <Lock className="size-4" />
                      </div>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={e => { setNewPassword(e.target.value); setError(''); }}
                        className="block w-full rounded-2xl border-0 bg-[#F5F7FA] py-4 pl-11 pr-4 text-neutral-900 ring-0 transition-colors focus:bg-[#EDF1F6] focus:outline-none sm:text-sm font-medium"
                        placeholder="New Password"
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-neutral-400">
                        <Lock className="size-4" />
                      </div>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={confirmNewPassword}
                        onChange={e => { setConfirmNewPassword(e.target.value); setError(''); }}
                        className="block w-full rounded-2xl border-0 bg-[#F5F7FA] py-4 pl-11 pr-4 text-neutral-900 ring-0 transition-colors focus:bg-[#EDF1F6] focus:outline-none sm:text-sm font-medium"
                        placeholder="Confirm New Password"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-8 flex w-full items-center justify-center rounded-2xl bg-black py-4 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
                    >
                      {loading ? 'Updating...' : 'Update Password'}
                    </button>

                    <div className="text-center mt-4">
                      <button
                        type="button"
                        onClick={() => { setView('forgot'); setError(''); }}
                        className="text-xs font-semibold text-neutral-500 hover:text-black transition-colors focus:outline-none"
                      >
                        Resend Reset Code
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Form Footer Toggle */}
              {(view === 'login' || view === 'signup') && (
                <div className="mt-8 pt-8 border-t border-neutral-100 text-center md:text-left space-y-4">
                  <p className="text-sm text-neutral-500 font-medium">
                    {view === 'login' ? "Don't have an account? " : "Already have an account? "}
                    <button
                      type="button"
                      onClick={toggleView}
                      className="font-bold text-black hover:text-gold transition-colors ml-1 focus:outline-none"
                    >
                      {view === 'login' ? 'Sign up' : 'Sign in'}
                    </button>
                  </p>
                  
                  {view === 'login' && (
                    <div className="pt-2 border-t border-neutral-50">
                      <button
                        type="button"
                        onClick={() => { setView('email-login'); setError(''); }}
                        className="text-xs font-bold text-neutral-500 hover:text-black transition-colors focus:outline-none flex items-center gap-1.5 justify-center md:justify-start"
                      >
                        <Mail className="size-3" />
                        Sign In using Email OTP
                      </button>
                    </div>
                  )}

                  <p className="mt-8 text-xs text-neutral-400">
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </div>
              )}

              {(view === 'phone-login' || view === 'email-login') && (
                <div className="mt-8 pt-8 border-t border-neutral-100 text-center md:text-left space-y-4">
                  <p className="text-sm text-neutral-500 font-medium">
                    Want to use traditional credentials?
                    <button
                      type="button"
                      onClick={() => { setView('login'); setError(''); }}
                      className="font-bold text-black hover:text-gold transition-colors ml-1 focus:outline-none"
                    >
                      Sign In using Password
                    </button>
                  </p>
                  <p className="mt-8 text-xs text-neutral-400">
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Image & Glassmorphism Card */}
          <div className="hidden md:block w-1/2 relative bg-neutral-900 overflow-hidden">
            <img 
              src="/auth-bg.png" 
              alt="Luxury Timeless Watch" 
              className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-[10s] hover:scale-110"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            
            {/* Glassmorphism Info Card */}
            <div className="absolute inset-0 flex items-center justify-center p-12 pointer-events-none">
              <div className="w-full max-w-sm backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
                
                <CheckCircle2 className="w-10 h-10 text-white/80 mb-6" strokeWidth={1.5} />
                
                <h3 className="font-serif text-3xl font-medium text-white leading-tight mb-4 drop-shadow-md">
                  Precision craftsmanship is the new gold standard for luxury
                </h3>
                
                <p className="text-sm text-white/80 leading-relaxed drop-shadow-sm font-medium">
                  The resulting interactive experience includes updated information about exclusive collections or limited editions tailored for each member.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
