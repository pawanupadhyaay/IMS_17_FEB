import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination } from 'swiper/modules'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import 'swiper/css'
import 'swiper/css/pagination'

function heroImageSources(url) {
  const base = url.split('?')[0]
  return {
    src: base,
    srcSet: `${base} 1920w`,
  }
}

const SLIDES = [
  {
    image: 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/Samay_Desktop_Banner_2_osfexv.png',
    mobileImage: 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/Samay_Mobile_Banner_cyiqvr.png',
    brand: '',
    tagline: '',
    cta: '',
    link: '/collections/rado',
  },
  {
    image: 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/Samay_Desktop_Banner_1_rv5itl.png',
    mobileImage: 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/Samay_Mobile_Banner_3_namw1m.png',
    brand: '',
    tagline: '',
    cta: '',
    link: '/collections/longines',
  },
  {
    image: 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/Samay_Desktop_Banner_3_khiyqu.png',
    mobileImage: 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/Samay_Mobile_Banner_2_sf8wee.png',
    brand: '',
    tagline: '',
    cta: '',
    link: '/collections/tissot',
  },
]

export default function HeroSlider() {
  const navigate = useNavigate();

  return (
    <section className="w-full overflow-hidden bg-white" aria-label="Hero slider">
      <Swiper
        modules={[Autoplay, Pagination]}
        loop
        autoplay={{ delay: 4000, disableOnInteraction: false }}
        pagination={{
          clickable: true,
          bulletClass: 'hero-bullet',
          bulletActiveClass: 'hero-bullet-active',
        }}
        allowTouchMove
        className="hero-swiper"
      >
        {SLIDES.map((slide, index) => {
          const mobileSrcSet = slide.mobileImage ? heroImageSources(slide.mobileImage).srcSet : null;

          return (
          <SwiperSlide key={index}>
            <div 
              className={`group relative w-full h-auto overflow-hidden ${slide.link ? '!cursor-pointer' : ''}`}
              onClick={(e) => {
                if (slide.link && !e.defaultPrevented) {
                  navigate(slide.link);
                }
              }}
            >
              <picture>
                <source media="(max-width: 767px)" srcSet={slide.mobileImage || slide.image} />
                <source media="(min-width: 768px)" srcSet={slide.image} />
                <img
                  src={slide.image}
                  alt={slide.tagline || `Hero Banner ${index + 1}`}
                  className="relative w-full h-auto object-cover object-center block"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  fetchPriority={index === 0 ? 'high' : 'low'}
                  decoding={index === 0 ? 'sync' : 'async'}
                />
              </picture>

              <div className="relative z-[1] flex size-full flex-col justify-end px-5 pb-[4.5rem] pt-8 max-md:min-h-0 sm:px-10 sm:pb-20 md:flex-row md:items-center md:justify-start md:pb-0 md:pt-0 md:px-16 lg:px-24">
                <motion.div
                  className="flex w-full max-w-2xl flex-col gap-4 text-left sm:gap-5 md:h-auto md:max-w-2xl md:gap-0 md:justify-start"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  {slide.brand && (
                    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-neutral-200 sm:text-xs md:mb-4 md:text-sm">
                      {slide.brand}
                    </p>
                  )}
                  {slide.tagline && (
                    <h2 className="font-serif text-[28px] font-medium leading-[1.12] tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.45)] sm:text-[2rem] md:mb-6 md:text-6xl md:leading-tight md:drop-shadow-none lg:mb-8 lg:text-7xl">
                      {slide.tagline}
                    </h2>
                  )}
                  {slide.cta && (
                    <motion.button
                      onClick={(e) => {
                         e.stopPropagation();
                         navigate('/all-products');
                      }}
                      className="inline-flex w-full max-w-sm shrink-0 items-center justify-center min-h-[50px] border border-neutral-700 bg-neutral-900 px-7 py-3.5 text-[11px] font-black uppercase tracking-[0.22em] text-white transition-all duration-300 hover:bg-neutral-800 hover:border-neutral-600 hover:text-white active:scale-[0.98] shadow-[0_8px_32px_rgba(0,0,0,0.45)] sm:min-h-[52px] sm:w-auto sm:max-w-none sm:px-8 sm:py-4 sm:text-[12px] sm:shadow-2xl"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {slide.cta}
                    </motion.button>
                  )}
                </motion.div>
              </div>
            </div>
          </SwiperSlide>
        )})}
      </Swiper>
    </section>
  )
}
