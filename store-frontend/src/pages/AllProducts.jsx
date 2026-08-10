import { useEffect, useState } from 'react'
import { updatePageSEO } from '../utils/seoHelper'
import { useSearchParams, Link } from 'react-router-dom'
import { Heart, SlidersHorizontal, X } from 'lucide-react'
import FilterDrawer from '../components/common/FilterDrawer'
import { useWishlist } from '../contexts/WishlistContext'
import Pagination from '../components/common/Pagination'
import { cn } from '../utils/cn'
import { getSquareImage } from '../utils/cloudinary'
import { getProductPath } from '../utils/urlUtils'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const LIMIT = 12

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

/* ============================
   PREMIUM PRODUCT CARD
============================ */

function ProductCard({ product, brandMap = {} }) {
  const { toggleWishlist, isInWishlist } = useWishlist()
  const [isLoaded, setIsLoaded] = useState(false)
  const imageUrl = getProductImage(product)
  
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
        "relative flex aspect-square w-full items-center justify-center overflow-hidden bg-transparent p-6 sm:p-8 rounded-xl transition-colors",
        !isLoaded && "animate-pulse bg-neutral-50"
      )}>
        {(product.soldOut === true || (product.inventory !== undefined && product.inventory <= 0)) && (
          <span className="absolute left-2 top-2 z-10 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-red-600 bg-white px-1.5 py-0.5 shadow-sm">
            Sold Out
          </span>
        )}
        {imageUrl ? (
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
                const SAFE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800' viewBox='0 0 800 800'%3E%3Crect width='800' height='800' fill='%23f3f4f6'/%3E%3Cpath d='M400 300a50 50 0 1 0 0 100 50 50 0 0 0 0-100zm-150 200h300l-75-100-75 100-50-60-100 60z' fill='%239ca3af'/%3E%3Ctext x='400' y='550' font-family='sans-serif' font-size='18' text-anchor='middle' fill='%239ca3af'%3EImage not available%3C/text%3E%3C/svg%3E";
                e.currentTarget.src = SAFE_PLACEHOLDER;
              }
            }}
            className={cn(
              "h-full w-full object-contain mix-blend-multiply transition-all duration-700 ease-out",
              isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95",
              isLoaded && "group-hover:scale-105"
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-[10px] text-neutral-400 font-serif italic">No image</span>
          </div>
        )}
      </div>

      {/* Content Block */}
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

/* ============================
   SKELETON
============================ */

function SkeletonCard() {
  return (
    <div className="flex flex-col">
      <div className="aspect-square w-full animate-pulse bg-neutral-100" />
      <div className="mt-6 h-3 w-20 animate-pulse rounded bg-neutral-100" />
      <div className="mt-3 h-5 w-3/4 animate-pulse rounded bg-neutral-100" />
      <div className="mt-4 h-4 w-24 animate-pulse rounded bg-neutral-100" />
    </div>
  )
}

const FILTER_KEYS = [
  'brand',
  'category',
  'gender',
  'caseMaterial',
  'caseSize',
  'dialColor',
  'movement',
  'waterResistance',
]

const FILTER_LABELS = {
  brand: 'Brand',
  category: 'Category',
  gender: 'Gender',
  caseMaterial: 'Case Material',
  caseSize: 'Case Size',
  dialColor: 'Dial Color',
  movement: 'Movement',
  waterResistance: 'Water Resistance',
}

const ALLOWED_PARAMS = ['page', ...FILTER_KEYS]

/** Derive distinct filter options (with counts) from a product list. */
function deriveFiltersFromProducts(products) {
  const out = {}
  FILTER_KEYS.forEach((key) => {
    const counts = {}
    products.forEach((p) => {
      const raw = p[key]
      const value = typeof raw === 'string' ? raw.trim() : ''
      if (value) counts[value] = (counts[value] || 0) + 1
    })
    out[key] = Object.entries(counts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value, undefined, { sensitivity: 'base' }))
  })
  return out
}

/** Parse comma-separated URL param into array of non-empty strings. */
function parseParam(param) {
  if (param == null || param === '') return []
  return param.split(',').map((s) => s.trim()).filter(Boolean)
}

/* ============================
   MAIN PAGE
============================ */

export default function AllProducts() {
  const [searchParams, setSearchParams] = useSearchParams()
  const pageParam = searchParams.get('page')
  const searchParam = searchParams.get('search')
  const brandCategoryParam = searchParams.get('brandCategory')
  const currentPage = Math.max(1, parseInt(pageParam, 10) || 1)

  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: LIMIT, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const sortByParam = searchParams.get('sortBy')
  const typeParam = searchParams.get('type')
  const [sortBy, setSortBy] = useState(typeParam === 'new' ? 'newest' : (sortByParam || 'alphabetically'))
  const [filtersData, setFiltersData] = useState({})
  const [brandMap, setBrandMap] = useState({}) // Mapping: Brand Name -> { slug, category }
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Sync sort state if URL changes externally
  useEffect(() => {
    const s = searchParams.get('sortBy')
    const t = searchParams.get('type')
    if (t === 'new') setSortBy('newest')
    else if (s) setSortBy(s)
  }, [searchParams])

  // Dynamic SEO meta tag updating
  useEffect(() => {
    const title = brandCategoryParam 
      ? `${brandCategoryParam} Brands Collection | Samay Watch` 
      : 'All Premium & Luxury Watches | Samay Watch';
    const description = `Explore our curated collection of the finest ${brandCategoryParam || 'luxury & premium'} watches. Discover timepieces that define precision, style and premium craftsmanship.`;
    const keywords = `luxury watches, ${brandCategoryParam ? brandCategoryParam + ' watches, ' : ''}buy watches online, authentic watches, premium timepieces, Samay Watch`;

    updatePageSEO({
      title,
      description,
      keywords,
      ogImage: 'https://i.ibb.co/2XHCWRL/samay-logo.png'
    });
  }, [brandCategoryParam]);

  // Fetch brand list once to build the mapping for URLs
  useEffect(() => {
    fetch(`${API_BASE}/api/store/brands`)
      .then(res => res.json())
      .then(json => {
        if (json?.success && Array.isArray(json.data)) {
          const mapping = {}
          json.data.forEach(b => { mapping[b.name] = { slug: b.slug, category: b.category } })
          setBrandMap(mapping)
        }
      })
      .catch(() => {})
  }, [])

  // Selected filters from URL (arrays)
  const selectedBrands = parseParam(searchParams.get('brand'))
  const selectedCategory = parseParam(searchParams.get('category'))
  const selectedCaseMaterial = parseParam(searchParams.get('caseMaterial'))
  const selectedCaseSize = parseParam(searchParams.get('caseSize'))
  const selectedDialColor = parseParam(searchParams.get('dialColor'))
  const selectedGender = parseParam(searchParams.get('gender'))
  const selectedMovement = parseParam(searchParams.get('movement'))
  const selectedWaterResistance = parseParam(searchParams.get('waterResistance'))

  const selectedByKey = {
    brand: selectedBrands,
    category: selectedCategory,
    caseMaterial: selectedCaseMaterial,
    caseSize: selectedCaseSize,
    dialColor: selectedDialColor,
    gender: selectedGender,
    movement: selectedMovement,
    waterResistance: selectedWaterResistance,
  }

  // Fetch filter options: try /filters first, else derive from a large product list
  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/api/store/products/filters`)
      .then((res) => {
        if (res.ok) return res.json()
        throw new Error('Not found')
      })
      .then((data) => {
        if (cancelled) return
        if (data?.success && data?.data && typeof data.data === 'object') {
          const normalized = {}
          FILTER_KEYS.forEach((k) => {
            const raw = data.data[k]
            if (Array.isArray(raw)) {
              normalized[k] = raw.map((x) =>
                typeof x === 'object' && x != null && 'value' in x
                  ? { value: String(x.value), count: x.count }
                  : { value: String(x), count: undefined }
              )
            } else {
              normalized[k] = []
            }
          })
          setFiltersData(normalized)
        }
      })
      .catch(() => {
        if (cancelled) return
        // Fallback: fetch many products and derive filter options
        fetch(`${API_BASE}/api/store/products?limit=500&page=1`)
          .then((r) => r.json())
          .then((d) => {
            if (cancelled) return
            if (d?.success && Array.isArray(d.data)) {
              setFiltersData(deriveFiltersFromProducts(d.data))
            }
          })
          .catch(() => { })
      })
    return () => { cancelled = true }
  }, [])

  const updateFilterParam = (filterKey, values) => {
    const next = new URLSearchParams(searchParams)
    if (values.length === 0) {
      next.delete(filterKey)
    } else {
      next.set(filterKey, values.join(','))
    }
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

  const totalSelected = FILTER_KEYS.reduce((acc, k) => acc + (selectedByKey[k]?.length || 0), 0)

  const handleClearAll = () => {
    const next = new URLSearchParams(searchParams)
    FILTER_KEYS.forEach(k => next.delete(k))
    next.set('page', '1')
    setSearchParams(next, { replace: false })
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    params.set('page', String(currentPage))
    params.set('limit', String(LIMIT))

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

    if (selectedBrands.length) params.set('brand', selectedBrands.join(','))
    if (selectedCategory.length) params.set('category', selectedCategory.join(','))
    if (selectedCaseMaterial.length) params.set('caseMaterial', selectedCaseMaterial.join(','))
    if (selectedCaseSize.length) params.set('caseSize', selectedCaseSize.join(','))
    if (selectedDialColor.length) params.set('dialColor', selectedDialColor.join(','))
    if (selectedGender.length) params.set('gender', selectedGender.join(','))
    if (selectedMovement.length) params.set('movement', selectedMovement.join(','))
    if (selectedWaterResistance.length) params.set('waterResistance', selectedWaterResistance.join(','))
    if (searchParam) params.set('search', searchParam)
    if (brandCategoryParam) params.set('brandCategory', brandCategoryParam)

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
    currentPage,
    sortBy,
    selectedBrands.join(','),
    selectedCategory.join(','),
    selectedCaseMaterial.join(','),
    selectedCaseSize.join(','),
    selectedDialColor.join(','),
    selectedGender.join(','),
    selectedMovement.join(','),
    selectedWaterResistance.join(','),
    searchParam || '',
    brandCategoryParam || '',
  ])

  const handlePageChange = (nextPage) => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(nextPage))
    setSearchParams(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
        onClearAll={handleClearAll}
        sortBy={sortBy}
        onSortChange={setSortBy}
        totalProducts={total}
      />

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-10 sm:pt-14 pb-24">

        {/* ─── Page Header ─── */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 border-b border-neutral-100 pb-8">
          <div>
            <h1 className="font-lato text-[28px] sm:text-[36px] font-black text-black leading-tight capitalize">
              {brandCategoryParam ? `${brandCategoryParam} Brands` : 'All Products'}
            </h1>
            <p className="mt-1 text-[10px] sm:text-[12px] uppercase tracking-[0.2em] text-neutral-400 font-bold">{total} timepieces</p>
          </div>

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
        {(totalSelected > 0 || searchParam) && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mr-1">Active:</span>
            
            {searchParam && (
              <button
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams)
                  next.delete('search')
                  next.set('page', '1')
                  setSearchParams(next)
                }}
                className="flex items-center gap-1.5 rounded-full bg-black px-3 py-1 text-[10px] font-bold text-white transition-opacity hover:opacity-80"
              >
                Search: {searchParam}
                <X className="size-3" />
              </button>
            )}

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
              onClick={handleClearAll}
              className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 underline underline-offset-2 hover:text-black ml-1"
            >
              Clear all
            </button>

            {brandCategoryParam && (
              <button
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams)
                  next.delete('brandCategory')
                  next.set('page', '1')
                  setSearchParams(next)
                }}
                className="flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1 text-[10px] font-bold text-gold transition-opacity hover:opacity-80"
              >
                Category: {brandCategoryParam}
                <X className="size-3" />
              </button>
            )}
          </div>
        )}

        {/* Products Section */}
        <div>

            {error && (
              <p className="mb-8 text-center text-sm text-red-600">{error}</p>
            )}

          {/* Grid */}
          {!loading && products.length === 0 ? (
            <div className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-200 bg-[#fbfbfb] px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 mb-6">
                <SlidersHorizontal className="size-8" />
              </div>
              <h2 className="font-lato text-[24px] font-black uppercase text-black">No matches found</h2>
              <p className="mt-2 max-w-sm text-[14px] font-medium text-neutral-500 leading-relaxed">
                We couldn't find any timepieces matching your current selection. Try clearing some filters or refining your search.
              </p>
              <button
                type="button"
                onClick={handleClearAll}
                className="mt-8 rounded-full bg-black px-10 py-3 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:bg-neutral-800 active:scale-95"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-x-10 sm:gap-y-24">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                : products.map((product) => (
                  <ProductCard key={product._id} product={product} brandMap={brandMap} />
                ))}
            </div>
          )}

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
    </div>
  )
}
