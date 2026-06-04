import { useRef, useEffect, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import 'swiper/css'
import BrandVideoCard from '../common/BrandVideoCard'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function BrandCard({ name, startingPrice, videoUrl, thumbnailUrl, slug, category }) {
  let displayName = name;
  let displaySlug = slug || name.toLowerCase().replace(/\s+/g, '-');
  let displayPrice = startingPrice;
  let displayVideoUrl = videoUrl;

  if (name && name.toLowerCase() === 'rado') {
    displayPrice = 87700;
    displayVideoUrl = 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/RADO_Brand_Ambassador_Katrina_Kaif_sharing_her_Wishes_for_India_s_Most_Celebrated_Moments_1080P_xzfbon.mp4';
  } else if (name && name.toLowerCase() === 'citizen') {
    displayPrice = 20900;
  } else if (name && name.toLowerCase() === 'tissot') {
    displayPrice = 22500;
    displayVideoUrl = 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/TISSOT___PRX_-_15_sec_1080p_a4cysz.mp4';
  } else if (name && name.toLowerCase() === 'movado') {
    displayPrice = 95000;
    displayName = 'Longines';
    displaySlug = 'longines';
    displayVideoUrl = 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/LONGINES_HYDROCONQUEST_1080p_tu8byl.mp4';
  } else if (name && name.toLowerCase() === 'balmain') {
    displayPrice = 39700;
    displayVideoUrl = 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/Be_Balmain_2023_Novelties_Pierre_Balmain_Watches_1080p_qczusg.mp4';
  } else if (name && name.toLowerCase() === 'seiko') {
    displayPrice = 16500;
    displayVideoUrl = 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/Seiko_Prospex_Brand_Story_Full__1080p_hru0pj.mp4';
  }

  const categorySlug = category === 'luxury' ? 'luxury-brands' : category === 'fashion' ? 'fashion-brands' : null
  const navigate = useNavigate();
  
  const href = `/collections/${displaySlug}`;

  const formattedPrice = displayPrice ? `₹ ${Number(displayPrice).toLocaleString('en-IN')}` : ''

  return (
    <motion.div
      className="group relative overflow-hidden rounded-2xl sm:rounded-2xl border border-white/15 bg-neutral-900 shadow-[0_12px_40px_rgba(0,0,0,0.45)] transition duration-700 hover:scale-[1.02] sm:hover:scale-105 hover:border-white/25 md:border-white/10 md:shadow-none"
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div 
        onClick={(e) => {
          if (!e.defaultPrevented) navigate(href)
        }} 
        className="block overflow-hidden rounded-t-xl sm:rounded-t-2xl cursor-pointer"
      >
        <BrandVideoCard videoUrl={displayVideoUrl} thumbnailUrl={thumbnailUrl} />
      </div>
      <div className="relative flex items-end justify-between gap-3 rounded-b-xl sm:rounded-b-2xl border-t border-white/10 bg-neutral-900 p-4 sm:p-5">
        <div className="min-w-0">
          <Link to={href} className="block group/name transition-colors">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-white truncate group-hover/name:text-gold transition-colors">
              {displayName}
            </p>
          </Link>
          <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-white/70">
            {formattedPrice ? `From ${formattedPrice}` : ''}
          </p>
        </div>
        <Link
          to={href}
          className="flex size-11 min-w-[44px] shrink-0 items-center justify-center rounded-full border border-white/50 text-white transition-colors duration-300 hover:bg-white hover:text-black active:scale-95"
          aria-label={`Explore ${name}`}
        >
          <ArrowRight className="size-5" strokeWidth={2} />
        </Link>
      </div>
    </motion.div>
  )
}

export default function MostLovedBrands() {
  const swiperRef = useRef(null)
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/store/brands/most-loved`)
      .then(res => res.json())
      .then(json => {
        if (json?.success && Array.isArray(json.data)) {
          let fetchedBrands = [...json.data];
          
          if (!fetchedBrands.some(b => b.name && b.name.toLowerCase() === 'tissot')) {
            fetchedBrands.push({ name: 'Tissot', startingPrice: null, videoUrl: '', slug: 'tissot' });
          }
          if (!fetchedBrands.some(b => b.name && b.name.toLowerCase() === 'seiko')) {
            fetchedBrands.push({ name: 'Seiko', startingPrice: null, videoUrl: '', slug: 'seiko' });
          }
          if (!fetchedBrands.some(b => b.name && b.name.toLowerCase() === 'balmain')) {
            fetchedBrands.push({ name: 'Balmain', startingPrice: null, videoUrl: '', slug: 'balmain' });
          }

          const citizenIdx = fetchedBrands.findIndex(b => b.name && b.name.toLowerCase() === 'citizen');
          const tissotIdx = fetchedBrands.findIndex(b => b.name && b.name.toLowerCase() === 'tissot');
          
          if (citizenIdx !== -1 && tissotIdx !== -1) {
            const temp = fetchedBrands[citizenIdx];
            fetchedBrands[citizenIdx] = fetchedBrands[tissotIdx];
            fetchedBrands[tissotIdx] = temp;
          }
          
          setBrands(fetchedBrands)
        }
      })
      .catch((err) => console.error('Failed to fetch most loved brands:', err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null;
  if (!brands || brands.length === 0) return null;

  return (
    <section
      className="w-full bg-gradient-to-b from-black via-neutral-950 to-black py-16 sm:py-20 md:bg-black md:py-32 md:bg-none text-white"
      aria-labelledby="most-loved-brands-heading"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="mb-5 sm:mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="min-w-0 flex-1">
            <h2
              id="most-loved-brands-heading"
              className="mt-0 font-poppins text-2xl sm:text-3xl md:text-5xl text-white leading-tight"
            >
              Most Loved Brands
            </h2>
            <p className="mt-2 sm:mt-4 text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] text-gold md:text-sm">
              Latest & Trending Collections
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => swiperRef.current?.slidePrev()}
              className="flex size-11 min-w-[44px] items-center justify-center rounded-full border border-white/50 text-white transition-colors duration-300 hover:bg-white hover:text-black active:scale-95"
              aria-label="Previous brands"
            >
              <ChevronLeft className="size-5" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => swiperRef.current?.slideNext()}
              className="flex size-11 min-w-[44px] items-center justify-center rounded-full border border-white/50 text-white transition-colors duration-300 hover:bg-white hover:text-black active:scale-95"
              aria-label="Next brands"
            >
              <ChevronRight className="size-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="w-full min-w-0 overflow-hidden -mx-4 sm:mx-0 px-2 sm:px-0">
          <Swiper
            onSwiper={(swiper) => { swiperRef.current = swiper }}
            loop
            grabCursor={true}
            spaceBetween={16}
            slidesPerView={1.08}
            breakpoints={{
              640: { spaceBetween: 24, slidesPerView: 2 },
              1024: { spaceBetween: 30, slidesPerView: 3 },
            }}
            className="brands-swiper"
          >
            {brands.map((brand) => (
              <SwiperSlide key={brand._id || brand.name}>
                <BrandCard
                  name={brand.name}
                  startingPrice={brand.startingPrice}
                  videoUrl={brand.videoUrl}
                  thumbnailUrl={brand.thumbnail || brand.image}
                  slug={brand.slug}
                  category={brand.category}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  )
}
