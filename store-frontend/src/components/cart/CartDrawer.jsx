import { motion, AnimatePresence } from 'framer-motion'
import { X, Truck, Heart, Trash2, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../../contexts/CartContext'
import { useAuth } from '../../contexts/AuthContext'
import { getSquareImage } from '../../utils/cloudinary'
import { getProductPath } from '../../utils/urlUtils'
import { cn } from '../../utils/cn'
import { useState, useEffect } from 'react'
import { lockBodyScroll } from '../../utils/bodyScrollLock'

function formatPrice(value) {
  if (value == null || value === '') return ''
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return `₹${num.toLocaleString('en-IN')}`
}

export default function CartDrawer() {
  const {
    isCartOpen,
    setIsCartOpen,
    cartItems,
    cartTotal,
    removeFromCart,
    updateQty,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    discountAmount,
    shippingValue,
    grandTotal,
    initiateCheckout
  } = useCart()

  const { user, openAuthModal } = useAuth()

  const [couponCode, setCouponCode] = useState('')
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [couponError, setCouponError] = useState('')

  useEffect(() => {
    if (!isCartOpen) return undefined
    return lockBodyScroll()
  }, [isCartOpen])

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setIsApplyingCoupon(true)
    setCouponError('')
    const result = await applyCoupon(couponCode)
    if (!result.success) {
      setCouponError(result.message)
    } else {
      setCouponCode('')
    }
    setIsApplyingCoupon(false)
  }

  return (
    <AnimatePresence>
      {isCartOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex justify-end"
        >
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            aria-label="Close cart"
            onClick={() => setIsCartOpen(false)}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl"
          >
            {/* Premium Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-5 bg-neutral-50/50">
              <div>
                <h3 className="text-2xl font-serif font-black tracking-tight text-black">Your Cart</h3>
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mt-0.5">{cartItems.length} items</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="rounded-full p-2 text-neutral-400 hover:bg-white hover:text-black hover:shadow-sm transition-all"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Free Shipping Motivation */}
            <div className="bg-black px-6 py-3 flex items-center gap-3 text-white">
              <Truck className="size-4 text-gold" />
              <p className="text-xs font-medium tracking-wide">
                {cartTotal >= 50000 ? (
                  <>You have unlocked <span className="text-gold font-bold">Complimentary Insured Shipping</span></>
                ) : (
                  <>Add <span className="font-bold">{formatPrice(50000 - cartTotal)}</span> more for free insured shipping</>
                )}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-70">
                  <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                    <Heart className="size-6 text-neutral-300" />
                  </div>
                  <p className="text-lg font-serif text-neutral-900 mb-2">Your cart is empty</p>
                  <p className="text-sm text-neutral-500 max-w-[200px]">Explore our collections and add items to your cart.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {cartItems.map((item, i) => (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={item.key}
                      className="flex gap-5 pb-6 border-b border-neutral-100/80 group"
                    >
                      <Link to={getProductPath(item)} onClick={() => setIsCartOpen(false)} className="relative h-28 w-24 shrink-0 overflow-hidden rounded bg-neutral-50 flex items-center justify-center px-1">
                        <img
                          src={getSquareImage(item.image)}
                          alt={item.title}
                          className="h-full w-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                      </Link>
                      <div className="flex flex-1 flex-col justify-between py-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-black">{item.brand || 'Samay'}</p>
                            <Link to={getProductPath(item)} onClick={() => setIsCartOpen(false)} className="line-clamp-2 text-sm font-medium leading-snug text-neutral-800 hover:text-neutral-600 transition-colors">{item.title}</Link>
                            <p className="text-xs text-neutral-400">Size: {item.size || 'Standard'}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.key)}
                            className="text-neutral-300 hover:text-red-500 transition-colors bg-white p-1 rounded-full shadow-sm"
                            aria-label="Remove item"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                        <div className="mt-4 flex items-end justify-between">
                          <div className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white p-1">
                            <button 
                              type="button" 
                              onClick={() => {
                                if (item.qty > 1) updateQty(item.key, item.qty - 1)
                              }}
                              className="size-7 flex items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-50 hover:text-black transition-colors"
                            >
                              <span className="text-lg leading-none">−</span>
                            </button>
                            
                            <motion.span 
                              key={item.qty}
                              animate={item.qty >= item.inventory ? { x: [0, -2, 2, -2, 2, 0] } : {}}
                              transition={{ duration: 0.4 }}
                              className="w-6 text-center text-[13px] font-black text-black"
                            >
                              {item.qty}
                            </motion.span>
                            
                            <button 
                              type="button" 
                              onClick={() => {
                                if (item.inventory === undefined || item.qty < item.inventory) {
                                  updateQty(item.key, item.qty + 1)
                                }
                              }}
                              className={cn(
                                "size-7 flex items-center justify-center rounded-md transition-colors",
                                (item.inventory !== undefined && item.qty >= item.inventory) 
                                  ? "text-neutral-200 cursor-not-allowed" 
                                  : "text-neutral-400 hover:bg-neutral-50 hover:text-black"
                              )}
                            >
                              <span className="text-lg leading-none">+</span>
                            </button>
                          </div>
                          <p className="text-lg font-bold text-neutral-900">
                            {formatPrice((item.price || 0) * (item.qty || 1))}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="border-t border-neutral-100 bg-neutral-50/50 p-6 pb-8">
                {/* Coupon UI */}
                <div className="mb-6">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2.5">Promo / Discount Code</p>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50/50 px-4 py-3">
                      <div className="flex items-center gap-2.5 text-green-700">
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-[13px] font-black tracking-wide uppercase">{appliedCoupon.code} <span className="text-green-600/70 font-bold">({appliedCoupon.discountPercentage}%)</span></span>
                      </div>
                      <button type="button" onClick={removeCoupon} className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 hover:text-red-500 transition-colors">Remove</button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter Code"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                          className="flex-1 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm uppercase outline-none focus:border-black placeholder:normal-case placeholder:text-neutral-400 font-medium"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={!couponCode.trim() || isApplyingCoupon}
                          className="rounded-lg bg-neutral-900 px-5 py-2 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-black disabled:opacity-50"
                        >
                          {isApplyingCoupon ? '...' : 'Apply'}
                        </button>
                      </div>
                      {couponError && <p className="mt-2 text-xs font-semibold text-red-500 flex items-center gap-1.5"><svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> {couponError}</p>}
                    </div>
                  )}
                </div>

                <div className="space-y-3 mb-6 border-b border-neutral-200 pb-5">
                  <div className="flex items-center justify-between text-sm text-neutral-600 font-medium">
                    <span>Subtotal</span>
                    <span className="font-semibold text-neutral-900">{formatPrice(cartTotal)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex items-center justify-between text-sm text-green-600 font-bold">
                      <span>Discount ({appliedCoupon.code})</span>
                      <span>- {formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm text-neutral-600 font-medium">
                    <span>Est. Shipping & Handling</span>
                    {shippingValue === 0 ? (
                      <span className="font-bold text-green-600 uppercase tracking-widest text-[11px]">Free</span>
                    ) : (
                      <span className="font-semibold text-neutral-900">{formatPrice(shippingValue)}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-end justify-between mb-6">
                  <div>
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-1">Estimated Total</p>
                    <p className="text-3xl font-poppins text-black font-bold">{formatPrice(grandTotal)}</p>
                  </div>
                  <p className="text-[10px] text-neutral-400 max-w-[100px] text-right">Taxes included where applicable</p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => initiateCheckout(false)}
                    className="w-full rounded-md bg-black py-4 text-[13px] font-black uppercase text-white tracking-widest shadow-xl transition-all hover:bg-neutral-900 active:scale-[0.98] flex justify-center items-center gap-2"
                  >
                    <ShieldCheck className="size-4 text-gold" />
                    Secure Checkout
                  </button>
                  <div className="flex items-center justify-center gap-1 mt-2 text-black">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="size-6"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H8l4-7v6h3l-4 5z" /></svg>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Samay Authenticity Guarantee</span>
                  </div>
                </div>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
