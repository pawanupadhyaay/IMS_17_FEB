import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import { useAuth } from './AuthContext'

const CartContext = createContext()

const CART_KEY = 'ims_store_cart'
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export function CartProvider({ children }) {
  const { user, openAuthModal } = useAuth()
  const [cartItems, setCartItems] = useState(() => {
    try {
      const stored = localStorage.getItem(CART_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (err) {
      console.error('Failed to load cart:', err)
      return []
    }
  })
  
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try {
      const stored = localStorage.getItem('ims_store_coupon')
      return stored ? JSON.parse(stored) : null
    } catch (err) {
      return null
    }
  })
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [pendingCheckout, setPendingCheckout] = useState(null) // { isBuyNow, product }
  const [orderSuccessData, setOrderSuccessData] = useState(null)
  const [orderErrorData, setOrderErrorData] = useState(null)

  // Persist to localStorage whenever cartItems or appliedCoupon change
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cartItems))
    if (appliedCoupon) {
      localStorage.setItem('ims_store_coupon', JSON.stringify(appliedCoupon))
    } else {
      localStorage.removeItem('ims_store_coupon')
    }
  }, [cartItems, appliedCoupon])

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (item.qty || 1), 0)
  }, [cartItems])

  const discountAmount = useMemo(() => {
    return appliedCoupon ? cartTotal * (appliedCoupon.discountPercentage / 100) : 0
  }, [cartTotal, appliedCoupon])

  const shippingValue = (cartTotal === 50000) ? 1 : ((cartTotal > 50000 || cartItems.length === 0 || appliedCoupon?.code === 'TEST1') ? 0 : 99)
  let grandTotal = Math.max(0, cartTotal - discountAmount + shippingValue)
  
  if (appliedCoupon?.code === 'TEST1') {
    grandTotal = 1
  }

  const toggleCart = () => setIsCartOpen(prev => !prev)

  const addToCart = (product, qty = 1, size = 'Standard') => {
    const inventory = Number(product.inventory) || 0
    
    setCartItems(prev => {
      const itemKey = product._id || product.productId
      const existingIndex = prev.findIndex(item => item.key === itemKey)
      
      if (existingIndex > -1) {
        const next = [...prev]
        const currentQty = next[existingIndex].qty
        if (currentQty + qty > inventory) {
          toast.error(`Only ${inventory} units available in stock`, { 
            id: `stock-limit-${itemKey}`, 
            icon: '⚠️',
            style: { borderRadius: '10px', background: '#333', color: '#fff' }
          })
          return prev
        }
        next[existingIndex] = { ...next[existingIndex], qty: currentQty + qty }
        return next
      } else {
        if (qty > inventory) {
          toast.error(`Only ${inventory} units available in stock`, { 
            id: `stock-limit-${itemKey}`, 
            icon: '⚠️',
            style: { borderRadius: '10px', background: '#333', color: '#fff' }
          })
          return prev
        }
        const newItem = {
          key: itemKey,
          productId: itemKey,
          slug: product.slug,
          title: product.title,
          brand: product.brand,
          price: Number(product.price) || 0,
          image: product.image?.url || product.images?.[0] || product.image || '',
          qty,
          size,
          inventory // Store for cart-side checks
        }
        return [...prev, newItem]
      }
    })
    setIsCartOpen(true)
  }

  const removeFromCart = (itemKey) => {
    setCartItems(prev => prev.filter(item => item.key !== itemKey))
  }

  const updateQty = (itemKey, qty) => {
    setCartItems(prev => prev.map(item => {
      if (item.key === itemKey) {
        // If inventory is missing (older cart items), skip server-side check here 
        // and let the checkout process handle final validation
        if (item.inventory === undefined) return { ...item, qty }

        const inventory = Number(item.inventory) || 0
        if (qty > inventory) {
          toast.error(`Stock limit reached: ${inventory} units`, { 
            id: `qty-limit-${itemKey}`,
            icon: '🔒',
            style: { borderRadius: '10px', background: '#333', color: '#fff' }
          })
          return item
        }
        return { ...item, qty }
      }
      return item
    }))
  }

  const clearCart = () => {
    setCartItems([])
    localStorage.removeItem(CART_KEY)
  }

  const applyCoupon = async (code) => {
     try {
      const res = await axios.post(`${API_BASE}/api/store/validate-coupon`, { code, orderAmount: cartTotal })
      if (res.data.success) {
        setAppliedCoupon(res.data.data)
        return { success: true }
      }
      return { success: false, message: res.data.message }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Invalid coupon' }
    }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
  }

  // Auto-resume checkout intent once user logs in or registers successfully
  useEffect(() => {
    if (user) {
      const savedIntent = localStorage.getItem('pendingCheckoutIntent');
      if (savedIntent) {
        try {
          const intent = JSON.parse(savedIntent);
          localStorage.removeItem('pendingCheckoutIntent');
          
          setPendingCheckout({ isBuyNow: intent.isBuyNow, product: intent.product });
          setCheckoutModalOpen(true);
          toast.success("Welcome back! Resuming secure checkout...", { 
            id: 'resume-checkout-toast',
            icon: '🛒' 
          });
        } catch (e) {
          console.error("Failed to parse checkout intent:", e);
        }
      }
    }
  }, [user]);

  const initiateCheckout = (isBuyNow = false, product = null) => {
    if (!user) {
      localStorage.setItem('pendingCheckoutIntent', JSON.stringify({ isBuyNow, product }));
      toast.error("Please login to proceed with checkout", { 
        id: 'auth-gate-toast',
        icon: '🔒' 
      });
      setIsCartOpen(false); // Close cart drawer to clear UI for login modal
      openAuthModal();
      return;
    }
    setPendingCheckout({ isBuyNow, product })
    setCheckoutModalOpen(true)
  }

  const handlePayment = async (isBuyNow = false, addressData = null, product = null) => {
    try {
      let items = [];
      if (isBuyNow === true) {
        if (!product || !product._id) return;
        items = [{
          productId: product._id,
          quantity: 1
        }];
      } else {
        if (cartItems.length === 0) return;
        items = cartItems.map(item => ({
          productId: item.productId || item._id,
          quantity: item.qty || 1
        }));
      }

      const payload = { items, shippingAddress: addressData };
      if (!isBuyNow && appliedCoupon) {
        payload.couponCode = appliedCoupon.code;
      }

      const token = localStorage.getItem("storeToken");
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      const response = await axios.post(`${API_BASE}/api/store/create-order`, payload, config);
      const order = response.data.order;
      const orderNumber = response.data.orderNumber;
      const finalPaidAmount = response.data.finalAmount;

      if (!window.Razorpay) {
        setOrderErrorData({ 
          message: "Payment secure gateway failed to load. Please check your internet connection and try again.", 
          type: "system_error" 
        });
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        name: "Samay Watch",
        description: "Order Payment",
        order_id: order.id,
        prefill: addressData ? {
          name: addressData.fullName || '',
          email: addressData.email || '',
          contact: addressData.phone || '',
        } : {},
        handler: async function (razorpayResponse) {
          try {
            let paymentMethod = '';
            let paymentVpa = '';
            try {
              const pmRes = await axios.get(
                `${API_BASE}/api/store/payment-details/${razorpayResponse.razorpay_payment_id}`
              );
              if (pmRes.data.success) {
                paymentMethod = pmRes.data.method || '';
                paymentVpa = pmRes.data.vpa || '';
              }
            } catch (_) { }

            const verifyPayload = { ...razorpayResponse, paymentMethod, paymentVpa };
            if (!isBuyNow && appliedCoupon) {
              verifyPayload.couponCode = appliedCoupon.code;
            }
            const verifyRes = await axios.post(`${API_BASE}/api/store/verify-payment`, verifyPayload, config);
             if (verifyRes.data.success) {
              if (!isBuyNow) clearCart();
              setIsCartOpen(false);
              setOrderSuccessData({
                 orderId: orderNumber,
                 amount: finalPaidAmount,
                 date: new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
                 items: isBuyNow ? [{ title: product.title, price: product.price, qty: 1 }] : cartItems,
                 shippingAddress: addressData,
                 subtotal: isBuyNow ? product.price : cartTotal,
                 discount: isBuyNow ? 0 : discountAmount,
                 couponCode: isBuyNow ? null : (appliedCoupon?.code || null),
              });
            } else {
              setOrderErrorData({
                message: "Payment Verification Failed. If any amount was deducted, it will be refunded within 5-7 business days.",
                type: "verification_error"
              });
            }
          } catch (err) {
            console.error(err);
            setOrderErrorData({
              message: "Something went wrong while verifying your payment. Please contact our support team if the amount was deducted.",
              type: "verification_error"
            });
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        setOrderErrorData({
          message: response.error.description || "The transaction was not completed. Please try again or use a different payment method.",
          type: "payment_error",
          reason: response.error.reason
        });
      });
      rzp.open();
    } catch (error) {
      console.error('Checkout Error:', error);
      const errorMessage = error.response?.data?.message || "Something went wrong. Please try again.";
      toast.error(errorMessage, {
        id: 'checkout-error',
        duration: 5000,
        icon: '🔒',
        style: {
          background: '#1a1a1a',
          color: '#fff',
          borderRadius: '12px',
          padding: '16px 24px',
          border: '1px solid rgba(255,215,0,0.2)', // Subtle Gold border
          fontSize: '14px',
          fontWeight: '600',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }
      });
    }
  };

  const handleAddressConfirmed = (addressData) => {
    setCheckoutModalOpen(false)
    setTimeout(() => handlePayment(pendingCheckout?.isBuyNow ?? false, addressData, pendingCheckout?.product), 350)
  }

  return (
    <CartContext.Provider value={{ 
      cartItems, 
      cartTotal, 
      isCartOpen, 
      setIsCartOpen, 
      toggleCart, 
      addToCart, 
      removeFromCart, 
      updateQty, 
      clearCart,
      appliedCoupon,
      applyCoupon,
      removeCoupon,
      discountAmount,
      shippingValue,
      grandTotal,
      checkoutModalOpen,
      setCheckoutModalOpen,
      initiateCheckout,
      handleAddressConfirmed,
      orderSuccessData,
      setOrderSuccessData,
      orderErrorData,
      setOrderErrorData,
      pendingCheckout
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
