import { Trash2, Heart, ShoppingBag } from 'lucide-react'
import { getSquareImage } from '../utils/cloudinary'
import { getProductPath } from '../utils/urlUtils'
import { useWishlist } from '../contexts/WishlistContext'
import { useCart } from '../contexts/CartContext'
import { useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'

function formatPrice(value) {
  const num = Number(value || 0)
  return `₹${num.toLocaleString('en-IN')}`
}

export default function Wishlist() {
  const { wishlistItems, removeFromWishlist } = useWishlist()
  const { initiateCheckout } = useCart()
  const hasItems = wishlistItems.length > 0

  const handleBuyNow = (e, item) => {
    e.preventDefault()
    e.stopPropagation()
    const INQUIRY_ONLY_BRANDS = ['RADO', 'TISSOT', 'LONGINES', 'SEIKO']
    if (INQUIRY_ONLY_BRANDS.includes(item.brand?.trim().toUpperCase())) {
      window.location.href = getProductPath(item)
      return
    }
    // Transform wishlist item back to expected product format for modal
    const productData = {
      _id: item.productId,
      productId: item.productId,
      title: item.title,
      price: item.price,
      brand: item.brand,
      slug: item.slug,
      image: { url: item.image },
      images: [item.image]
    }
    initiateCheckout(true, productData)
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 sm:py-10">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1 sm:gap-4 border-b border-neutral-100 pb-5 mt-4 sm:mt-12">
        <div>
          <h1 className="font-poppins text-[28px] sm:text-4xl font-bold text-black uppercase tracking-tight">Your Wishlist</h1>
          <p className="hidden sm:block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mt-1">Exclusive Selection</p>
        </div>
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-gold/80 sm:text-neutral-400">{wishlistItems.length} timepiece{wishlistItems.length !== 1 ? 's' : ''}</p>
      </div>

      {!hasItems ? (
        <div className="py-24 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mb-6">
            <Heart className="size-8 text-neutral-300" strokeWidth={1} />
          </div>
          <p className="text-lg font-serif text-neutral-900">Your wishlist is currently empty.</p>
          <Link to="/all-products" className="mt-6 inline-block bg-black text-white px-8 py-3 text-[11px] font-black uppercase tracking-widest rounded-lg transition-transform active:scale-95">
            Explore Collections
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-x-10 sm:gap-y-24">
          {wishlistItems.map((item) => {
            return (
              <article key={item.key} className="group relative flex flex-col transition-all duration-300">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    removeFromWishlist(item.key)
                  }}
                  className="absolute right-2 top-2 z-20 cursor-pointer text-neutral-400 transition-colors hover:text-red-500 opacity-100 sm:opacity-0 group-hover:opacity-100 duration-300 bg-white/90 rounded-full p-2 shadow-md"
                  aria-label="Remove from wishlist"
                >
                  <Trash2 className="size-4" />
                </button>
                <div className="flex flex-col flex-1">
                  <Link to={getProductPath(item)} className="block">
                    <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-neutral-50/50 p-6 rounded-lg transition-colors group-hover:bg-neutral-100/50">
                      <img
                        src={getSquareImage(item.image)}
                        alt={item.title || ''}
                        loading="lazy"
                        className="max-h-[380px] w-auto object-contain transition-transform duration-700 ease-out group-hover:scale-105 mix-blend-multiply"
                      />
                    </div>
                  </Link>
                  <div className="mt-4 sm:mt-6 flex flex-col text-center px-1">
                    <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-gold/80">
                      {item.brand || '—'}
                    </p>
                    <Link to={getProductPath(item)}>
                      <h2 className="mt-1.5 min-h-[32px] sm:min-h-[48px] font-poppins text-[13px] sm:text-[18px] font-medium leading-tight sm:leading-snug text-neutral-900 line-clamp-2 group-hover:text-gold transition-colors duration-300 tracking-tight">
                        {item.title || '—'}
                      </h2>
                    </Link>
                    <div className="mt-2 text-center">
                      <p className="text-[15px] sm:text-[18px] text-neutral-900 font-poppins font-bold tracking-tight">
                        {formatPrice(item.price)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleBuyNow(e, item)}
                      className="mt-5 w-full rounded-xl bg-black py-3.5 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.25em] text-white shadow-lg transition-all hover:bg-neutral-900 hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <ShoppingBag className="size-4" strokeWidth={2.5} />
                      {['RADO', 'TISSOT', 'LONGINES', 'SEIKO'].includes(item.brand?.trim().toUpperCase()) ? 'Inquire Us' : 'Buy Now'}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
