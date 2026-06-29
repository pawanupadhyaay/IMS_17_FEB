import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, Lock, ShieldCheck, MapPin, Check, Plus } from 'lucide-react'
import { cn } from '../../utils/cn'
import { lockBodyScroll } from '../../utils/bodyScrollLock'
import { useCart } from '../../contexts/CartContext'
import { useAuth } from '../../contexts/AuthContext'
import authService from '../../services/authService'

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
]

const STORAGE_KEY = 'ims_checkout_address'
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function loadSavedAddress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveAddress(addr) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(addr)) } catch {}
}

const EMPTY_FORM = {
  fullName: '',
  phone: '',
  email: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
}

/* ── Top-level Field component — must NOT be inside parent component ── */
function Field({ id, label, type = 'text', placeholder, field, required, half, form, errors, onChange }) {
  return (
    <label className={cn('flex flex-col gap-1', half ? 'flex-1 min-w-0' : 'w-full')}>
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
        {label}{required && <span className="text-gold ml-0.5">*</span>}
      </span>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={form[field] ?? ''}
        onChange={e => onChange(field, e.target.value)}
        className={cn(
          'w-full rounded-lg border bg-white px-4 py-3 text-[13px] font-medium text-neutral-900 outline-none transition-all placeholder:text-neutral-300',
          errors[field]
            ? 'border-red-400 focus:border-red-400 bg-red-50/30'
            : 'border-neutral-200 focus:border-black focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]'
        )}
      />
      {errors[field] && (
        <span className="text-[10px] font-semibold text-red-500">{errors[field]}</span>
      )}
    </label>
  )
}

/**
 * Premium Checkout Address Modal
 */
export default function CheckoutModal({
  open,
  onClose,
  onProceed,
  product,
  isBuyNow,
  cartItems = [],
  cartTotal = 0,
  grandTotal = 0,
  discountAmount = 0,
  appliedCoupon = null,
}) {
  const { 
    cartItems: ctxCartItems, 
    cartTotal: ctxCartTotal, 
    grandTotal: ctxGrandTotal, 
    discountAmount: ctxDiscountAmount, 
    appliedCoupon: ctxAppliedCoupon,
    updateQty,
    removeFromCart,
    applyCoupon,
    removeCoupon
  } = useCart()

  const { user } = useAuth()
  const [form, setForm] = useState(() => {
    const saved = loadSavedAddress()
    if (saved) return saved
    return EMPTY_FORM
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [isPincodeLoading, setIsPincodeLoading] = useState(false)
  const [pincodeServiceable, setPincodeServiceable] = useState(true)
  const [savedAddresses, setSavedAddresses] = useState([])
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState(null)

  // Local coupon states for Checkout Modal
  const [checkoutCouponCode, setCheckoutCouponCode] = useState('')
  const [isApplyingCheckoutCoupon, setIsApplyingCheckoutCoupon] = useState(false)
  const [checkoutCouponError, setCheckoutCouponError] = useState('')

  // Sync user email initially
  useEffect(() => {
    if (user && !form.email) {
      setForm(prev => ({ ...prev, email: user.email || prev.email }))
    }
  }, [user])

  // Fetch saved user addresses inside modal on open
  useEffect(() => {
    if (open && user) {
      const fetchSavedAddresses = async () => {
        try {
          setLoadingAddresses(true)
          const res = await authService.getAddresses()
          if (res.success && res.data) {
            setSavedAddresses(res.data)
            
            // Auto-select and fill default address if present
            const defaultAddress = res.data.find(addr => addr.isDefault)
            if (defaultAddress) {
              setSelectedAddressId(defaultAddress._id)
              setForm({
                fullName: defaultAddress.fullName,
                phone: defaultAddress.phone,
                email: form.email || user.email || '',
                addressLine1: defaultAddress.addressLine1,
                addressLine2: defaultAddress.addressLine2 || '',
                city: defaultAddress.city,
                state: defaultAddress.state,
                pincode: defaultAddress.pincode,
              })
            }
          }
        } catch (err) {
          console.error("Failed to load saved addresses inside CheckoutModal:", err)
        } finally {
          setLoadingAddresses(false)
        }
      }
      fetchSavedAddresses()
    }
  }, [open, user])

  const handleSelectAddress = (addr) => {
    setSelectedAddressId(addr._id)
    setForm({
      fullName: addr.fullName,
      phone: addr.phone,
      email: form.email || user?.email || '',
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || '',
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
    })
    setErrors({})
  }

  const handleClearAddressSelection = () => {
    setSelectedAddressId(null)
    setForm({
      ...EMPTY_FORM,
      email: user?.email || '',
    })
    setErrors({})
  }

  // Map values dynamically: Buy Now vs standard Cart
  const activeCartItems = isBuyNow ? [] : ctxCartItems
  const activeCartTotal = isBuyNow ? (Number(product?.price) || 0) : ctxCartTotal
  const activeGrandTotal = isBuyNow ? (Number(product?.price) || 0) : ctxGrandTotal
  const activeDiscountAmount = isBuyNow ? 0 : ctxDiscountAmount
  const activeAppliedCoupon = isBuyNow ? null : ctxAppliedCoupon

  const handleApplyCheckoutCoupon = async () => {
    if (!checkoutCouponCode.trim()) return
    setIsApplyingCheckoutCoupon(true)
    setCheckoutCouponError('')
    const result = await applyCoupon(checkoutCouponCode)
    if (!result.success) {
      setCheckoutCouponError(result.message)
    } else {
      setCheckoutCouponCode('')
    }
    setIsApplyingCheckoutCoupon(false)
  }

  // Auto-fill City & State from Pincode and check Shiprocket serviceability
  useEffect(() => {
    const pin = form.pincode ? String(form.pincode).trim() : ''
    if (pin.length === 6 && /^\d{6}$/.test(pin)) {
      const fetchLocationAndServiceability = async () => {
        setIsPincodeLoading(true)
        setPincodeServiceable(true) // reset
        
        // 1. Fetch location details
        try {
          const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`)
          const data = await res.json()
          
          if (data[0] && data[0].Status === 'Success' && data[0].PostOffice?.[0]) {
            const info = data[0].PostOffice[0]
            const fetchedCity = info.District || info.Block || ''
            const fetchedState = info.State || ''

            // Map State precisely to our internal list if possible (casing/spaces)
            const matchedState = STATES.find(s => s.toLowerCase() === fetchedState.toLowerCase()) || fetchedState

            setForm(prev => ({
              ...prev,
              city: fetchedCity || prev.city,
              state: matchedState || prev.state
            }))
            
            // Clear errors for auto-filled fields
            setErrors(prev => {
              const next = { ...prev }
              if (fetchedCity) delete next.city
              if (matchedState) delete next.state
              return next
            })
          }
        } catch (err) {
          // Fail silently/gracefully on external API certificate or network issues; user can enter manually.
          console.warn('Auto-pincode resolution skipped due to external API certificate validation error.')
        }

        // 2. Fetch Shiprocket serviceability
        try {
          const serviceabilityRes = await fetch(`${API_BASE}/api/store/shiprocket/serviceability?pincode=${pin}`)
          const serviceabilityData = await serviceabilityRes.json()
          if (serviceabilityData.success && serviceabilityData.serviceable === false) {
            setPincodeServiceable(false)
            setErrors(prev => ({ ...prev, pincode: 'This pincode is not serviceable by our courier partner.' }))
          } else {
            setPincodeServiceable(true)
            setErrors(prev => {
              const next = { ...prev }
              delete next.pincode
              return next
            })
          }
        } catch (err) {
          console.warn('Shiprocket serviceability check failed, defaulting to serviceable:', err)
          setPincodeServiceable(true)
        } finally {
          setIsPincodeLoading(false)
        }
      }
      fetchLocationAndServiceability()
    } else {
      setPincodeServiceable(true)
    }
  }, [form.pincode])

  useEffect(() => {
    if (!open) return undefined
    return lockBodyScroll()
  }, [open])

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  function validate() {
    const e = {}
    
    // 1. Full Name Validation
    if (!form.fullName.trim()) {
      e.fullName = 'Full name is required'
    } else if (form.fullName.trim().split(/\s+/).length < 2) {
      e.fullName = 'Please enter both first name and last name'
    }

    // 2. Mobile Phone Validation (Indian numbers start with 6-9, strictly 10 digits, exclude repetitive fake numbers)
    const phone = form.phone.trim()
    if (!phone) {
      e.phone = 'Phone number is required'
    } else if (!/^[6-9]\d{9}$/.test(phone)) {
      e.phone = 'Enter a valid 10-digit Indian mobile number'
    } else if (/^(\d)\1{9}$/.test(phone) || phone === '1234567890') {
      e.phone = 'Please enter a genuine mobile number'
    }

    // 3. Address Line 1 & Line 2 Validation (Enforce house/flat number, road/locality, and min length)
    const addr1 = form.addressLine1.trim()
    const addr2 = (form.addressLine2 || '').trim()
    const totalAddr = `${addr1} ${addr2}`.trim()

    if (!addr1) {
      e.addressLine1 = 'Address Line 1 is required'
    } else if (addr1.length < 10) {
      e.addressLine1 = 'Please enter more details (e.g. flat number, building/street name)'
    }

    if (totalAddr.length < 20) {
      e.addressLine1 = 'Full address must be at least 20 characters to avoid delivery failures (add landmark/locality)'
    } else if (!/\d/.test(totalAddr)) {
      e.addressLine1 = 'Please include a house number, flat number, or plot number'
    } else if (totalAddr.split(/\s+/).length < 4) {
      e.addressLine1 = 'Please provide detailed address including colony, street, or landmark'
    }

    if (!form.city.trim()) e.city = 'City is required'
    if (!form.state) e.state = 'State is required'
    
    // 4. Pincode & Serviceability check
    if (!form.pincode.trim() || !/^\d{6}$/.test(form.pincode.trim())) {
      e.pincode = 'Enter a valid 6-digit pincode'
    } else if (!pincodeServiceable) {
      e.pincode = 'This pincode is not serviceable by our courier partner.'
    }
    
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSubmitting(true)
    saveAddress(form)
    onProceed({ ...form })
    setSubmitting(false)
  }

  const displayTotal = isBuyNow ? (Number(product?.price) || 0) : activeGrandTotal

  return (

    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[85] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative flex w-full max-w-[900px] max-h-[95dvh] overflow-hidden rounded-2xl bg-white shadow-2xl">

              {/* Left: Order Summary */}
              <div className="hidden lg:flex w-[300px] shrink-0 flex-col bg-black px-7 py-8 text-white">
                <div className="mb-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gold">Order Summary</p>
                </div>

                {/* Items */}
                <div className="flex-1 space-y-5 overflow-y-auto pr-1 scrollbar-hide">
                  {isBuyNow && product ? (
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 shrink-0 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
                        <img
                          src={product.images?.[0] || product.image?.url || ''}
                          alt={product.title}
                          className="h-full w-full object-contain mix-blend-luminosity"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-gold uppercase tracking-wider truncate">{product.brand}</p>
                        <p className="text-[12px] font-semibold text-white leading-snug line-clamp-2 mt-0.5">{product.title}</p>
                        <p className="text-[13px] font-black text-white/90 mt-1">
                          ₹{Number(product.price || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    activeCartItems.map((item, i) => (
                      <div key={item.key || i} className="flex flex-col gap-2 pb-4 border-b border-white/5 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
                            <img
                              src={item.image || ''}
                              alt={item.title}
                              className="h-full w-full object-contain mix-blend-luminosity"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-gold uppercase tracking-wider truncate">{item.brand || 'Samay'}</p>
                            <p className="text-[12px] font-semibold text-white line-clamp-2 leading-snug">{item.title}</p>
                          </div>
                        </div>
                        
                        {/* Interactive Quantity Adjustments */}
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 p-0.5">
                            <button 
                              type="button" 
                              onClick={() => {
                                if (item.qty > 1) updateQty(item.key, item.qty - 1)
                                else removeFromCart(item.key)
                              }}
                              className="size-6 flex items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <span className="text-sm font-black leading-none">−</span>
                            </button>
                            
                            <span className="w-5 text-center text-[12px] font-black text-white">
                              {item.qty}
                            </span>
                            
                            <button 
                              type="button" 
                              onClick={() => {
                                if (item.inventory === undefined || item.qty < item.inventory) {
                                  updateQty(item.key, item.qty + 1)
                                }
                              }}
                              className="size-6 flex items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <span className="text-sm font-black leading-none">+</span>
                            </button>
                          </div>
                          
                          <span className="text-[12px] font-black text-white/90">
                            ₹{((item.price || 0) * (item.qty || 1)).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Shopify-style Coupon Panel */}
                {!isBuyNow && (
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Discount Code</p>
                    {activeAppliedCoupon ? (
                      <div className="flex items-center justify-between rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2 text-[12px]">
                        <span className="font-bold text-green-400 uppercase tracking-wide">
                          {activeAppliedCoupon.code} ({activeAppliedCoupon.discountPercentage}%)
                        </span>
                        <button 
                          type="button" 
                          onClick={removeCoupon} 
                          className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-red-400 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Enter Promo Code"
                            value={checkoutCouponCode}
                            onChange={e => setCheckoutCouponCode(e.target.value)}
                            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase text-white outline-none focus:border-white/30 placeholder:normal-case placeholder:text-white/20 font-medium"
                          />
                          <button
                            type="button"
                            onClick={handleApplyCheckoutCoupon}
                            disabled={!checkoutCouponCode.trim() || isApplyingCheckoutCoupon}
                            className="rounded-lg bg-gold text-black px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isApplyingCheckoutCoupon ? '...' : 'Apply'}
                          </button>
                        </div>
                        {checkoutCouponError && (
                          <p className="mt-1.5 text-[10px] font-semibold text-red-400">
                            {checkoutCouponError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Totals */}
                <div className="mt-5 border-t border-white/10 pt-4 space-y-2">
                  {!isBuyNow && activeCartTotal !== activeGrandTotal && (
                    <>
                      <div className="flex items-center justify-between text-[11px] text-white/60">
                        <span>Subtotal</span>
                        <span>₹{activeCartTotal.toLocaleString('en-IN')}</span>
                      </div>
                      {activeAppliedCoupon && (
                        <div className="flex items-center justify-between text-[11px] text-green-400 font-bold">
                          <span>Discount ({activeAppliedCoupon.code})</span>
                          <span>– ₹{activeDiscountAmount.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-black uppercase tracking-widest text-white/80">Total</span>
                    <span className="text-[20px] font-black text-gold">
                      ₹{displayTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-[9px] text-white/30 uppercase tracking-wider mt-1">Incl. all taxes · Free delivery</p>
                </div>
              </div>

              {/* Right: Address Form */}
              <div className="flex flex-1 flex-col overflow-y-auto">
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-6 py-5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">Secure Checkout</p>
                    <h2 className="font-serif text-[22px] font-black text-black leading-none mt-1">Delivery Address</h2>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 transition-colors hover:border-black hover:text-black"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Steps indicator */}
                <div className="flex shrink-0 border-b border-neutral-100 px-6 py-3 gap-4 text-[10px] font-black uppercase tracking-[0.18em]">
                  <span className="flex items-center gap-1.5 text-black">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-white text-[9px]">1</span>
                    Address
                  </span>
                  <span className="text-neutral-300">›</span>
                  <span className="flex items-center gap-1.5 text-neutral-400">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 text-neutral-500 text-[9px]">2</span>
                    Payment
                  </span>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6">
                  <div className="space-y-4">
                    {/* Saved Address Selector */}
                    {user && savedAddresses.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                            Deliver to a Saved Address
                          </span>
                          {selectedAddressId && (
                            <button
                              type="button"
                              onClick={handleClearAddressSelection}
                              className="text-[9px] font-black uppercase tracking-widest text-neutral-400 hover:text-black transition-colors"
                            >
                              Reset / New Address
                            </button>
                          )}
                        </div>

                        <div className="flex gap-3 overflow-x-auto pb-2.5 scrollbar-hide shrink-0 snap-x">
                          {savedAddresses.map((addr) => {
                            const isSelected = selectedAddressId === addr._id
                            return (
                              <button
                                key={addr._id}
                                type="button"
                                onClick={() => handleSelectAddress(addr)}
                                className={cn(
                                  "snap-start text-left shrink-0 w-[220px] p-4 rounded-xl border relative transition-all flex flex-col justify-between",
                                  isSelected
                                    ? "border-black bg-neutral-50/50 shadow-sm"
                                    : "border-neutral-200 hover:border-neutral-300 bg-white"
                                )}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className="text-xs font-extrabold text-neutral-900 truncate pr-4">{addr.fullName}</span>
                                    {isSelected && (
                                      <span className="h-4 w-4 rounded-full bg-black text-white flex items-center justify-center shrink-0">
                                        <Check className="size-2.5 stroke-[3]" />
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-neutral-500 font-semibold leading-relaxed line-clamp-2">
                                    {addr.addressLine1}
                                    {addr.addressLine2 && `, ${addr.addressLine2}`}
                                  </p>
                                  <p className="text-[10px] text-neutral-500 font-semibold mt-0.5">
                                    {addr.city}, {addr.state} - {addr.pincode}
                                  </p>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                        <div className="h-px bg-neutral-100 mt-4" />
                      </div>
                    )}

                    {/* Personal Info */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Field id="fullName" label="Full Name" placeholder="Rahul Sharma" field="fullName" required half form={form} errors={errors} onChange={handleChange} />
                      <Field id="phone" label="Mobile Number" type="tel" placeholder="9876543210" field="phone" required half form={form} errors={errors} onChange={handleChange} />
                    </div>

                    <Field id="email" label="Email (optional)" type="email" placeholder="rahul@example.com" field="email" form={form} errors={errors} onChange={handleChange} />

                    <div className="h-px bg-neutral-100 my-2" />

                    <Field id="addressLine1" label="Address Line 1" placeholder="House no, Street, Area" field="addressLine1" required form={form} errors={errors} onChange={handleChange} />
                    <Field id="addressLine2" label="Address Line 2 (optional)" placeholder="Landmark, Colony" field="addressLine2" form={form} errors={errors} onChange={handleChange} />

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Field id="city" label="City" placeholder="Mumbai" field="city" required half form={form} errors={errors} onChange={handleChange} />

                      {/* State select */}
                      <label className="flex flex-1 min-w-0 flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                          State<span className="text-gold ml-0.5">*</span>
                        </span>
                        <select
                          id="state"
                          value={form.state}
                          onChange={e => handleChange('state', e.target.value)}
                          className={cn(
                            'w-full rounded-lg border bg-white px-4 py-3 text-[13px] font-medium outline-none transition-all',
                            errors.state
                              ? 'border-red-400 focus:border-red-400 bg-red-50/30'
                              : 'border-neutral-200 focus:border-black focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]',
                            !form.state ? 'text-neutral-400' : 'text-neutral-900'
                          )}
                        >
                          <option value="" disabled className="text-neutral-400">Select state</option>
                          {STATES.map(s => <option key={s} value={s} className="text-neutral-900">{s}</option>)}
                        </select>
                        {errors.state && <span className="text-[10px] font-semibold text-red-500">{errors.state}</span>}
                      </label>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-1 flex flex-col gap-1 relative">
                        <Field id="pincode" label="Pincode" placeholder="400001" field="pincode" required form={form} errors={errors} onChange={handleChange} />
                        {isPincodeLoading && (
                          <div className="absolute top-1 right-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-50 border border-neutral-100 animate-pulse">
                            <div className="size-1.5 rounded-full bg-gold animate-bounce" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Locating...</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0" />
                    </div>

                  </div>
                </form>

                {/* Footer */}
                <div className="shrink-0 border-t border-neutral-100 bg-white px-6 py-5">
                  {/* Mobile total */}
                  <div className="lg:hidden flex items-center justify-between mb-4">
                    <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Order Total</span>
                    <span className="font-serif text-[20px] font-black text-black">
                      ₹{displayTotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-black py-4 text-[12px] font-black uppercase tracking-widest text-white shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all hover:bg-neutral-900 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60"
                  >
                    Secure Checkout
                    <ShieldCheck className="size-4" />
                  </button>

                  <p className="mt-3 text-center text-[9px] font-semibold uppercase tracking-widest text-neutral-400 flex items-center justify-center gap-2">
                    <Lock className="size-2.5" /> 100% SAFE &amp; SSL ENCRYPTED PAYMENT
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
