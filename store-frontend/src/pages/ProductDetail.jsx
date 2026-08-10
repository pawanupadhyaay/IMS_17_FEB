import axios from "axios";
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Heart, Share2, X, Trash2, ShieldCheck, Truck, MessageCircle, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import ProductImageGallery from '../components/product/ProductImageGallery'
import { getSquareImage } from '../utils/cloudinary'
import { cn } from '../utils/cn'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import CheckoutModal from '../components/checkout/CheckoutModal'
import { useWishlist } from '../contexts/WishlistContext'
import { useCart } from "../contexts/CartContext";
import { useAuth } from '../contexts/AuthContext';
import { getProductPath, getBrandPath } from '../utils/urlUtils'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const CART_KEY = 'ims_store_cart'

function formatPrice(value) {
  if (value == null || value === '') return ''
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return `₹${num.toLocaleString('en-IN')}`
}

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

async function fetchProductBySlug(slug) {
  const encoded = encodeURIComponent(slug)
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(slug)
  const urls = []

  if (isObjectId) {
    urls.push(`${API_BASE}/api/store/products/${encoded}`)
  }

  urls.push(`${API_BASE}/api/store/products/slug/${encoded}`)
  urls.push(`${API_BASE}/api/store/products?slug=${encoded}&limit=1&page=1`)

  for (const url of urls) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const json = await res.json()
      if (!json?.success) continue

      if (json.data && !Array.isArray(json.data) && typeof json.data === 'object') {
        return json.data
      }

      if (Array.isArray(json.data) && json.data.length > 0) {
        const exact = json.data.find((p) => p?.slug === slug)
        return exact || json.data[0]
      }
    } catch {
      // Try next endpoint fallback
    }
  }

  return null
}

function RecommendedCard({ product, brandMap = {} }) {
  const { toggleWishlist, isInWishlist } = useWishlist()
  const [isLoaded, setIsLoaded] = useState(false)
  const productKey = product?.slug || product?._id
  if (!productKey) return null

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
        "flex aspect-square items-center justify-center bg-transparent p-6 sm:p-8 overflow-hidden transition-colors",
        !isLoaded && "animate-pulse"
      )}>
        <img
          src={getSquareImage(
            (() => {
              const img = product.images?.[0] || product.image?.url;
              return typeof img === 'string' ? img : img?.url;
            })(),
            400
          )}
          alt={product.title || ''}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          className={cn(
            "h-full w-full object-contain mix-blend-multiply transition-all duration-700 ease-out",
            isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95",
            isLoaded && "group-hover:scale-[1.03]"
          )}
          onError={(e) => {
            setIsLoaded(true);
            const currentSrc = e.currentTarget.src;
            const rawImage = product.images?.[0] || product.image?.url;
            const imageUrl = typeof rawImage === 'string' ? rawImage : rawImage?.url;
            if (currentSrc.includes('res.cloudinary.com') && imageUrl) {
              e.currentTarget.src = imageUrl;
            } else if (imageUrl && currentSrc === imageUrl) {
              const SAFE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800' viewBox='0 0 800 800'%3E%3Crect width='800' height='800' fill='%23f3f4f6'/%3E%3Cpath d='M400 300a50 50 0 1 0 0 100 50 50 0 0 0 0-100zm-150 200h300l-75-100-75 100-50-60-100 60z' fill='%239ca3af'/%3E%3Ctext x='400' y='550' font-family='sans-serif' font-size='18' text-anchor='middle' fill='%239ca3af'%3EImage not available%3C/text%3E%3C/svg%3E";
              e.currentTarget.src = SAFE_PLACEHOLDER;
            }
          }}
        />
      </div>
      <div className="mt-5 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold transition-colors">
          {product.brand || '—'}
        </p>
        <h3 className="mt-2 min-h-[48px] font-poppins text-[16px] font-medium leading-snug text-neutral-900 line-clamp-2 group-hover:text-gold transition-colors duration-300 tracking-tight">
          {product.title || '—'}
        </h3>
        <p className="mt-2 text-neutral-800 font-poppins font-medium">{formatPrice(product.price)}</p>
      </div>
    </Link>
  )
}

function ProductSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="h-4 w-48 animate-pulse rounded bg-neutral-100" />
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="aspect-square animate-pulse bg-neutral-100" />
        <div className="space-y-4">
          <div className="h-4 w-24 animate-pulse rounded bg-neutral-100" />
          <div className="h-8 w-2/3 animate-pulse rounded bg-neutral-100" />
          <div className="h-5 w-32 animate-pulse rounded bg-neutral-100" />
          <div className="h-24 w-full animate-pulse rounded bg-neutral-100" />
        </div>
      </div>
    </div>
  )
}

export default function ProductDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [recommended, setRecommended] = useState([])
  const [showStickyBar, setShowStickyBar] = useState(false)
  const [flyingImage, setFlyingImage] = useState(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [submittingSub, setSubmittingSub] = useState(false)

  const [openSpecs, setOpenSpecs] = useState(true)
  const [openAccordion, setOpenAccordion] = useState('description')
  const [openFaq, setOpenFaq] = useState(null)
  const [brandMap, setBrandMap] = useState({})

  const { toggleWishlist } = useWishlist()
  const { addToCart: globalAddToCart, initiateCheckout: globalInitiateCheckout } = useCart()
  const { user, openAuthModal } = useAuth()

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setSubmittingSub(true);
    try {
      const emailInput = document.getElementById('notify-email')?.value;
      const payload = { productId: product._id };
      if (!user) {
        if (!emailInput || !emailInput.includes('@')) {
          toast.error("Please enter a valid email address.");
          setSubmittingSub(false);
          return;
        }
        payload.email = emailInput.trim();
      }

      const headers = {};
      const token = localStorage.getItem("storeToken");
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await axios.post(`${API_BASE}/api/notifications/subscribe`, payload, { headers });
      if (res.data?.success) {
        setIsSubscribed(true);
        toast.success("We'll notify you as soon as this item is back in stock!", {
          id: 'notify-toast'
        });
      } else {
        toast.error(res.data?.message || "Failed to subscribe");
      }
    } catch (err) {
      console.error("Subscription error:", err);
      toast.error(err.response?.data?.message || "Failed to subscribe");
    } finally {
      setSubmittingSub(false);
    }
  };

  const toggleAccordion = (id) => setOpenAccordion(openAccordion === id ? null : id)
  const toggleFaq = (idx) => setOpenFaq(openFaq === idx ? null : idx)

  // Brands that showing Inquiry button instead of Buy Now/Add to Cart
  const INQUIRY_ONLY_BRANDS = ['RADO', 'TISSOT', 'LONGINES', 'SEIKO']
  const isInquiryOnlyBrand = INQUIRY_ONLY_BRANDS.includes(product?.brand?.trim().toUpperCase())

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
      .catch(() => { })
  }, [])

  useEffect(() => {
    const handleScroll = () => setShowStickyBar(window.scrollY > 800)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function run() {
      setIsSubscribed(false)
      setLoading(true)
      setError('')
      const data = await fetchProductBySlug(slug)
      if (cancelled) return
      if (!data) {
        setProduct(null)
        setError('Product not found')
      } else {
        setProduct(data)
      }
      setLoading(false)
    }

    run()
    return () => { cancelled = true }
  }, [slug])

  useEffect(() => {
    if (product) {
      // 1. Dynamic Page Title Tag
      document.title = product.seoTitle || product.title || 'Samay Watch';

      // Helper function to update/create meta tag
      const updateMetaTag = (attrName, attrVal, content) => {
        if (!content) return;
        let el = document.querySelector(`meta[${attrName}="${attrVal}"]`);
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute(attrName, attrVal);
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
      };

      // 2. Dynamic Page Meta Description
      const descriptionText = product.seoDescription || product.description || 'Discover our premium watch collection. Hand-crafted precision engineered timepieces.';
      updateMetaTag('name', 'description', descriptionText.slice(0, 160));

      // 3. Dynamic Page Meta Keywords
      const keywordsText = product.seoKeywords || `${product.brand || 'luxury'}, watch, timepieces, premium watches`;
      updateMetaTag('name', 'keywords', keywordsText);

      // 4. Robots Tag
      updateMetaTag('name', 'robots', 'index, follow');

      // 5. Dynamic OpenGraph Social Sharing Metadata
      updateMetaTag('property', 'og:title', product.seoTitle || product.title || 'Samay Watch');
      updateMetaTag('property', 'og:description', (product.seoDescription || product.description || 'Discover our premium watch collection.').slice(0, 160));
      updateMetaTag('property', 'og:type', 'og:product');
      updateMetaTag('property', 'og:url', window.location.href);

      const imageSource = product.seoImage || product.images?.[0] || 'https://i.ibb.co/2XHCWRL/samay-logo.png';
      updateMetaTag('property', 'og:image', imageSource);

      // 6. Dynamic OpenGraph Product Properties
      updateMetaTag('property', 'product:price:amount', String(product.price || 0));
      updateMetaTag('property', 'product:price:currency', 'INR');
      updateMetaTag('property', 'product:availability', (product.inventory ?? 0) > 0 ? 'instock' : 'oos');

      // 7. Twitter Card Metadata
      updateMetaTag('name', 'twitter:card', 'summary_large_image');
      updateMetaTag('name', 'twitter:title', product.seoTitle || product.title || 'Samay Watch');
      updateMetaTag('name', 'twitter:description', (product.seoDescription || product.description || 'Discover our premium watch collection.').slice(0, 160));
      updateMetaTag('name', 'twitter:image', imageSource);

      // 8. Canonical Link Tag
      let canonicalLink = document.querySelector('link[rel="canonical"]');
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', window.location.href);

      // 9. JSON-LD Google Product Schema (Structured Data)
      let jsonLdScript = document.getElementById('jsonld-product-schema');
      if (!jsonLdScript) {
        jsonLdScript = document.createElement('script');
        jsonLdScript.setAttribute('id', 'jsonld-product-schema');
        jsonLdScript.setAttribute('type', 'application/ld+json');
        document.head.appendChild(jsonLdScript);
      }

      const schemaData = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.title || 'Luxury Watch',
        "image": imageSource,
        "description": product.seoDescription || product.description || '',
        "sku": product.sku || '',
        "mpn": product.sku || '',
        "brand": {
          "@type": "Brand",
          "name": product.brand || 'Luxury Watch Brand'
        },
        "offers": {
          "@type": "Offer",
          "url": window.location.href,
          "priceCurrency": "INR",
          "price": product.price || 0,
          "priceValidUntil": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
          "itemCondition": "https://schema.org/NewCondition",
          "availability": (product.inventory ?? 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
        }
      };
      jsonLdScript.textContent = JSON.stringify(schemaData);

      // Cleanup function to remove structured data and dynamic tags
      return () => {
        const el = document.getElementById('jsonld-product-schema');
        if (el) {
          el.remove();
        }
      };
    }
  }, [product])

  useEffect(() => {
    if (!product?._id) return
    let cancelled = false

    fetch(`${API_BASE}/api/store/products?limit=4`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        if (json?.success && Array.isArray(json.data)) {
          setRecommended(json.data.filter((p) => p?._id !== product._id).slice(0, 4))
        }
      })
      .catch(() => {
        if (!cancelled) setRecommended([])
      })

    return () => { cancelled = true }
  }, [product?._id])

  const specificationFields = useMemo(() => ([
    { label: 'Case Material', value: product?.caseMaterial },
    { label: 'Dial Color', value: product?.dialColor },
    { label: 'Water Resistance', value: product?.waterResistance },
    { label: 'Warranty Period', value: product?.warrantyPeriod },
    { label: 'Movement', value: product?.movement },
    { label: 'Gender', value: product?.gender },
    { label: 'Strap Color', value: product?.strapColor },
    { label: 'Strap Material', value: product?.strapMaterial },
    { label: 'Case Shape', value: product?.caseShape },
    { label: 'Case Size', value: product?.caseSize },
  ]), [product])

  const addToCart = (e) => {
    if (!product) return

    if (e && e.target) {
      const rect = e.target.closest('button')?.getBoundingClientRect()
      if (rect) {
        setFlyingImage({
          x: rect.left + rect.width / 2 - 40,
          y: rect.top + rect.height / 2 - 40,
          src: getSquareImage(product.images?.[0] || product.image?.url)
        })
        setTimeout(() => setFlyingImage(null), 800)
      }
    }

    globalAddToCart(product)
  }

  const initiateCheckout = (isBuyNow) => {
    globalInitiateCheckout(isBuyNow, product)
  }

  const handleWhatsAppShare = () => {
    if (!product) return;
    const phone = "918595513656";
    const productUrl = window.location.href;
    const message = `Hi Samay Watch, I'm interested in this timepiece:\n\n*Product:* ${product.title || ''}\n*Brand:* ${product.brand || ''}\n*SKU:* ${product.sku || product._id?.slice(-8).toUpperCase() || ''}\n*Price:* ${formatPrice(product.price)}\n\n*Link:* ${productUrl}`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  const handleNativeShare = () => {
    if (!product) return;
    const shareData = {
      title: `${product.brand} - ${product.title}`,
      text: `Check out this exquisite timepiece from Samay Watch: ${product.title}`,
      url: window.location.href,
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => { });
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        toast.success("Product link copied to clipboard", {
          icon: '🔗',
          style: { background: '#000', color: '#fff', fontSize: '12px', fontWeight: 'bold' }
        });
      });
    }
  };

  if (loading) return <ProductSkeleton />

  if (error || !product) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-[1400px] flex-col items-center justify-center px-6">
        <p className="font-serif text-2xl text-neutral-900">Product not found</p>
        <Link to="/all-products" className="mt-4 text-sm text-neutral-600 hover:text-neutral-900">
          Back to products
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white overflow-x-clip min-h-screen">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-20 pt-4 sm:pt-6">
        <nav className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium">
          <Link to="/" className="hover:text-black transition-colors">Home</Link>
          <span className="mx-2 opacity-30">/</span>
          {brandMap[product.brand] ? (
            <>
              <span className="cursor-default">
                {brandMap[product.brand].category === 'luxury' ? 'Luxury' : 'Fashion'}
              </span>
              <span className="mx-2 opacity-30">/</span>
              <Link to={getBrandPath({ name: product.brand, slug: brandMap[product.brand].slug, category: brandMap[product.brand].category })} className="hover:text-black transition-colors">
                {product.brand}
              </Link>
            </>
          ) : (
            <span>{product.brand || 'Brand'}</span>
          )}
          <span className="mx-2 opacity-30">/</span>
          <span className="text-neutral-900 font-bold">{product.title}</span>
        </nav>

        <section className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,_1.2fr)_minmax(0,_1fr)] lg:items-start lg:gap-12 xl:gap-20 lg:pb-12">
          <div className="lg:sticky lg:top-24 w-full min-w-0">
            <ProductImageGallery product={product} title={product.title || ''} />
          </div>

          <div className="flex flex-col">
            {/* Header Block — Tightered for Above the Fold */}
            <div className="flex flex-col border-b border-neutral-100 pb-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-poppins text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                  {product.brand || 'BRAND'}
                </p>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50/50 px-2 py-0.5 rounded">
                    <svg className="size-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    Bestseller
                  </span>
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="cursor-pointer text-neutral-300 hover:text-black transition-colors"
                  >
                    <Share2 className="size-4" />
                  </button>
                </div>
              </div>

              <h1 className="max-w-[98%] font-poppins text-[16px] sm:text-[18px] lg:text-[22px] font-bold leading-tight text-black tracking-tight" title={product.title}>
                {product.title || '—'}
              </h1>

              {/* SKU Display */}
              {(product.sku || product._id) && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
                    SKU: <span className="text-neutral-900 ml-1">{product.sku || product._id.slice(-8).toUpperCase()}</span>
                  </span>
                  
                  {/* Ratings inline on desktop - on the right of SKU row, shifted slightly left */}
                  <div className="hidden lg:flex items-center gap-2.5 lg:mr-16">
                    <span className="text-[12px] font-bold text-black flex items-center gap-1">
                      4.9 ★
                    </span>
                    <div className="h-3 w-px bg-neutral-300" />
                    <span className="text-[12px] text-neutral-400 font-medium">
                      <span className="text-black underline cursor-pointer hover:text-neutral-700">124 Reviews</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Stock Indicator & Ratings Row */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                {product.inventory > 0 && product.inventory <= 2 ? (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                  >
                    <div className={cn(
                      "size-2 rounded-full",
                      product.inventory === 1 ? "bg-red-500 animate-pulse" : "bg-green-500"
                    )} />
                    <span className={cn(
                      "text-[12px] font-bold uppercase tracking-widest",
                      product.inventory === 1 ? "text-red-500" : "text-green-600"
                    )}>
                      Only {product.inventory} left in stock
                    </span>
                  </motion.div>
                ) : (
                  <div></div>
                )}

                <div className="flex lg:hidden items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1 text-[11px] font-bold text-white shadow-sm">
                    ★ 4.9
                  </div>
                  <span className="hidden sm:inline text-[12px] text-neutral-400 font-medium">
                    <span className="text-black underline cursor-pointer">124 Reviews</span>
                  </span>
                </div>
              </div>
            </div>
            {/* Price Block — Compact for Above the Fold */}
            <div className="mt-4 flex flex-col gap-0 border-b border-neutral-100 pb-4">
              <div className="flex flex-wrap items-baseline gap-3">
                <p className="font-poppins text-[28px] lg:text-[34px] font-bold tracking-tight text-black">
                  {formatPrice(product.price)}
                </p>
                {product.oldPrice != null && Number(product.oldPrice) > 0 && Number(product.oldPrice) > (Number(product.price) || 0) && (
                  <div className="flex items-center gap-2">
                    <span className="font-poppins text-[16px] text-neutral-400 line-through">
                      {formatPrice(product.oldPrice)}
                    </span>
                    <span className="font-poppins rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white uppercase tracking-tighter">
                      Save {Math.round(((Number(product.oldPrice) - Number(product.price)) / Number(product.oldPrice)) * 100)}%
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-[12px] font-medium text-neutral-400 uppercase tracking-widest">(Inc. of all taxes)</p>
                <div className="h-4 w-px bg-neutral-200" />
                <p className="text-[12px] font-semibold text-neutral-600 uppercase tracking-widest">Free Delivery</p>
              </div>
            </div>

            {/* Action Buttons — Horizontal Layout on Desktop */}
            <div className="mt-4 max-w-[450px]">
              {product.inventory <= 0 ? (
                <div className="space-y-3 animate-fadeIn">
                  <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-lg text-[12px] font-bold uppercase tracking-wider flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                    Sold Out
                  </div>
                  {isSubscribed ? (
                    <div className="bg-green-50 border border-green-200 text-green-800 p-3.5 rounded-lg text-[12px] font-bold uppercase tracking-wider flex items-center gap-2">
                      <Check className="size-4 text-green-600" strokeWidth={3} />
                      Subscribed! We will notify you.
                    </div>
                  ) : user ? (
                    <button
                      type="button"
                      disabled={submittingSub}
                      onClick={handleSubscribe}
                      className="cursor-pointer w-full min-h-[52px] rounded-lg bg-black text-white py-3.5 text-[12px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition active:scale-[0.98] disabled:bg-neutral-400 disabled:cursor-not-allowed"
                    >
                      {submittingSub ? 'Subscribing...' : 'Notify Me When Available'}
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        type="email" 
                        placeholder="Enter your email to get notified..." 
                        className="flex-1 px-4 py-3 border border-neutral-300 rounded-lg text-xs outline-none focus:border-neutral-800"
                        id="notify-email"
                      />
                      <button
                        type="button"
                        disabled={submittingSub}
                        onClick={handleSubscribe}
                        className="bg-black text-white px-6 py-3.5 rounded-lg text-[12px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition active:scale-[0.98] disabled:bg-neutral-400 disabled:cursor-not-allowed"
                      >
                        {submittingSub ? '...' : 'Notify Me'}
                      </button>
                    </div>
                  )}
                </div>
              ) : isInquiryOnlyBrand ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="cursor-pointer flex-1 min-h-[52px] flex items-center justify-center gap-3 rounded-lg bg-neutral-900 py-3.5 text-[12px] font-bold uppercase tracking-widest text-white shadow-[0_12px_30px_rgba(0,0,0,0.15)] transition-all active:scale-[0.98] lg:hover:translate-y-[-2px] lg:hover:bg-black"
                  >
                    <WhatsAppIcon className="size-5" />
                    Inquire Us
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (product.inventory <= 0) {
                        toast.error("This product is currently out of stock", { icon: '🚫' });
                        return;
                      }
                      initiateCheckout(true);
                    }}
                    className={cn(
                      "cursor-pointer w-full sm:flex-1 min-h-[52px] rounded-lg border-2 py-3.5 text-[12px] font-bold uppercase tracking-widest transition-all active:scale-[0.98]",
                      product.inventory <= 0
                        ? "border-neutral-200 text-neutral-400 cursor-not-allowed bg-neutral-50"
                        : "border-black bg-white text-black hover:bg-neutral-50"
                    )}
                    disabled={product.inventory <= 0}
                  >
                    Buy Now
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      if (product.inventory <= 0) {
                        toast.error("This product is currently out of stock", { icon: '🚫' });
                        return;
                      }
                      addToCart(e);
                    }}
                    className={cn(
                      "cursor-pointer flex-1 min-h-[52px] flex items-center justify-center gap-3 rounded-lg py-3.5 text-[12px] font-bold uppercase tracking-widest text-white shadow-[0_12px_30px_rgb(0,0,0,0.1)] transition-all active:scale-[0.98]",
                      product.inventory <= 0
                        ? "bg-neutral-400 cursor-not-allowed shadow-none"
                        : "bg-black lg:hover:translate-y-[-2px] lg:hover:bg-neutral-900"
                    )}
                    disabled={product.inventory <= 0}
                  >
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                    Add to Cart
                  </button>
                </div>
              )}
            </div>



            {/* Trust Badges — Compact Grid */}
            <div className="mt-8 lg:mt-5 grid grid-cols-2 lg:grid-cols-4 gap-x-4 lg:gap-x-2 gap-y-3 lg:gap-y-0 border-t border-neutral-100 pt-8 lg:pt-5 text-[11px] lg:text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
              <div className="flex items-center gap-3 lg:gap-2">
                <div className="flex size-9 lg:size-7 items-center justify-center rounded-full bg-neutral-50 text-gold shadow-sm shrink-0">
                  <ShieldCheck className="size-5 lg:size-4" />
                </div>
                <span className="leading-tight">{product.warrantyPeriod ? `${product.warrantyPeriod} Warranty` : '2 Year Warranty'}</span>
              </div>
              <div className="flex items-center gap-3 lg:gap-2">
                <div className="flex size-9 lg:size-7 items-center justify-center rounded-full bg-neutral-50 text-gold shadow-sm shrink-0">
                  <Truck className="size-5 lg:size-4" />
                </div>
                <span className="leading-tight">Pan India Delivery</span>
              </div>
              <div className="flex items-center gap-3 lg:gap-2">
                <div className="flex size-9 lg:size-7 items-center justify-center rounded-full bg-neutral-50 text-gold shadow-sm shrink-0">
                  <svg className="size-5 lg:size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" /></svg>
                </div>
                <span className="leading-tight">7-Day Returns</span>
              </div>
              <div className="flex items-center gap-3 lg:gap-2">
                <div className="flex size-9 lg:size-7 items-center justify-center rounded-full bg-neutral-50 text-gold shadow-sm shrink-0">
                  <svg className="size-5 lg:size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <span className="leading-tight">Secure Payments</span>
              </div>
            </div>

            {/* Dynamic Product Specifications Accordion */}
            {specificationFields.some(f => f.value) && (
              <div className="mt-12 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setOpenSpecs(!openSpecs)}
                  className="flex w-full items-center justify-between py-6 text-left"
                >
                  <span className="font-poppins text-[13px] font-black tracking-[0.25em] uppercase text-neutral-400">Technical Specifications</span>
                  <div className={cn("size-6 flex items-center justify-center shrink-0 transition-transform duration-300", openSpecs ? "rotate-180" : "")}>
                    <svg className="size-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </button>
                <AnimatePresence>
                  {openSpecs && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {/* Premium Spec Dashboard */}
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-4 pb-10 mb-8 border-b border-neutral-100">
                        {product?.caseShape && (
                          <div className="group flex flex-col items-center justify-center text-center gap-3 py-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Case Shape</span>
                            <div className="size-12 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-600 bg-white shadow-sm transition-transform group-hover:scale-110">
                              <svg className="size-5 font-light stroke-[1.5px]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="8" strokeDasharray="2 2"></circle></svg>
                            </div>
                            <span className="font-poppins text-[13px] font-black text-black uppercase tracking-wider">{product.caseShape}</span>
                          </div>
                        )}
                        {(product?.caseSize || product?.dialDiameter) && (
                          <div className="group flex flex-col items-center justify-center text-center gap-3 py-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Dial Diameter</span>
                            <div className="size-12 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-600 bg-white shadow-sm transition-transform group-hover:scale-110">
                              <svg className="size-5 font-light stroke-[1.5px]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 12H6m0 0l3-3m-3 3l3 3m9-3l-3-3m3 3l-3 3"></path><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>
                            </div>
                            <span className="font-poppins text-[13px] font-black text-black uppercase tracking-wider">{product.caseSize || product.dialDiameter}</span>
                          </div>
                        )}
                        {product?.movement && (
                          <div className="group flex flex-col items-center justify-center text-center gap-3 py-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Movement</span>
                            <div className="size-12 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-600 bg-white shadow-sm transition-transform group-hover:scale-110">
                              <svg className="size-5 font-light stroke-[1.5px]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                            </div>
                            <span className="font-poppins text-[13px] font-black text-black uppercase tracking-wider">{product.movement}</span>
                          </div>
                        )}
                        {product?.gender && (
                          <div className="group flex flex-col items-center justify-center text-center gap-3 py-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Gender</span>
                            <div className="size-12 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-600 bg-white shadow-sm transition-transform group-hover:scale-110">
                              <svg className="size-5 font-light stroke-[1.5px]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="10" cy="10" r="5"></circle><line x1="14" y1="14" x2="20" y2="20"></line><line x1="14" y1="20" x2="20" y2="14"></line><line x1="10" y1="15" x2="10" y2="21"></line><line x1="7" y1="18" x2="13" y2="18"></line></svg>
                            </div>
                            <span className="font-poppins text-[13px] font-black text-black uppercase tracking-wider">{product.gender}</span>
                          </div>
                        )}
                        {product?.caseMaterial && (
                          <div className="group flex flex-col items-center justify-center text-center gap-3 py-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Case Material</span>
                            <div className="size-12 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-600 bg-white shadow-sm transition-transform group-hover:scale-110">
                              <svg className="size-5 font-light stroke-[1.5px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                            </div>
                            <span className="font-poppins text-[13px] font-black text-black uppercase tracking-wider">{product.caseMaterial}</span>
                          </div>
                        )}
                        {product?.dialColor && (
                          <div className="group flex flex-col items-center justify-center text-center gap-3 py-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Dial Colour</span>
                            <div className="size-12 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-600 bg-white shadow-sm transition-transform group-hover:scale-110">
                              <svg className="size-5 font-light stroke-[1.5px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7z"></path></svg>
                            </div>
                            <span className="font-poppins text-[13px] font-black text-black uppercase tracking-wider">{product.dialColor}</span>
                          </div>
                        )}
                      </div>

                      {/* Detailed Horological List */}
                      <div className="flex flex-col gap-0 pb-8">
                        {specificationFields.filter(f => f.value).map((spec, idx) => {
                          const skippedLabels = ['Case Shape', 'Case Size', 'Movement', 'Gender', 'Case Material', 'Dial Color'];
                          if (skippedLabels.includes(spec.label)) return null;

                          return (
                            <div key={idx} className="flex justify-between items-center w-full py-4 border-b border-neutral-50 last:border-0">
                              <span className="text-[12px] font-bold uppercase tracking-widest text-neutral-400">{spec.label}</span>
                              <span className="font-poppins text-[13px] font-black tracking-wide text-black uppercase">{spec.value}</span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </section>

        {/* Watch Highlights Grid — same data */}
        <section className="mt-6 sm:mt-10 lg:mt-12 border-y border-neutral-100 py-10 sm:py-14 lg:py-16">
          <div className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-3 px-4 sm:px-6 lg:px-12">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fbfbfb] text-black">
                <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div>
                <h4 className="font-bold text-black text-[13px] uppercase tracking-widest">Premium Movement</h4>
                <p className="text-[11px] text-neutral-500 mt-1 uppercase tracking-wider">{product?.movement || 'High-precision mechanics'}</p>
              </div>
            </div>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fbfbfb] text-black">
                <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>
              </div>
              <div>
                <h4 className="font-bold text-black text-[13px] uppercase tracking-widest">Water Resistance</h4>
                <p className="text-[11px] text-neutral-500 mt-1 uppercase tracking-wider">{product?.waterResistance || 'Standard'}</p>
              </div>
            </div>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fbfbfb] text-black">
                <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
              </div>
              <div>
                <h4 className="font-bold text-black text-[13px] uppercase tracking-widest">{product?.caseMaterial || 'Stainless Steel'}</h4>
                <p className="text-[11px] text-neutral-500 mt-1 uppercase tracking-wider">Premium casing</p>
              </div>
            </div>
          </div>
        </section>

        {/* Luxury Storytelling — same data */}
        <section className="mt-16 sm:mt-20 lg:mt-24 grid grid-cols-1 items-center gap-8 sm:gap-12 lg:grid-cols-2 lg:gap-24">
          <div className="h-[320px] sm:h-[420px] lg:h-[700px] w-full overflow-hidden bg-[#fbfbfb] rounded-xl sm:rounded-2xl flex items-center justify-center p-6 sm:p-8">
            <img
              src={getSquareImage(
                (() => {
                  const img = product.images?.[0] || product.image?.url;
                  return typeof img === 'string' ? img : img?.url;
                })()
              )}
              alt={`${product.brand} ${product.title} Craftsmanship`}
              className="h-full w-full object-contain mix-blend-multiply transition-transform duration-1000 hover:scale-[1.15]"
              loading="lazy"
              onError={(e) => {
                const currentSrc = e.currentTarget.src;
                const imageUrl = product.images?.[0] || product.image?.url;
                if (currentSrc.includes('res.cloudinary.com') && imageUrl) {
                  e.currentTarget.src = imageUrl;
                } else if (imageUrl && currentSrc === imageUrl) {
                  const SAFE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800' viewBox='0 0 800 800'%3E%3Crect width='800' height='800' fill='%23f3f4f6'/%3E%3Cpath d='M400 300a50 50 0 1 0 0 100 50 50 0 0 0 0-100zm-150 200h300l-75-100-75 100-50-60-100 60z' fill='%239ca3af'/%3E%3Ctext x='400' y='550' font-family='sans-serif' font-size='18' text-anchor='middle' fill='%239ca3af'%3EImage not available%3C/text%3E%3C/svg%3E";
                  e.currentTarget.src = SAFE_PLACEHOLDER;
                }
              }}
            />
          </div>
          <div className="flex flex-col justify-center px-0 sm:px-4 lg:pr-16">
            <h2 className="font-serif text-[28px] sm:text-[38px] md:text-[56px] font-black leading-[1.1] text-black">Crafted for Precision.<br />Designed for Presence.</h2>
            <div className="mt-10 h-[2px] w-16 bg-gold"></div>
            <p className="mt-10 text-[16px] leading-relaxed text-neutral-500 font-medium">
              Every timepiece in our collection represents the pinnacle of horological engineering. Hand-assembled with meticulous attention to detail, the {product.title || 'watch'} combines timeless elegance with uncompromising durability.
            </p>
            <p className="mt-6 text-[16px] leading-relaxed text-neutral-500 font-medium">
              Whether commanding a boardroom or exploring the depths, the exquisite sapphire crystal and surgical-grade stainless steel ensure your legacy endures for generations. It is not just a mechanism to track time; it is a profound statement of personal style and enduring success.
            </p>
          </div>
        </section>

        {/* Wrist Experience Parallax — same data */}
        <section className="mt-16 sm:mt-24 lg:mt-32 relative h-[40vh] sm:h-[60vh] md:h-[80vh] w-screen left-1/2 -ml-[50vw] overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-cover grayscale-[15%]"
            >
              <source src="https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/c567f4f3e7ae49e19c2af691c95517a1_vydgvs.mp4" type="video/mp4" />
            </video>
            {/* Sophisticated Radial Gradient Overlay for maximum text contrast and luxury feel */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.6)_100%)] bg-black/30"></div>
          </div>
        </section>

        {/* Product Accordions (Description, Details, Warranty) — same data, accordion on mobile */}
        <section className="mt-16 sm:mt-20 lg:mt-24 max-w-4xl mx-auto px-4 sm:px-6">
          <div className="border-t border-neutral-200">
            {/* Description Tab */}
            <div className="border-b border-neutral-200">
              <button
                type="button"
                onClick={() => toggleAccordion('description')}
                className="flex w-full items-center justify-between py-4 sm:py-6 text-left"
              >
                <span className="font-poppins text-[16px] sm:text-[20px] font-bold text-black uppercase tracking-wide">Product Description</span>
                <svg className={cn("size-6 text-black transition-transform duration-300", openAccordion === 'description' ? "rotate-180" : "")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              <AnimatePresence>
                {openAccordion === 'description' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <p className="pb-8 text-[15px] leading-relaxed text-neutral-600 font-medium whitespace-pre-wrap">
                      {product.description || "No detailed description available for this timepiece."}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Design Details Tab */}
            <div className="border-b border-neutral-200">
              <button
                type="button"
                onClick={() => toggleAccordion('design')}
                className="flex w-full items-center justify-between py-4 sm:py-6 text-left"
              >
                <span className="font-poppins text-[16px] sm:text-[20px] font-bold text-black uppercase tracking-wide">Design Details</span>
                <svg className={cn("size-6 text-black transition-transform duration-300", openAccordion === 'design' ? "rotate-180" : "")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              <AnimatePresence>
                {openAccordion === 'design' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="pb-8 text-[14px] leading-relaxed text-neutral-600 font-medium grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                      {specificationFields.map((spec, idx) => (
                        spec.value && (
                          <div key={idx} className="flex justify-between items-center border-b border-neutral-50 pb-2">
                            <span className="text-neutral-400 font-bold uppercase text-[10px] tracking-widest">{spec.label}</span>
                            <span className="text-black font-bold uppercase text-[12px] font-poppins">{spec.value}</span>
                          </div>
                        )
                      ))}
                      <div className="flex justify-between items-center border-b border-neutral-50 pb-2">
                        <span className="text-neutral-400 font-bold uppercase text-[10px] tracking-widest">SKU</span>
                        <span className="text-black font-bold uppercase text-[12px] font-poppins">{product.sku || product._id?.slice(-8).toUpperCase()}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Warranty Info Tab */}
            <div className="border-b border-neutral-200">
              <button
                type="button"
                onClick={() => toggleAccordion('warranty')}
                className="flex w-full items-center justify-between py-4 sm:py-6 text-left"
              >
                <span className="font-poppins text-[16px] sm:text-[20px] font-bold text-black uppercase tracking-wide">Warranty & Services</span>
                <svg className={cn("size-6 text-black transition-transform duration-300", openAccordion === 'warranty' ? "rotate-180" : "")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              <AnimatePresence>
                {openAccordion === 'warranty' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <p className="pb-8 text-[15px] leading-relaxed text-neutral-600 font-medium">
                      This Timepiece comes with ({product.warrantyPeriod || '1 Year'}) of Warranty.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Samay Watch Experience Metrics — same data */}
        <section className="mt-16 sm:mt-24 lg:mt-32 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 text-center bg-black text-white py-12 sm:py-16 px-6 sm:px-8 rounded-xl sm:rounded-2xl shadow-2xl">
            <div className="flex flex-col items-center gap-3">
              <span className="font-poppins text-[48px] sm:text-[56px] font-bold leading-none text-gold">50+</span>
              <span className="text-[14px] font-bold uppercase tracking-[0.2em] text-neutral-300">Global Watch Brands</span>
            </div>
            <div className="flex flex-col items-center gap-3 md:border-x border-white/10">
              <span className="font-poppins text-[48px] sm:text-[56px] font-bold leading-none text-gold">5000+</span>
              <span className="text-[14px] font-bold uppercase tracking-[0.2em] text-neutral-300">Active Stock</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <span className="font-poppins text-[48px] sm:text-[56px] font-bold leading-none text-gold">55+</span>
              <span className="text-[14px] font-bold uppercase tracking-[0.2em] text-neutral-300">Years of Retail</span>
            </div>
          </div>
        </section>

        {/* Luxury Gallery Slider — same data */}
        <section className="mt-16 sm:mt-24 lg:mt-32 w-full overflow-hidden bg-white">
          <div className="text-center mb-8 sm:mb-12 px-4 sm:px-6">
            <h2 className="font-poppins text-[26px] sm:text-[32px] md:text-[42px] font-bold text-black uppercase tracking-tight">Showcase</h2>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.3em] mt-4">Discover the finer details</p>
          </div>
          <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory px-6 lg:px-12 pb-12 scrollbar-hide">
            {product.images?.filter(Boolean).map((img, idx) => (
              <div key={idx} className="snap-center shrink-0 w-[85vw] md:w-[60vw] lg:w-[40vw] h-[400px] md:h-[500px] bg-[#fbfbfb] rounded-xl overflow-hidden shadow-sm">
                <img src={getSquareImage(img)} alt={`Gallery ${idx}`} className="h-full w-full object-contain mix-blend-multiply transition-transform duration-700 hover:scale-105" loading="lazy" />
              </div>
            ))}
            {/* Pad the slider for demo layout if images are limited */}
            {(product.images?.length || 0) < 3 && [...Array(3)].map((_, idx) => (
              <div key={`extra-${idx}`} className="snap-center shrink-0 w-[85vw] md:w-[60vw] lg:w-[40vw] h-[400px] md:h-[500px] bg-[#fbfbfb] rounded-xl overflow-hidden shadow-sm">
                <img src={getSquareImage(product.images?.[0] || product.image?.url)} alt={`Gallery Extra ${idx}`} className="h-full w-full object-contain mix-blend-multiply transition-transform duration-700 hover:scale-105" loading="lazy" />
              </div>
            ))}
          </div>
        </section>

        {/* Customer Reviews — same data */}
        <section className="mt-16 sm:mt-24 lg:mt-32 max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row gap-12 justify-between items-start md:items-center mb-16 border-b border-neutral-100 pb-8">
            <div>
              <h2 className="font-poppins text-[32px] font-bold text-black uppercase tracking-tight">Client Reviews</h2>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex text-gold text-lg">★★★★★</div>
                <span className="text-[13px] font-bold text-black">4.9 / 5</span>
                <span className="text-[12px] text-neutral-400 uppercase tracking-widest ml-2">Based on 124 Reviews</span>
              </div>
            </div>
            <button className="border-b-2 border-black pb-1 text-[11px] font-bold text-black uppercase tracking-[0.2em] transition-all hover:text-gold hover:border-gold">Write a Review</button>
          </div>

          <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-8 scrollbar-hide">
            <div className="shrink-0 w-[85vw] md:w-[350px] snap-center bg-[#fbfbfb] p-8 rounded-2xl border border-neutral-100">
              <div className="flex text-gold text-sm mb-4">★★★★★</div>
              <h4 className="font-bold text-black text-[15px]">Absolutely Stunning</h4>
              <p className="text-[14px] text-neutral-500 font-medium leading-relaxed italic mt-2">"The weight, the finish, the intricate detailing on the dial—everything about this watch screams luxury. I've received countless compliments since purchasing."</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-4">— Rajesh K.</p>
            </div>
            <div className="shrink-0 w-[85vw] md:w-[350px] snap-center bg-[#fbfbfb] p-8 rounded-2xl border border-neutral-100">
              <div className="flex text-gold text-sm mb-4">★★★★★</div>
              <h4 className="font-bold text-black text-[15px]">Exceptional Service</h4>
              <p className="text-[14px] text-neutral-500 font-medium leading-relaxed italic mt-2">"Not only is the watch impeccable, but the buying experience was flawless. Next day delivery and beautifully packaged. A true premium experience."</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-4">— Amit D.</p>
            </div>
            <div className="shrink-0 w-[85vw] md:w-[350px] snap-center bg-[#fbfbfb] p-8 rounded-2xl border border-neutral-100">
              <div className="flex text-gold text-sm mb-4">★★★★★</div>
              <h4 className="font-bold text-black text-[15px]">Elegant and Timeless</h4>
              <p className="text-[14px] text-neutral-500 font-medium leading-relaxed italic mt-2">"Beautiful dial color that shifts in the sunlight. It seamlessly goes from formal business wear to weekend casual. Cannot recommend enough."</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-4">— Sarah L.</p>
            </div>
          </div>
        </section>

        {/* FAQ Accordion — same data */}
        <section className="mt-16 sm:mt-24 lg:mt-32 max-w-3xl mx-auto px-4 sm:px-6 bg-neutral-50 py-10 sm:py-16 rounded-2xl sm:rounded-3xl">
          <div className="text-center mb-12">
            <h2 className="font-poppins text-[32px] font-bold text-black uppercase tracking-tight">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: "Is this watch water resistant?", a: `Yes, this timepiece features a water resistance rating of ${product.waterResistance || '50 Meters'}, designed to withstand splashes and brief immersion in water.` },
              { q: "What is the warranty period?", a: `This watch is covered by an official ${product.warrantyPeriod || '2-Year'} Manufacturer Warranty from the date of purchase, honored at all Samay Watch boutiques.` },
              { q: "How long does delivery take?", a: "We offer expedited, fully-insured delivery across Pan India. Most orders arrive securely within 5-7 days." },
              { q: "Is Cash on Delivery (COD) available?", a: "Currently, we do not offer Cash on Delivery (COD). To ensure the highest level of security and insurance for our premium timepieces, we only accept secure prepaid transactions." }
            ].map((faq, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm overflow-hidden border border-neutral-100 transition-all hover:border-gold/50">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex justify-between items-center p-6 text-left"
                >
                  <span className="font-bold text-[15px] text-black">{faq.q}</span>
                  <div className={cn("size-6 rounded-full bg-neutral-50 flex items-center justify-center shrink-0 transition-transform duration-300", openFaq === idx ? "rotate-45" : "")}>
                    <svg className="size-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  </div>
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-6 pb-6 text-[14px] text-neutral-500 leading-relaxed max-w-[90%]">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 sm:mt-24 lg:mt-32 px-4 sm:px-6">
          <h2 className="font-poppins text-[24px] sm:text-[30px] font-bold text-black uppercase tracking-tight mb-8">You May Also Like</h2>

          <Swiper
            modules={[Autoplay, Pagination]}
            spaceBetween={16}
            slidesPerView={2}
            pagination={{ clickable: true, dynamicBullets: true }}
            autoplay={{ delay: 4000, disableOnInteraction: false }}
            breakpoints={{
              640: { slidesPerView: 2, spaceBetween: 24 },
              1024: { slidesPerView: 3, spaceBetween: 32 },
              1280: { slidesPerView: 4, spaceBetween: 40 }
            }}
            className="pb-14"
          >
            {recommended.map((p) => (
              <SwiperSlide key={p._id}>
                <RecommendedCard product={p} brandMap={brandMap} />
              </SwiperSlide>
            ))}
          </Swiper>
        </section>

        {/* Discovery / Find Out More Section */}
        <section className="mt-20 sm:mt-28 mb-16 border-t border-neutral-100 pt-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="font-serif text-[12px] font-black uppercase tracking-[0.4em] text-neutral-400 mb-8 sm:mb-10">Find Out More</h3>
            <div className="flex flex-wrap justify-center gap-x-6 sm:gap-x-10 gap-y-4 sm:gap-y-6">
              {[
                { label: "New Arrivals", href: "/all-products?sortBy=newest&type=new" },
                { label: "Men's Watches", href: "/all-products?gender=Male" },
                { label: "Women's Watches", href: "/all-products?gender=Female" },
                { label: "Luxury Brands", href: "/all-products?brandCategory=luxury" },
                { label: "Fashion Brands", href: "/all-products?brandCategory=fashion" },
              ].map((link, i) => (
                <Link
                  key={i}
                  to={link.href}
                  className="group relative text-[13px] sm:text-[14px] font-black uppercase tracking-widest text-neutral-800 transition-colors hover:text-gold"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 h-px w-0 bg-gold transition-all duration-300 group-hover:w-full"></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Mobile Sticky Bottom Bar (reference-style: title, price, discount, BUY NOW + ADD TO BAG) — same data as desktop */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.06)] lg:hidden">
        <div className="px-4 pt-3 pb-3">
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="text-[11px] font-bold text-black leading-tight line-clamp-2 min-w-0 flex-1">
              {product.title || '—'}
            </p>
            <div className="flex flex-col items-end shrink-0 gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-poppins text-[18px] font-bold text-black">{formatPrice(product.price)}</span>
                {product.oldPrice != null && Number(product.oldPrice) > 0 && Number(product.oldPrice) > (Number(product.price) || 0) && (
                  <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    {Math.round(((Number(product.oldPrice) - Number(product.price)) / Number(product.oldPrice)) * 100)}% OFF
                  </span>
                )}
              </div>
              {product.oldPrice != null && Number(product.oldPrice) > 0 && Number(product.oldPrice) > (Number(product.price) || 0) && (
                <span className="text-[11px] text-neutral-400 line-through">{formatPrice(product.oldPrice)}</span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            {isInquiryOnlyBrand ? (
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="cursor-pointer flex-1 min-h-[48px] rounded-lg bg-neutral-900 py-3 text-[11px] font-bold uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(0,0,0,0.15)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:bg-black"
              >
                <WhatsAppIcon className="size-4" />
                Inquire Us
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => initiateCheckout(true)}
                  className="cursor-pointer flex-1 min-h-[48px] rounded-lg border-2 border-black bg-white py-3 text-[11px] font-bold uppercase tracking-wider text-black transition-all active:scale-[0.98]"
                >
                  Buy Now
                </button>
                <button
                  type="button"
                  onClick={addToCart}
                  className="cursor-pointer flex-1 min-h-[48px] rounded-lg bg-black py-3 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:bg-neutral-900"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                  Add to Bag
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile FABs: Share + WhatsApp — same product data */}
      <div className="fixed right-4 bottom-[120px] z-30 flex flex-col gap-3 lg:hidden">
        <button
          type="button"
          onClick={handleWhatsAppShare}
          className="cursor-pointer flex size-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-transform active:scale-95 border-2 border-neutral-800"
          aria-label="Share on WhatsApp"
        >
          <WhatsAppIcon className="size-6" />
        </button>
        <button
          type="button"
          onClick={handleNativeShare}
          className="cursor-pointer flex size-14 items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-700 shadow-[0_8px_24px_rgba(0,0,0,0.1)] transition-transform active:scale-95"
          aria-label="Share"
        >
          <Share2 className="size-6" strokeWidth={2.5} />
        </button>
      </div>

      {/* Sticky Desktop Purchase Bar */}
      <AnimatePresence>
        {showStickyBar && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 z-[100] hidden lg:flex items-center justify-between bg-white/95 px-12 py-3 shadow-[0_-4px_30px_rgba(0,0,0,0.05)] backdrop-blur-md border-t border-neutral-100/50"
          >
            <div className="flex items-center gap-6">
              <div className="h-14 w-14 shrink-0 rounded bg-[#fbfbfb] overflow-hidden p-1">
                <img
                  src={getSquareImage(product.images?.[0] || product.image?.url)}
                  alt={product.title}
                  className="h-full w-full object-contain mix-blend-multiply"
                  onError={(e) => {
                    const currentSrc = e.currentTarget.src;
                    const rawImage = product.images?.[0] || product.image?.url;
                    const imageUrl = typeof rawImage === 'string' ? rawImage : rawImage?.url;
                    if (currentSrc.includes('res.cloudinary.com') && imageUrl) {
                      e.currentTarget.src = imageUrl;
                    } else if (imageUrl && currentSrc === imageUrl) {
                      const SAFE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800' viewBox='0 0 800 800'%3E%3Crect width='800' height='800' fill='%23f3f4f6'/%3E%3Cpath d='M400 300a50 50 0 1 0 0 100 50 50 0 0 0 0-100zm-150 200h300l-75-100-75 100-50-60-100 60z' fill='%239ca3af'/%3E%3Ctext x='400' y='550' font-family='sans-serif' font-size='18' text-anchor='middle' fill='%239ca3af'%3EImage not available%3C/text%3E%3C/svg%3E";
                      e.currentTarget.src = SAFE_PLACEHOLDER;
                    }
                  }}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold mb-0.5">{product.brand}</span>
                <span className="text-sm font-bold text-black leading-tight">{product.title}</span>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <span className="font-poppins text-[20px] font-bold tracking-tight text-black">{formatPrice(product.price)}</span>
              {product.inventory <= 0 ? (
                isSubscribed ? (
                  <button
                    type="button"
                    disabled
                    className="rounded bg-green-600 px-10 py-3 text-[11px] font-bold uppercase tracking-widest text-white cursor-not-allowed"
                  >
                    SUBSCRIBED
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      if (user) {
                        handleSubscribe(e);
                      } else {
                        document.getElementById('notify-email')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        document.getElementById('notify-email')?.focus();
                      }
                    }}
                    className="cursor-pointer rounded bg-red-600 px-10 py-3 text-[11px] font-bold uppercase tracking-widest text-white transition-all hover:bg-red-700 shadow-lg hover:translate-y-[-1px] active:translate-y-0"
                  >
                    NOTIFY ME
                  </button>
                )
              ) : isInquiryOnlyBrand ? (
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="cursor-pointer rounded bg-neutral-900 px-10 py-3 text-[11px] font-bold uppercase tracking-widest text-white transition-all hover:bg-black shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:translate-y-[-1px] active:translate-y-0 flex items-center gap-2"
                >
                  <WhatsAppIcon className="size-4" />
                  INQUIRE US
                </button>
              ) : (
                <button
                  type="button"
                  onClick={addToCart}
                  className="cursor-pointer rounded bg-black px-10 py-3 text-[11px] font-bold uppercase tracking-widest text-white transition-all hover:bg-black shadow-lg hover:translate-y-[-1px] active:translate-y-0"
                >
                  ADD TO CART
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flying to Cart Animation */}
      <AnimatePresence>
        {flyingImage && (
          <motion.img
            src={flyingImage.src}
            initial={{ opacity: 1, x: flyingImage.x, y: flyingImage.y, scale: 1, position: 'fixed', zIndex: 999999 }}
            animate={{
              opacity: 0,
              x: window.innerWidth > 768 ? window.innerWidth - 100 : window.innerWidth / 2 - 40, // Top right on desktop, center down on mobile
              y: window.innerWidth > 768 ? 100 : window.innerHeight - 100,
              scale: 0.1
            }}
            transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
            className="w-20 h-20 object-contain rounded-full shadow-2xl border border-neutral-200 bg-white pointer-events-none"
          />
        )}
      </AnimatePresence>

    </div>
  )
}
