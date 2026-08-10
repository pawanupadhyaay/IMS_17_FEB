import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import { getNewArrivals } from '../../services/productService'
import { getSquareImage } from "../../utils/cloudinary"
import { cn } from '../../utils/cn'
import { useWishlist } from '../../contexts/WishlistContext'
import { getProductPath } from '../../utils/urlUtils'

import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

const CATEGORIES = ['MEN', 'WOMEN', 'UNISEX']

const SAFE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800' viewBox='0 0 800 800'%3E%3Crect width='800' height='800' fill='%23f3f4f6'/%3E%3Cpath d='M400 300a50 50 0 1 0 0 100 50 50 0 0 0 0-100zm-150 200h300l-75-100-75 100-50-60-100 60z' fill='%239ca3af'/%3E%3Ctext x='400' y='550' font-family='sans-serif' font-size='20' text-anchor='middle' fill='%239ca3af'%3EImage not available%3C/text%3E%3C/svg%3E";

function getProductImage(product) {
  const img = (Array.isArray(product.images) && product.images.length > 0) ? product.images[0] : product.image?.url;
  if (!img) return '';
  return typeof img === 'string' ? img : img?.url;
}

function getSecondaryProductImage(product) {
  if (Array.isArray(product.images) && product.images.length > 1) {
    const img = product.images[1];
    return typeof img === 'string' ? img : img?.url;
  }
  return '';
}

function formatPrice(value) {
  if (value == null || value === '') return ''
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return `₹${num.toLocaleString('en-IN')}`
}

function ProductCard({ product }) {
  const { toggleWishlist, isInWishlist } = useWishlist()
  const [isLoaded, setIsLoaded] = useState(false)
  const imageUrl = getProductImage(product)
  const secondUrl = getSecondaryProductImage(product)
  const hasAltImage = Boolean(secondUrl && secondUrl !== imageUrl)
  const hasOldPrice = product.oldPrice != null && product.oldPrice > 0 && product.oldPrice > (product.price ?? 0)
  const href = getProductPath(product)

  return (
    <Link
      to={href}
      aria-label={product.title ? `${product.title} — view product` : 'View product'}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-neutral-100/90 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] md:rounded-none md:border-0 md:shadow-none"
    >
      <div className="relative aspect-[1/1.2] w-full overflow-hidden rounded-xl sm:rounded-2xl bg-[#efefef] p-3 sm:p-4">
        {/* NEW Badge or SOLD OUT Badge */}
        {(product.soldOut === true || (product.inventory !== undefined && product.inventory <= 0)) ? (
          <div className="absolute left-3 top-3 z-10 text-[10px] font-bold text-red-600 uppercase tracking-widest bg-white/95 px-1.5 py-0.5 shadow-sm rounded">
            SOLD OUT
          </div>
        ) : (
          <div className="absolute left-3 top-3 z-10 text-[10px] font-bold text-neutral-600 md:text-[9px]">
            NEW
          </div>
        )}

        <button
          type="button"
          className="absolute right-3 top-3 z-10 cursor-pointer text-neutral-400 transition-colors hover:text-red-500"
          aria-label="Toggle wishlist"
          onClick={(e) => {
            e.preventDefault()
            toggleWishlist(product)
          }}
        >
          <Heart 
            className={cn("size-5 transition-all duration-300", isInWishlist(product._id) ? "fill-red-500 text-red-500" : "text-neutral-400")} 
            strokeWidth={1.5} 
          />
        </button>

        {imageUrl ? (
          <div className={cn(
            "relative aspect-square w-full flex items-center justify-center overflow-hidden bg-transparent p-6 sm:p-8 transition-colors",
            !isLoaded && "animate-pulse bg-neutral-50"
          )}>
            <img
              src={getSquareImage(imageUrl, 400)}
              alt={product.title}
              onLoad={() => setIsLoaded(true)}
              onError={(e) => {
                setIsLoaded(true);
                const currentSrc = e.currentTarget.src;
                if (!currentSrc.includes(imageUrl) && imageUrl) {
                  e.currentTarget.src = imageUrl;
                } else {
                  e.currentTarget.src = SAFE_PLACEHOLDER;
                }
              }}
              className={cn(
                'h-full w-full object-contain mix-blend-multiply transition-all duration-700 ease-out',
                isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
                !hasAltImage && 'group-hover:scale-105',
                hasAltImage &&
                  'opacity-100 group-hover:opacity-0 group-active:opacity-0 group-focus-within:opacity-0'
              )}
            />
            {hasAltImage ? (
              <img
                src={getSquareImage(secondUrl, 400)}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-contain p-6 sm:p-8 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 group-active:opacity-100 group-focus-within:opacity-100 mix-blend-multiply"
                onError={(e) => {
                  e.currentTarget.style.opacity = '0'
                }}
              />
            ) : null}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center aspect-square bg-neutral-50/50">
            <span className="text-xs text-neutral-400 italic font-serif">No image</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-3 sm:pt-4 text-left md:pt-3">
        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
          <p className="text-[11px] sm:text-[13px] font-bold uppercase tracking-tight text-black md:text-[11px] truncate">
            {product.brand || '—'}
          </p>
          {hasOldPrice && (
            <span className="shrink-0 rounded bg-red-600 px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold text-white">
              {Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}% OFF
            </span>
          )}
        </div>

        <p className="mt-0.5 sm:mt-1 line-clamp-1 text-[11px] sm:text-[12px] font-medium text-neutral-600 md:text-[11px]" title={product.title}>
          {product.title || '—'}
        </p>

        <div className="mt-1.5 sm:mt-2 flex items-baseline gap-2">
          <span className="font-poppins text-[16px] sm:text-[18px] font-bold text-neutral-900 md:text-[16px]">
            {formatPrice(product.price)}
          </span>
          {hasOldPrice && (
            <span className="text-[11px] sm:text-[12px] text-neutral-400 line-through">
              {formatPrice(product.oldPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function SkeletonCard() {
  return (
    <div className="flex h-full flex-col rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="aspect-[4/5] w-full bg-neutral-200 animate-pulse" />
      <div className="flex flex-1 flex-col p-6 space-y-2">
        <div className="h-3 w-20 bg-neutral-200 rounded animate-pulse" />
        <div className="h-4 w-full bg-neutral-200 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-neutral-200 rounded animate-pulse" />
        <div className="h-5 w-24 bg-neutral-200 rounded animate-pulse mt-auto pt-2" />
      </div>
    </div>
  )
}

export default function NewArrivals() {
  const [activeCategory, setActiveCategory] = useState('MEN')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getNewArrivals(activeCategory)
      .then((data) => {
        if (!cancelled) setProducts(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load new arrivals')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [activeCategory])

  return (
    <section
      id="collection"
      className="flex w-full justify-center bg-white py-14 sm:py-16 md:py-32 scroll-mt-[72px]"
      aria-labelledby="new-arrivals-heading"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="mb-8 sm:mb-12 flex items-center justify-center gap-3 sm:gap-4">
          <div className="h-px flex-1 max-w-[48px] sm:max-w-none bg-neutral-200" aria-hidden />
            <h2
              id="new-arrivals-heading"
              className="text-center text-[17px] sm:text-[22px] md:text-3xl font-poppins font-bold uppercase tracking-[0.2em] sm:tracking-widest text-black"
            >
            New Arrivals
          </h2>
          <div className="h-px flex-1 max-w-[48px] sm:max-w-none bg-neutral-200" aria-hidden />
        </div>

        <div className="mb-6 sm:mb-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`min-h-[44px] rounded-full border px-5 py-2.5 sm:px-6 md:px-10 text-[11px] sm:text-[12px] font-bold uppercase tracking-wider transition-all duration-300 md:text-xs ${activeCategory === cat
                ? 'border-black bg-black text-white shadow-md'
                : 'border-neutral-200/90 bg-neutral-50/80 text-neutral-500 hover:border-black hover:text-black hover:bg-neutral-100'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="w-full -mx-1 sm:mx-0">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-12">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : error ? (
            <p className="text-center text-neutral-600">{error}</p>
          ) : products.length === 0 ? (
            <p className="text-center text-neutral-600">No new arrivals yet.</p>
          ) : (
            <Swiper
              modules={[Navigation, Pagination]}
              spaceBetween={12}
              slidesPerView={2}
              navigation={{
                nextEl: '.swiper-button-next-new',
                prevEl: '.swiper-button-prev-new',
              }}
              pagination={{
                clickable: true,
                dynamicBullets: true,
                bulletClass: 'swiper-pagination-bullet !w-2 !h-2',
              }}
              breakpoints={{
                480: { spaceBetween: 16, slidesPerView: 2 },
                640: { spaceBetween: 24, slidesPerView: 2 },
                768: { spaceBetween: 24, slidesPerView: 3 },
                1024: { spaceBetween: 32, slidesPerView: 4 },
              }}
              className="new-arrivals-swiper pb-28 sm:pb-32"
            >
              {products.map((product) => (
                <SwiperSlide key={product._id} className="h-auto">
                  <ProductCard product={product} />
                </SwiperSlide>
              ))}

              <div className="hidden lg:block">
                <button className="swiper-button-prev-new absolute -left-12 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-3 text-neutral-700 shadow-md transition hover:bg-neutral-900 hover:text-white">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button className="swiper-button-next-new absolute -right-12 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-3 text-neutral-700 shadow-md transition hover:bg-neutral-900 hover:text-white">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </Swiper>
          )}
        </div>
      </div>
    </section>
  )
}
