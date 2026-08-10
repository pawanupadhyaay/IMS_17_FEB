import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import { useEffect } from "react"
import Header from "./components/header/Header"
import Home from "./components/home/Home"
import Footer from "./components/layout/Footer"
import AllProducts from "./pages/AllProducts"
import BrandCollection from "./pages/BrandCollection"
import ProductDetail from "./pages/ProductDetail"
import Wishlist from "./pages/Wishlist"
import AboutUs from "./pages/AboutUs"
import RepairService from "./pages/RepairService"
import ContactUs from "./pages/ContactUs"
import Policies from "./pages/Policies"
import FindYourWatchPage from "./pages/FindYourWatchPage"
import ScrollToTop from "./components/layout/ScrollToTop"
import { AuthProvider } from "./contexts/AuthContext"
import { WishlistProvider } from "./contexts/WishlistContext"
import { CartProvider, useCart } from "./contexts/CartContext"
import AuthModal from "./components/auth/AuthModal"
import AccountDashboard from "./pages/AccountDashboard"
import BlogList from "./pages/BlogList"
import BlogDetail from "./pages/BlogDetail"
import OurPresence from "./pages/OurPresence"
import CartDrawer from "./components/cart/CartDrawer"
import CheckoutModal from "./components/checkout/CheckoutModal"
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, AlertTriangle, HelpCircle, RefreshCcw, MessageSquare, Download } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import { downloadInvoice } from "./utils/invoiceGenerator"

function formatPrice(value) {
  if (value == null || value === '') return ''
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return `₹${num.toLocaleString('en-IN')}`
}

function Layout() {
  const { 
    checkoutModalOpen, 
    setCheckoutModalOpen, 
    handleAddressConfirmed, 
    pendingCheckout, 
    cartItems, 
    cartTotal, 
    grandTotal, 
    discountAmount, 
    appliedCoupon,
    orderSuccessData,
    setOrderSuccessData,
    orderErrorData,
    setOrderErrorData
  } = useCart()

  const location = useLocation()

  useEffect(() => {
    const logPageView = async () => {
      try {
        // Detect country (fallback to India)
        let country = 'India'
        try {
          const geoRes = await fetch('https://ipapi.co/json/')
          const geoData = await geoRes.json()
          if (geoData.country_name) {
            country = geoData.country_name
          }
        } catch (e) {
          // Fallback if geo IP API is blocked or offline
        }

        // Get or create a simple session ID
        let sessionId = localStorage.getItem('samay_session_id')
        if (!sessionId) {
          sessionId = 'sess_' + Math.random().toString(36).substring(2, 15)
          localStorage.setItem('samay_session_id', sessionId)
        }

        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
        
        await fetch(`${API_BASE}/api/analytics/pageview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: location.pathname,
            country,
            sessionId
          })
        })
      } catch (err) {
        console.error('Failed to log pageview:', err)
      }
    }
    logPageView()
  }, [location.pathname])

  return (
    <div className="w-full bg-white">
      <Header />
      <main className="pb-32 sm:pb-36 lg:pb-16">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/all-products" element={<AllProducts />} />
          <Route path="/collections/:brandSlug" element={<BrandCollection />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/repair-service" element={<RepairService />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/account" element={<AccountDashboard />} />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/:slug" element={<BlogDetail />} />
          <Route path="/our-presence" element={<OurPresence />} />
          <Route path="/find-your-watch" element={<FindYourWatchPage />} />
          <Route path="/policies/:type" element={<Policies />} />
        </Routes>
      </main>
      <Footer />
      <Toaster position="top-center" reverseOrder={false} gutter={8} toastOptions={{ duration: 3000, style: { background: '#333', color: '#fff', fontSize: '13px', fontWeight: '600' } }} />
      
      {/* Global Cart UI */}
      <CartDrawer />

      {/* Global Checkout Modal */}
      <CheckoutModal
        open={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        onProceed={handleAddressConfirmed}
        product={pendingCheckout?.product}
        isBuyNow={pendingCheckout?.isBuyNow ?? false}
        cartItems={cartItems}
        cartTotal={cartTotal}
        grandTotal={grandTotal}
        discountAmount={discountAmount}
        appliedCoupon={appliedCoupon}
      />

      {/* Global Payment Success Overlay */}
      <AnimatePresence>
        {orderSuccessData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md text-white p-6"
          >
            <motion.div 
               initial={{ scale: 0.8, opacity: 0, y: 40 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.1 }}
               className="w-full max-w-md bg-white text-neutral-900 rounded-3xl shadow-2xl p-8 sm:p-10 text-center relative overflow-hidden"
            >
               <div className="absolute -top-24 -right-24 size-48 rounded-full bg-green-50/50 blur-3xl pointer-events-none"></div>

               <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6 relative z-10">
                  <motion.svg 
                    className="h-10 w-10 text-green-600" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth="3.5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
                  >
                     <motion.path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </motion.svg>
               </div>
               
               <h2 className="font-serif text-[28px] sm:text-[32px] font-black text-black leading-tight mt-2">Payment Successful</h2>
               <p className="mt-3 text-[14px] text-neutral-500 font-medium px-4">Thank you for your purchase. Your order has been securely processed and confirmed.</p>
               
               <div className="mt-8 rounded-2xl bg-[#fbfbfb] p-6 text-left border border-neutral-100">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-neutral-200/60">
                     <span className="text-[11px] font-black uppercase tracking-widest text-neutral-400">Order ID</span>
                     <span className="text-[13px] font-black text-black tracking-wider">{orderSuccessData.orderId}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-neutral-200/60">
                     <span className="text-[11px] font-black uppercase tracking-widest text-neutral-400">Date</span>
                     <span className="text-[13px] font-bold text-neutral-700">{orderSuccessData.date}</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-[11px] font-black uppercase tracking-widest text-neutral-400">Total Paid</span>
                     <span className="text-[18px] font-black text-green-600">{formatPrice(orderSuccessData.amount)}</span>
                  </div>
               </div>
               
               <div className="mt-8 flex flex-col gap-3">
                  <button 
                    onClick={() => downloadInvoice(orderSuccessData)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-900 border border-neutral-800 py-4 text-[13px] font-black uppercase tracking-widest text-white shadow-md transition-all hover:bg-neutral-800 hover:-translate-y-1 active:scale-[0.98]"
                  >
                    <Download className="size-4" />
                    Download Invoice
                  </button>
                  <button 
                    onClick={() => { setOrderSuccessData(null); window.location.href='/account'; }}
                    className="w-full rounded-xl bg-black py-4 text-[13px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-neutral-900 hover:-translate-y-1 active:scale-[0.98]"
                  >
                    Continue Shopping
                  </button>
               </div>
               <div className="mt-6 flex items-center justify-center gap-2 text-black/50">
                  <ShieldCheck className="size-[14px]" strokeWidth={2.5}/>
                  <span className="text-[10px] font-black uppercase tracking-widest">Secured by Samay</span>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Payment Failure Overlay */}
      <AnimatePresence>
        {orderErrorData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md text-white p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-white text-neutral-900 rounded-3xl shadow-2xl p-8 sm:p-10 text-center relative overflow-hidden"
            >
              {/* Subtle Red Glow */}
              <div className="absolute -top-24 -right-24 size-48 rounded-full bg-red-50/50 blur-3xl pointer-events-none"></div>

              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 mb-6 relative z-10">
                <motion.div
                  initial={{ rotate: -10, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                >
                  <AlertTriangle className="h-10 w-10 text-red-500" strokeWidth={2.5} />
                </motion.div>
              </div>

              <h2 className="font-serif text-[28px] sm:text-[32px] font-black text-black leading-tight mt-2">Transaction Failed</h2>
              <p className="mt-3 text-[14px] text-neutral-500 font-medium px-4">
                {orderErrorData.message || "Something went wrong during the payment process. Your funds are safe and will be protected."}
              </p>

              <div className="mt-8 flex flex-col gap-3">
                <button
                  onClick={() => {
                    setOrderErrorData(null);
                    // This closing helps the user try again from the modal if it's still open or re-trigger it
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-black py-4 text-[13px] font-black uppercase tracking-widest text-white shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all hover:bg-neutral-900 hover:-translate-y-1 active:scale-[0.98]"
                >
                  <RefreshCcw className="size-4" />
                  Try Again
                </button>
                
                <a
                  href="https://wa.me/919310350365"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white py-4 text-[13px] font-black uppercase tracking-widest text-neutral-900 transition-all hover:bg-neutral-50 hover:border-neutral-300"
                >
                  <MessageSquare className="size-4" />
                  Contact Concierge
                </a>
              </div>

              <div className="mt-8 pt-6 border-t border-neutral-50 flex items-center justify-center gap-2 text-black/30">
                <HelpCircle className="size-[14px]" strokeWidth={2.5} />
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">Transaction Protection Active</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Layout />
            <AuthModal />
          </BrowserRouter>
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>
  )
}