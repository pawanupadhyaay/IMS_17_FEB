import { useEffect, useState, useMemo } from 'react'
import { updatePageSEO } from '../utils/seoHelper'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { Heart, SlidersHorizontal, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import FilterDrawer from '../components/common/FilterDrawer'
import Pagination from '../components/common/Pagination'
import { cn } from '../utils/cn'
import { getSquareImage } from '../utils/cloudinary'
import { useWishlist } from '../contexts/WishlistContext'
import { getProductPath } from '../utils/urlUtils'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const LIMIT = 12

/** Fetch all brands and find object by slug (for breadcrumbs and filtering) */
async function fetchBrandBySlug(slug) {
  try {
    const res = await fetch(`${API_BASE}/api/store/brands`)
    const data = await res.json()
    if (data?.success && Array.isArray(data.data)) {
      const brand = data.data.find((b) => (b.slug || '').toLowerCase() === (slug || '').toLowerCase())
      return brand || null
    }
  } catch (_) {}
  return null
}

/* ============================
   HELPERS
============================ */

function getProductImage(product) {
  const img = (Array.isArray(product.images) && product.images.length > 0) ? product.images[0] : product.image?.url;
  if (!img) return '';
  return typeof img === 'string' ? img : img?.url;
}

function formatPrice(value) {
  if (value == null || value === '') return ''
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return `₹${num.toLocaleString('en-IN')}`
}

function unslugify(slug) {
  if (!slug) return ''
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/* ============================
   PRODUCT CARD
============================ */

function ProductCard({ product }) {
  const { toggleWishlist, isInWishlist } = useWishlist()
  const [isLoaded, setIsLoaded] = useState(false)
  const imageUrl = getProductImage(product)
  const soldOut = product.soldOut === true
  
  const href = getProductPath(product)

  return (
    <Link to={href} className="group flex flex-col relative transition-all duration-300">
      <button
        type="button"
        className="absolute right-2 top-2 z-10 cursor-pointer text-neutral-400 transition-colors hover:text-red-500 opacity-100 sm:opacity-0 group-hover:opacity-100 duration-300"
        aria-label="Toggle wishlist"
        onClick={(e) => {
          e.preventDefault()
          toggleWishlist(product)
        }}
      >
        <Heart 
          className={cn("size-4 sm:size-5 transition-all duration-300", isInWishlist(product._id) ? "fill-red-500 text-red-500" : "text-neutral-400")} 
          strokeWidth={1.5} 
        />
      </button>

      <div className={cn(
        "relative flex aspect-square w-full items-center justify-center overflow-hidden bg-white p-6 sm:p-8 rounded-xl transition-colors",
        !isLoaded && "animate-pulse bg-neutral-50"
      )}>
        {soldOut && (
          <span className="absolute left-2 top-2 z-10 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-red-600 bg-white px-1.5 py-0.5 shadow-sm">
            Sold Out
          </span>
        )}
        {imageUrl ? (
          <img
            src={getSquareImage(imageUrl, 400)}
            alt={product.title}
            className={cn(
              "h-full w-full object-contain mix-blend-multiply transition-transform duration-700 ease-in-out",
              isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95",
              isLoaded && "group-hover:scale-110"
            )}
            onLoad={() => setIsLoaded(true)}
            onError={(e) => {
              setIsLoaded(true);
              const currentSrc = e.currentTarget.src;
              if (!currentSrc.includes(imageUrl) && imageUrl) {
                e.currentTarget.src = imageUrl;
              } else {
                const SAFE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800' viewBox='0 0 800 800'%3E%3Crect width='800' height='800' fill='%23f3f4f6'/%3E%3Cpath d='M400 300a50 50 0 1 0 0 100 50 50 0 0 0 0-100zm-150 200h300l-75-100-75 100-50-60-100 60z' fill='%239ca3af'/%3E%3Ctext x='400' y='550' font-family='sans-serif' font-size='18' text-anchor='middle' fill='%239ca3af'%3EImage not available%3C/text%3E%3C/svg%3E";
                e.currentTarget.src = SAFE_PLACEHOLDER;
              }
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center aspect-square bg-neutral-50/50">
            <span className="text-[10px] text-neutral-400 font-serif italic">No image</span>
          </div>
        )}
      </div>

      <div className="mt-3 sm:mt-5 flex flex-col text-center px-1">
        <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-gold/80 transition-colors">
          {product.brand || '—'}
        </p>
        <h3 className="mt-1 sm:mt-2 min-h-[36px] sm:min-h-[48px] font-poppins text-[13px] sm:text-[18px] font-medium leading-tight sm:leading-snug text-neutral-900 line-clamp-2 group-hover:text-gold transition-colors duration-300 tracking-tight">
          {product.title || '—'}
        </h3>
        <div className="mt-1.5 sm:mt-3">
          <p className="text-[14px] sm:text-[16px] text-neutral-800 font-poppins font-semibold">
            {formatPrice(product.price)}
          </p>
        </div>
      </div>
    </Link>
  )
}

function SkeletonCard() {
  return (
    <div className="flex flex-col">
      <div className="aspect-square w-full animate-pulse bg-neutral-100 rounded-lg" />
      <div className="mt-6 h-3 w-20 animate-pulse rounded bg-neutral-100 mx-auto" />
      <div className="mt-3 h-5 w-3/4 animate-pulse rounded bg-neutral-100 mx-auto" />
      <div className="mt-4 h-4 w-24 animate-pulse rounded bg-neutral-100 mx-auto" />
    </div>
  )
}

/* ============================
   FILTERS CONFIG
============================ */

const FILTER_KEYS = [
  'category',
  'gender',
  'caseMaterial',
  'caseSize',
  'dialColor',
  'movement',
  'waterResistance',
]

const FILTER_LABELS = {
  category: 'Category',
  gender: 'Gender',
  caseMaterial: 'Case Material',
  caseSize: 'Case Size',
  dialColor: 'Dial Color',
  movement: 'Movement',
  waterResistance: 'Water Resistance',
}

function parseParam(param) {
  if (param == null || param === '') return []
  return param.split(',').map((s) => s.trim()).filter(Boolean)
}

/* ============================
   MAIN PAGE
============================ */

export default function BrandCollection() {
  const { brandSlug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const pageParam = searchParams.get('page')
  const currentPage = Math.max(1, parseInt(pageParam, 10) || 1)

  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: LIMIT, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('alphabetically')
  const [filtersData, setFiltersData] = useState({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [brandFromApi, setBrandFromApi] = useState(null)

  // Resolve brand slug → full object via API (so product filter matches DB & breadcrumbs are accurate)
  useEffect(() => {
    if (!brandSlug) return
    fetchBrandBySlug(brandSlug).then((brand) => setBrandFromApi(brand))
  }, [brandSlug])

  const brandName = useMemo(
    () => brandFromApi?.name ?? unslugify(brandSlug),
    [brandFromApi, brandSlug]
  )

  // Dynamic SEO meta tag updating for brand collections
  useEffect(() => {
    if (!brandName) return;
    const title = `${brandName} Watches Collection | Samay Watch`;
    const description = `Discover the exquisite range of ${brandName} premium and luxury timepieces. Certified authentic models, hand-crafted precision and free nationwide delivery.`;
    const keywords = `${brandName.toLowerCase()}, ${brandName.toLowerCase()} watches, luxury watches, premium watches, buy ${brandName.toLowerCase()} watch, Samay Watch`;

    updatePageSEO({
      title,
      description,
      keywords,
      ogImage: 'https://i.ibb.co/2XHCWRL/samay-logo.png'
    });
  }, [brandName]);

  // Selected filters from URL
  const selectedByKey = useMemo(() => {
    const obj = {}
    FILTER_KEYS.forEach((k) => { obj[k] = parseParam(searchParams.get(k)) })
    return obj
  }, [searchParams])

  // Fetch contextual filters (derived from this brand's available inventory)
  useEffect(() => {
    if (!brandSlug || !brandName) return
    let cancelled = false

    const qs = new URLSearchParams({
      brand: brandName,
      brandSlug,
    })

    fetch(`${API_BASE}/api/store/products/filters?${qs.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        if (json?.success && json?.data) {
          setFiltersData(json.data)
        }
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [brandSlug, brandName])

  // Fetch paginated + filtered + sorted products
  useEffect(() => {
    if (!brandSlug) return
    let cancelled = false
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    params.set('page', String(currentPage))
    params.set('limit', String(LIMIT))
    params.set('brand', brandName)
    params.set('brandSlug', brandSlug)

    if (sortBy === 'alphabetically') {
      params.set('sortBy', 'title')
      params.set('sortOrder', 'asc')
    } else if (sortBy === 'price-low') {
      params.set('sortBy', 'price')
      params.set('sortOrder', 'asc')
    } else if (sortBy === 'price-high') {
      params.set('sortBy', 'price')
      params.set('sortOrder', 'desc')
    } else if (sortBy === 'newest') {
      params.set('sortBy', 'createdAt')
      params.set('sortOrder', 'desc')
    }

    FILTER_KEYS.forEach((k) => {
      const vals = selectedByKey[k]
      if (vals && vals.length) params.set(k, vals.join(','))
    })

    fetch(`${API_BASE}/api/store/products?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data?.success && Array.isArray(data.data)) {
          setProducts(data.data)
          if (data.pagination) setPagination(data.pagination)
          else setPagination((prev) => ({
            ...prev,
            page: currentPage,
            pages: 1,
            total: data.data.length
          }))
        } else {
          setProducts([])
          setPagination((prev) => ({ ...prev, page: 1, pages: 0, total: 0 }))
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load products')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [
    brandSlug,
    brandName,
    currentPage,
    sortBy,
    ...FILTER_KEYS.map((k) => (selectedByKey[k] || []).join(',')),
  ])

  const updateFilterParam = (filterKey, values) => {
    const next = new URLSearchParams(searchParams)
    if (values.length === 0) next.delete(filterKey)
    else next.set(filterKey, values.join(','))
    next.set('page', '1')
    setSearchParams(next, { replace: false })
  }

  const handleFilterToggle = (filterKey, value) => {
    const current = selectedByKey[filterKey] || []
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    updateFilterParam(filterKey, next)
  }

  const handlePageChange = (nextPage) => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(nextPage))
    setSearchParams(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const clearAllFilters = () => {
    // We clear all filters but keep the page at 1. The brand context is preserved by the URL params/slug.
    const next = new URLSearchParams()
    next.set('page', '1')
    setSearchParams(next, { replace: false })
  }

  const hasActiveFilters = FILTER_KEYS.some((k) => (selectedByKey[k] || []).length > 0)
  const totalSelected = FILTER_KEYS.reduce((sum, k) => sum + (selectedByKey[k]?.length || 0), 0)

  const total = pagination.total ?? 0
  const totalPages = Math.max(1, pagination.pages ?? 1)

  return (
    <div className="min-h-screen bg-white">

      {/* Filter Drawer */}
      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filterKeys={FILTER_KEYS}
        filterLabels={FILTER_LABELS}
        filtersData={filtersData}
        selectedByKey={selectedByKey}
        onToggle={handleFilterToggle}
        onClearAll={clearAllFilters}
        sortBy={sortBy}
        onSortChange={setSortBy}
        totalProducts={total}
      />

      {/* Premium Hero Banner */}
      <div className="relative bg-black text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-neutral-900 to-black" />
        <div className="relative mx-auto max-w-[1400px] px-6 py-16 md:py-24">
          <nav className="mb-8 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-300">
            <Link to="/" className="hover:text-gold transition-colors">Home</Link>
            <span className="mx-3 text-neutral-500">—</span>
            <span className="hover:text-gold transition-colors cursor-default capitalize">
              {brandFromApi?.category || 'Collections'}
            </span>
            <span className="mx-3 text-neutral-500">—</span>
            <span className="text-white border-b border-gold/30 pb-0.5">{brandName}</span>
          </nav>
          <h1 className="font-montserrat text-[42px] sm:text-[72px] font-black leading-[1.1] tracking-[0.1em] text-white uppercase italic">
            {brandName}
          </h1>
          <p className="mt-4 text-[14px] sm:text-[18px] font-medium text-neutral-200 max-w-2xl leading-relaxed">
            Explore the complete {brandName} collection. Discover timepieces that define precision and style.
          </p>
          <div className="mt-8 h-[2px] w-12 sm:w-20 bg-gold shadow-[0_0_10px_rgba(198,167,78,0.5)]" />
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 pt-10 pb-24">

        {/* ─── Top Bar ─── */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-neutral-100 pb-8">
          <span className="text-[10px] sm:text-[12px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{total} Products</span>

          {/* Filter & Sort Button */}
          <div className="flex">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-full border-[1.5px] border-black bg-white px-6 py-3 text-[11px] font-black uppercase tracking-widest text-black transition-all hover:bg-black hover:text-white shadow-sm active:scale-95"
            >
              <SlidersHorizontal className="size-3.5" />
              Filter & Sort
              {totalSelected > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] text-white">{totalSelected}</span>
              )}
            </button>
          </div>
        </div>

        {/* ─── Active Filter Pills ─── */}
        {hasActiveFilters && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mr-1">Active:</span>
            {FILTER_KEYS.flatMap((key) =>
              (selectedByKey[key] || []).map((val) => (
                <button
                  key={`${key}-${val}`}
                  type="button"
                  onClick={() => handleFilterToggle(key, val)}
                  className="flex items-center gap-1.5 rounded-full bg-black px-3 py-1 text-[10px] font-bold text-white transition-opacity hover:opacity-80"
                >
                  {val}
                  <X className="size-3" />
                </button>
              ))
            )}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 underline underline-offset-2 hover:text-neutral-800 ml-1"
            >
              Clear all
            </button>
          </div>
        )}

        {error && (
          <p className="mb-8 text-center text-sm text-red-600">{error}</p>
        )}

        {/* No Products State */}
        {!loading && products.length === 0 && !error && (
          <div className="text-center py-24">
            <p className="font-serif text-[24px] text-neutral-300 italic">No watches found</p>
            <p className="mt-4 text-[14px] text-neutral-400">
              {hasActiveFilters
                ? 'Try adjusting your filters to see more results.'
                : `We're currently updating our ${brandName} collection. Check back soon!`
              }
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-6 text-[11px] font-bold uppercase tracking-widest text-black border-b-2 border-black pb-1 hover:text-gold hover:border-gold transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-x-10 sm:gap-y-24">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
              />
            ))}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-20">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}

      </div>
    </div>
  )
}
