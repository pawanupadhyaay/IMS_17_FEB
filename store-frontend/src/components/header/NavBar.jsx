import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Menu, X, ChevronDown, Heart, ShoppingBag, User, ArrowRight, Instagram, Home, BookOpen, Info, Wrench, Mail, Clock } from 'lucide-react'
import { cn } from '../../utils/cn'
import { useAuth } from '../../contexts/AuthContext'
import { useWishlist } from '../../contexts/WishlistContext'
import { useCart } from '../../contexts/CartContext'
import { getBrandPath, getProductPath } from '../../utils/urlUtils'
import { lockBodyScroll, forceUnlockBodyScroll } from '../../utils/bodyScrollLock'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const WHATSAPP_NUMBER = '918595513656'
const INSTAGRAM_LINK = "https://www.instagram.com/samaywatch?igsh=MTBnNTlvZnQwaHlrdA%3D%3D"

function WhatsAppIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

const MENU_ITEMS = [
  { label: 'HOME', href: '/', icon: Home },
  { label: 'COLLECTIONS', href: '#', icon: ShoppingBag },
  { label: 'OUR PRESENCE', href: '/our-presence', icon: BookOpen },
  { label: 'ALL PRODUCTS', href: '/all-products', icon: Clock },
  { label: 'ABOUT US', href: '/about-us', icon: Info },
  { label: 'REPAIR & SERVICE', href: '/repair-service', icon: Wrench },
  { label: 'CONTACT', href: '/contact', icon: Mail },
]

const linkClass = cn(
  'relative py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-neutral-700 transition-colors duration-200',
  'hover:text-gold',
  'after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-gold after:transition-transform after:duration-300 after:content-[""]',
  'hover:after:scale-x-100'
)

function NavLink({ label, href = '#' }) {
  const isInternal = href.startsWith('/')
  if (isInternal) {
    return <Link to={href} className={linkClass}>{label}</Link>
  }
  return <a href={href} className={linkClass}>{label}</a>
}

export default function NavBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, openAuthModal } = useAuth()
  const { wishlistItems } = useWishlist()
  const { cartItems, toggleCart } = useCart()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collectionsOpen, setCollectionsOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [brands, setBrands] = useState([])

  // Mobile accordion states
  const [mobileCollectionsOpen, setMobileCollectionsOpen] = useState(false)
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState({})
  const [isDesktopViewport, setIsDesktopViewport] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  )

  // Helper to toggle mobile category accordions
  const toggleMobileCategory = (category) => {
    setMobileCategoryOpen(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const groupedBrands = useMemo(() => {
    // Initial A-Z sort for all brands
    const sortedBrands = [...brands].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    const grouped = sortedBrands.reduce((acc, brand) => {
      const cat = brand.category?.toLowerCase().trim() || 'fashion'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(brand)
      return acc
    }, {})

    // Apply custom order for Luxury Brands
    if (grouped.luxury) {
      const luxuryOrder = ['Longines', 'Rado', 'Tissot', 'Balmain', 'Seiko', 'Citizen'];
      grouped.luxury.sort((a, b) => {
        const indexA = luxuryOrder.indexOf(a.name);
        const indexB = luxuryOrder.indexOf(b.name);
        
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
    }

    return grouped;
  }, [brands])

  // Fetch brands dynamically when menus open to ensure real-time sync with IMS
  useEffect(() => {
    if (collectionsOpen || mobileCollectionsOpen || brands.length === 0) {
      fetch(`${API_BASE}/api/store/brands?hasProducts=true&_=${Date.now()}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) {
            setBrands(data.data)
          }
        })
        .catch(() => {})
    }
  }, [collectionsOpen, mobileCollectionsOpen])

  // Live Suggestions with Debouncing
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_BASE}/api/store/products/search/suggestions?q=${encodeURIComponent(searchQuery)}`);
        const json = await res.json();
        if (json.success) {
          setSuggestions(json.data);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350); // 350ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keep collections open while scrolling; close only when dropdown leaves viewport
  useEffect(() => {
    const navEl = document.querySelector('nav')
    if (!navEl) return
    const observer = new IntersectionObserver(
      ([e]) => { if (!e.isIntersecting) setCollectionsOpen(false) },
      { threshold: 0, rootMargin: '-10px 0px 0px 0px' }
    )
    observer.observe(navEl)
    return () => observer.disconnect()
  }, [])

  const categoryTitles = {
    luxury: 'Luxury Brands',
    fashion: 'Fashion Brands',
    watchmaker: 'Watchmaker Brands',
  }

  const formatCategoryTitle = (cat) => {
    if (categoryTitles[cat]) return categoryTitles[cat];
    return cat.charAt(0).toUpperCase() + cat.slice(1) + ' Collections';
  }

  const MOBILE_CATEGORY_ORDER = ['luxury', 'fashion', 'watchmaker']

  // Close mobile menu when switching to desktop (DevTools / resize) — prevents scroll freeze
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const syncViewport = () => {
      const desktop = mq.matches
      setIsDesktopViewport(desktop)
      if (desktop) {
        setMobileOpen(false)
        setMobileCollectionsOpen(false)
        forceUnlockBodyScroll()
      }
    }
    syncViewport()
    mq.addEventListener('change', syncViewport)
    window.addEventListener('resize', syncViewport)
    return () => {
      mq.removeEventListener('change', syncViewport)
      window.removeEventListener('resize', syncViewport)
    }
  }, [])

  // Close overlays and restore scroll on route change
  useEffect(() => {
    setMobileOpen(false)
    setIsSearchOpen(false)
    setMobileCollectionsOpen(false)
    setCollectionsOpen(false)
    forceUnlockBodyScroll()
  }, [location.pathname])

  // Lock body scroll when mobile menu or search is open (mobile menu only on small screens)
  useEffect(() => {
    const shouldLock = isSearchOpen || (mobileOpen && !isDesktopViewport)
    if (!shouldLock) return undefined
    return lockBodyScroll()
  }, [mobileOpen, isSearchOpen, isDesktopViewport])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    navigate(`/all-products?search=${encodeURIComponent(searchQuery.trim())}`)
    setIsSearchOpen(false)
    setSearchQuery('')
  }

  return (
    <>
      <nav className="relative w-full bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between border-b border-neutral-200/80 px-4 md:px-8">
          {/* Desktop: Menu items */}
          <div className="hidden md:flex md:items-center md:gap-8">
            {MENU_ITEMS.map((item) => {
              if (item.label === 'COLLECTIONS') {
                return (
                  <div
                    key={item.label}
                    className="static"
                    onMouseEnter={() => setCollectionsOpen(true)}
                    onMouseLeave={() => setCollectionsOpen(false)}
                  >
                    <a href={item.href} className={linkClass}>
                      {item.label}
                    </a>
                    {/* Desktop Mega Menu */}
                    <AnimatePresence>
                      {collectionsOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="absolute left-0 right-0 top-full z-50 w-full pt-0"
                        >
                          <div className="border-t border-neutral-200 bg-white shadow-[0_16px_48px_rgba(0,0,0,0.08)]">
                            <div className="mx-auto flex max-w-7xl min-h-[380px] overflow-x-auto scrollbar-hide">
                              {/* Brand Columns Section */}
                              <div className="flex flex-1 divide-x divide-neutral-100">
                                {Object.entries(groupedBrands).map(([catKey, catBrands], catIdx) => (
                                  <motion.div 
                                    key={catKey} 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.4, delay: catIdx * 0.1 }}
                                    className="min-w-[240px] py-10 pl-10 pr-8"
                                  >
                                    <h3 className="mb-6 text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">
                                      {formatCategoryTitle(catKey)}
                                    </h3>
                                    <ul className={cn("space-y-1", catBrands.length > 8 && "max-h-[260px] overflow-y-auto pr-2 custom-scrollbar")}>
                                      {catBrands.map((brand, bIdx) => (
                                        <motion.li 
                                          key={brand.slug}
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          transition={{ duration: 0.3, delay: (catIdx * 0.1) + (bIdx * 0.03) }}
                                        >
                                          <Link
                                            to={getBrandPath(brand)}
                                            onClick={() => setCollectionsOpen(false)}
                                            className="group flex items-center py-2 text-[14px] font-medium text-neutral-600 transition-all hover:text-black"
                                          >
                                            <span className="relative">
                                              {brand.name}
                                              <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-gold transition-all duration-300 group-hover:w-full"></span>
                                            </span>
                                          </Link>
                                        </motion.li>
                                      ))}
                                    </ul>
                                  </motion.div>
                                ))}

                                {brands.length === 0 && (
                                  <div className="flex items-center justify-center w-full py-10 text-[13px] text-neutral-400 italic">
                                    No collections available...
                                  </div>
                                )}
                              </div>

                              {/* Featured Promotional Banner — High End Editorial Style */}
                              <div className="relative w-[380px] shrink-0 overflow-hidden group/banner">
                                <img 
                                  src="https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/hydroconquest-l3-781-3-78-9-detailed-view-1333x2000-2-073d4a_ccml7u.jpg"
                                  alt="Featured Collection"
                                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover/banner:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                                <div className="absolute inset-0 p-10 flex flex-col justify-end text-white">
                                  <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: 0.3 }}
                                    className="space-y-4"
                                  >
                                    <span className="inline-block border border-white/40 px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em] backdrop-blur-md">
                                      Spring / Summer 2026
                                    </span>
                                    <h4 className="font-serif text-[32px] font-bold leading-tight text-white">
                                      The Heritage<br />Collection
                                    </h4>
                                    <p className="text-[13px] text-white/70 leading-relaxed font-medium">
                                      Discover timepieces that define generations. Hand-selected for the modern connoisseur.
                                    </p>
                                    <Link
                                      to="/all-products"
                                      onClick={() => setCollectionsOpen(false)}
                                      className="group/btn relative mt-6 inline-flex h-12 w-full items-center justify-center overflow-hidden bg-white px-8 text-[11px] font-black uppercase tracking-[0.2em] text-black transition-all hover:bg-gold hover:text-white"
                                    >
                                      <span className="relative z-10">Explore All Brands</span>
                                    </Link>
                                  </motion.div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              }
              return <NavLink key={item.label} label={item.label} href={item.href} />
            })}
          </div>

          {/* Mobile: Hamburger + Icons */}
          <div className="flex flex-1 items-center justify-between gap-2 md:hidden">
            <motion.button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="flex items-center p-2 text-neutral-700"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              whileTap={{ scale: 0.95 }}
            >
              {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </motion.button>

            <div className="flex items-center gap-1">
              <motion.button 
                onClick={() => setIsSearchOpen(true)}
                className="p-2 text-neutral-600" 
                whileTap={{ scale: 0.9 }}
              >
                <Search className="size-5" />
              </motion.button>
              <Link to="/wishlist" className="relative p-2 text-neutral-600">
                <Heart className="size-5" />
                {wishlistItems.length > 0 && (
                  <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                    {wishlistItems.length}
                  </span>
                )}
              </Link>
               <motion.button 
                onClick={toggleCart} 
                className="relative p-2 text-neutral-600" 
                whileTap={{ scale: 0.9 }}
              >
                <ShoppingBag className="size-5" />
                {cartItems.length > 0 && (
                  <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[8px] font-bold text-white shadow-sm ring-2 ring-white">
                    {cartItems.length}
                  </span>
                )}
              </motion.button>
              {user ? (
                <Link to="/account" className="p-2 text-neutral-600">
                  <User className="size-5 text-gold" />
                </Link>
              ) : (
                <button onClick={openAuthModal} className="p-2 text-neutral-600">
                  <User className="size-5" />
                </button>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <motion.button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center p-2 text-neutral-600 transition-colors duration-200 hover:text-gold"
              aria-label="Search"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
            >
              <Search className="size-5" strokeWidth={2} />
            </motion.button>
            <Link 
              to="/wishlist" 
              className="relative flex items-center p-2 text-neutral-600 transition-colors duration-200 hover:text-gold"
              aria-label="Wishlist"
            >
              <Heart className="size-5" strokeWidth={2} />
              {wishlistItems.length > 0 && (
                <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                  {wishlistItems.length}
                </span>
              )}
            </Link>
            <motion.button
              onClick={toggleCart}
              className="relative flex items-center p-2 text-neutral-600 transition-colors duration-200 hover:text-gold"
              aria-label="Cart"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
            >
              <ShoppingBag className="size-5" strokeWidth={2} />
              {cartItems.length > 0 && (
                <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                  {cartItems.length}
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </nav>

      {/* --- PREMIUM SEARCH OVERLAY --- */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-white/98 backdrop-blur-2xl overflow-y-auto scrollbar-hide"
          >
            <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 min-h-screen flex flex-col relative z-10">
              
              {/* Overlay Header */}
              <div className="flex items-center justify-between pb-6 border-b border-neutral-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Search Samay Boutique</span>
                  <p className="text-[11px] text-neutral-400">Products, Brands, or Model Numbers</p>
                </div>
                
                <button 
                   onClick={() => setIsSearchOpen(false)}
                   className="flex items-center gap-2 rounded-full border border-neutral-100 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-black hover:bg-neutral-50 transition-all"
                >
                  <X className="size-4" /> Close
                </button>
              </div>

              {/* Clean Search Input Section */}
              <div className="mt-8 sm:mt-12">
                <form onSubmit={handleSearchSubmit} className="relative max-w-4xl mx-auto">
                  <div className="relative">
                    <Search className="absolute left-0 top-1/2 -translate-y-1/2 size-5 sm:size-6 text-neutral-300" />
                    <input
                      autoFocus
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Enter brand or timepiece name..."
                      className="w-full bg-transparent border-b border-neutral-200 pl-8 sm:pl-10 pb-4 text-lg sm:text-2xl font-medium uppercase tracking-wider text-black placeholder:text-neutral-300 focus:border-black focus:outline-none transition-colors"
                    />
                  </div>
                </form>
              </div>

              <div className="mt-16 sm:mt-24">
                {/* Suggestions Section */}
                <AnimatePresence mode="wait">
                  {searchQuery.trim().length >= 2 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.5 }}
                    >
                      {/* Suggested Categories */}
                      {suggestions?.suggestions?.length > 0 && (
                        <div className="mb-16">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-300 mb-8 flex items-center gap-4">
                            Matching Collections <span className="h-px flex-1 bg-neutral-50"></span>
                          </p>
                          <div className="flex flex-wrap justify-center gap-4">
                            {suggestions.suggestions.map((suggestion, idx) => (
                              <Link
                                key={idx}
                                to={suggestion.path}
                                onClick={() => setIsSearchOpen(false)}
                                className="group relative overflow-hidden rounded-xl border border-neutral-100 bg-white px-8 py-4 text-[12px] font-black uppercase tracking-widest text-black transition-all hover:border-gold hover:text-gold hover:shadow-xl hover:-translate-y-1"
                              >
                                <span className="relative z-10 flex items-center gap-3">
                                  {suggestion.label}
                                  <ArrowRight className="size-3.5 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Product Results */}
                      {suggestions?.products?.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-10">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-300 flex items-center gap-4 flex-1">
                              Timepiece Matches <span className="h-px flex-1 bg-neutral-50"></span>
                            </p>
                            <Link 
                               to={`/all-products?search=${searchQuery}`} 
                               onClick={() => setIsSearchOpen(false)}
                               className="text-[10px] font-black uppercase tracking-widest text-gold hover:underline underline-offset-8"
                            >
                              View All ({suggestions.products.length}+)
                            </Link>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {suggestions.products.map((product) => (
                              <Link 
                                key={product._id}
                                to={getProductPath(product)}
                                onClick={() => setIsSearchOpen(false)}
                                className="group flex items-center gap-6 rounded-3xl bg-neutral-50/50 p-5 border border-transparent transition-all hover:bg-white hover:border-neutral-100 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)]"
                              >
                                <div className="h-24 w-24 shrink-0 bg-white rounded-2xl flex items-center justify-center p-4 shadow-sm group-hover:shadow-indigo-50/20 transition-all">
                                  <img 
                                    src={product.images?.[0] || product.image?.url} 
                                    alt={product.title} 
                                    className="h-full w-full object-contain mix-blend-multiply transition-all duration-700 group-hover:scale-110" 
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="mb-1.5 flex items-center gap-2">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gold">{product.brand}</span>
                                    <div className="h-0.5 w-4 bg-gold/20"></div>
                                  </div>
                                  <h4 className="text-[15px] font-bold text-neutral-900 truncate tracking-tight group-hover:text-gold transition-colors">
                                    {product.title}
                                  </h4>
                                  <div className="mt-3 flex items-center gap-3">
                                    <span className="text-[14px] font-black text-black">₹{Number(product.price).toLocaleString('en-IN')}</span>
                                    {product.oldPrice && Number(product.oldPrice) > Number(product.price) && (
                                       <span className="text-[11px] text-neutral-300 font-medium line-through decoration-red-100">₹{Number(product.oldPrice).toLocaleString('en-IN')}</span>
                                    )}
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No Results Fallback */}
                      {(!suggestions?.products?.length && !suggestions?.suggestions?.length && !isSearching) && (
                         <div className="py-24 text-center">
                            <div className="inline-block p-6 rounded-full bg-neutral-50 mb-8">
                               <Search className="size-10 text-neutral-200" strokeWidth={1} />
                            </div>
                            <h3 className="text-xl font-serif text-black italic">"We couldn't find a direct match..."</h3>
                            <p className="mt-4 text-[11px] font-black uppercase tracking-[0.25em] text-neutral-400">Discover excellence through our curated collections instead.</p>
                         </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {(!searchQuery || searchQuery.trim().length < 2) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-12"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-6">Trending Searches</p>
                    <div className="flex flex-wrap gap-4">
                      {['Rolex', 'Tissot', 'Rado', 'Seiko', 'Men', 'Heritage'].map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            setSearchQuery(tag)
                            navigate(`/all-products?search=${tag}`)
                            setIsSearchOpen(false)
                            setSearchQuery('')
                          }}
                          className="px-4 py-2 rounded-full bg-neutral-50 text-[12px] font-bold text-neutral-600 hover:bg-black hover:text-white transition-all border border-neutral-100"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Static Protection Badge */}
              <div className="mt-auto py-10 flex items-center justify-center gap-3 opacity-30">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-400">Secured Samay Discovery</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile menu — Industry Standard Premium Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[190] bg-black/60 backdrop-blur-sm md:hidden"
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-[200] flex w-[85%] max-w-[380px] flex-col bg-white shadow-2xl md:hidden"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-5">
                <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center">
                   <img 
                      src="https://res.cloudinary.com/dnrbahpzc/image/upload/v1777546626/samay-logo-removebg-preview_u9zwef.png" 
                      alt="Samay Watch" 
                      className="h-8 sm:h-10 w-auto object-contain"
                   />
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-100 transition-colors hover:border-black"
                >
                  <X className="size-5 text-black" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto px-6 py-8">
                <div className="mb-8">
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400 mb-6">Navigation</p>
                   <nav className="flex flex-col gap-2">
                     {MENU_ITEMS.map((item, idx) => {
                       const isCollections = item.label === 'COLLECTIONS';
                       const Icon = item.icon;
                       return (
                         <motion.div
                           key={item.label}
                           initial={{ opacity: 0, x: -10 }}
                           animate={{ opacity: 1, x: 0 }}
                           transition={{ delay: 0.1 + idx * 0.05 }}
                         >
                           {isCollections ? (
                             <div className="flex flex-col">
                               <button
                                 type="button"
                                 onClick={() => setMobileCollectionsOpen(!mobileCollectionsOpen)}
                                 className={cn(
                                   "flex w-full items-center justify-between py-3.5 transition-all text-left group",
                                   mobileCollectionsOpen ? "text-gold" : "text-neutral-600"
                                 )}
                               >
                                 <div className="flex items-center gap-4">
                                   <div className={cn(
                                     "flex size-9 items-center justify-center rounded-xl transition-all",
                                     mobileCollectionsOpen ? "bg-gold/10 text-gold" : "bg-neutral-50 text-neutral-400 group-hover:bg-neutral-100"
                                   )}>
                                     {Icon && <Icon className="size-4.5" strokeWidth={2.5} />}
                                   </div>
                                   <span className="text-[14px] font-black uppercase tracking-[0.2em]">
                                     {item.label}
                                   </span>
                                 </div>
                                 <ChevronDown className={cn('size-4 transition-transform duration-300', mobileCollectionsOpen && 'rotate-180')} />
                               </button>
                               
                               <AnimatePresence>
                                 {mobileCollectionsOpen && (
                                   <motion.div
                                     initial={{ height: 0, opacity: 0 }}
                                     animate={{ height: 'auto', opacity: 1 }}
                                     exit={{ height: 0, opacity: 0 }}
                                     className="overflow-hidden"
                                   >
                                     <div className="ml-[52px] space-y-1 border-l border-neutral-100 py-2 pl-4">
                                       {Object.entries(groupedBrands)
                                         .sort(([a], [b]) => {
                                           const orderA = MOBILE_CATEGORY_ORDER.indexOf(a)
                                           const orderB = MOBILE_CATEGORY_ORDER.indexOf(b)
                                           if (orderA === -1 && orderB === -1) return a.localeCompare(b)
                                           if (orderA === -1) return 1
                                           if (orderB === -1) return -1
                                           return orderA - orderB
                                         })
                                         .map(([catKey, catBrands]) => (
                                         <div key={catKey} className="border-b border-neutral-50 py-1 last:border-0">
                                           <button
                                             type="button"
                                             onClick={() => toggleMobileCategory(catKey)}
                                             className="flex w-full items-center gap-3 py-2.5 text-left"
                                           >
                                             <span className="min-w-0 flex-1 text-[11px] font-black uppercase leading-snug tracking-[0.14em] text-neutral-500">
                                               {formatCategoryTitle(catKey)}
                                             </span>
                                             <ChevronDown className={cn('size-3.5 shrink-0 text-neutral-400 transition-transform duration-200', mobileCategoryOpen[catKey] && 'rotate-180')} />
                                           </button>
                                           <AnimatePresence>
                                             {mobileCategoryOpen[catKey] && (
                                               <motion.div
                                                 initial={{ height: 0, opacity: 0 }}
                                                 animate={{ height: 'auto', opacity: 1 }}
                                                 exit={{ height: 0, opacity: 0 }}
                                                 className="overflow-hidden pl-1"
                                               >
                                                 <div className="space-y-1 border-l-2 border-gold/20 py-2 pl-4">
                                                   {catBrands.map((brand) => (
                                                     <Link
                                                       key={brand.slug}
                                                       to={getBrandPath(brand)}
                                                       onClick={() => setMobileOpen(false)}
                                                       className="block py-1.5 text-[14px] font-medium text-neutral-500 transition-colors hover:text-black"
                                                     >
                                                       {brand.name}
                                                     </Link>
                                                   ))}
                                                 </div>
                                               </motion.div>
                                             )}
                                           </AnimatePresence>
                                         </div>
                                       ))}
                                     </div>
                                   </motion.div>
                                 )}
                               </AnimatePresence>
                             </div>
                           ) : (
                             <Link
                               to={item.href}
                               onClick={() => setMobileOpen(false)}
                               className="flex w-full items-center gap-4 py-3.5 group"
                             >
                               <div className="flex size-9 items-center justify-center rounded-xl bg-neutral-50 text-neutral-400 group-hover:bg-neutral-100 group-hover:text-black transition-all">
                                 {Icon && <Icon className="size-4.5" strokeWidth={2.5} />}
                               </div>
                               <span className="text-[14px] font-black uppercase tracking-[0.2em] text-neutral-600 group-hover:text-black">
                                 {item.label}
                               </span>
                             </Link>
                           )}
                         </motion.div>
                       );
                     })}
                   </nav>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="border-t border-neutral-100 bg-neutral-50 px-6 py-8">
                <div className="space-y-6">
                  {/* Account Action */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-neutral-200/50">
                       <User className="size-5 text-black" />
                    </div>
                    <div>
                      {user ? (
                        <>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Welcome back</p>
                          <Link to="/account" onClick={() => setMobileOpen(false)} className="text-[13px] font-black uppercase tracking-widest text-black underline underline-offset-4">My Account</Link>
                        </>
                      ) : (
                        <>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Personalize experience</p>
                          <button onClick={() => { setMobileOpen(false); openAuthModal(); }} className="text-[13px] font-black uppercase tracking-widest text-black underline underline-offset-4">Sign In / Register</button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Connect */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <a href={`tel:+${WHATSAPP_NUMBER}`} className="flex flex-col gap-1.5 rounded-xl bg-white p-4 shadow-sm transition-transform active:scale-95 border border-neutral-100">
                       <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Call Us</span>
                       <span className="text-[12px] font-bold text-black font-poppins">Expert Help</span>
                    </a>
                    <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-1.5 rounded-xl bg-black p-4 shadow-sm transition-transform active:scale-95">
                       <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400/60">WhatsApp</span>
                       <span className="text-[12px] font-bold text-white font-poppins">Connect Now</span>
                    </a>
                  </div>

                  {/* Socials */}
                  <div className="flex items-center justify-center gap-6 pt-4 border-t border-neutral-100/50 mt-4">
                     <a 
                      href={INSTAGRAM_LINK} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-neutral-200/50 text-neutral-400 hover:text-black transition-colors"
                      aria-label="Instagram"
                     >
                        <Instagram className="size-5" />
                     </a>
                     <a 
                      href={`https://wa.me/${WHATSAPP_NUMBER}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-neutral-200/50 text-neutral-400 hover:text-green-500 transition-colors"
                      aria-label="WhatsApp"
                     >
                        <WhatsAppIcon className="size-5" />
                     </a>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
