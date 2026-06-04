import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { getSquareImage } from '../../utils/cloudinary'
import { cn } from '../../utils/cn'
import { lockBodyScroll } from '../../utils/bodyScrollLock'
import { motion, AnimatePresence } from 'framer-motion'

const SAFE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800' viewBox='0 0 800 800'%3E%3Crect width='800' height='800' fill='%23f3f4f6'/%3E%3Cpath d='M400 300a50 50 0 1 0 0 100 50 50 0 0 0 0-100zm-150 200h300l-75-100-75 100-50-60-100 60z' fill='%239ca3af'/%3E%3Ctext x='400' y='550' font-family='sans-serif' font-size='20' text-anchor='middle' fill='%239ca3af'%3EImage not available%3C/text%3E%3C/svg%3E";

function blockImageContextMenu(e) {
  e.preventDefault()
}

function normalizeImages(product) {
  if (!product) return []
  
  const rawImages = Array.isArray(product.images) ? product.images : []
  const normalized = rawImages.map(img => {
    if (!img) return null
    return typeof img === 'string' ? img : img?.url
  }).filter(Boolean)

  // If images array is empty, try the legacy single image object
  if (normalized.length === 0 && product.image?.url) {
    return [product.image.url]
  }

  return normalized
}

export default function ProductImageGallery({ product, title }) {
  const images = useMemo(() => normalizeImages(product), [product])
  const [selectedImage, setSelectedImage] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [zoomStyle, setZoomStyle] = useState({ transformOrigin: 'center center', transform: 'scale(1)' })
  const [isZooming, setIsZooming] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [failedImages, setFailedImages] = useState(new Set())
  const thumbListRef = useRef(null)

  const scrollThumbs = (direction) => {
    thumbListRef.current?.scrollBy({ top: direction * 92, behavior: 'smooth' })
  }

  const handleMouseMove = (e) => {
    if (window.innerWidth < 1024) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - left) / width) * 100
    const y = ((e.clientY - top) / height) * 100
    setZoomStyle({
      transformOrigin: `${x}% ${y}%`,
      transform: 'scale(3)' // High detail zoom for luxury watches
    })
  }

  const handleMouseEnter = () => {
    if (window.innerWidth >= 1024) setIsZooming(true)
  }

  const handleMouseLeave = () => {
    setIsZooming(false)
    setZoomStyle({ transformOrigin: 'center center', transform: 'scale(1)' })
  }

  const activeImage = images[selectedImage] || images[0] || ''
  const isImageFailed = failedImages.has(activeImage)

  useEffect(() => {
    if (!showModal) return
    return lockBodyScroll()
  }, [showModal])

  const zoomModal = (
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden overscroll-none bg-white/95 backdrop-blur-xl"
          onContextMenu={blockImageContextMenu}
        >
          <button 
            type="button"
            onClick={() => setShowModal(false)}
            className="absolute right-6 top-6 z-[310] flex h-12 w-12 items-center justify-center rounded-full bg-black/5 text-black hover:bg-black/10 transition-colors"
          >
            <X className="size-6" />
          </button>
          <div
            className="relative h-full w-full max-w-[1200px] p-6 lg:p-12 overflow-hidden flex items-center justify-center"
            onContextMenu={blockImageContextMenu}
          >
             <motion.img
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               src={isImageFailed ? activeImage : getSquareImage(activeImage, 1200)}
               alt={title}
               draggable={false}
               onContextMenu={blockImageContextMenu}
               className="max-h-[90vh] max-w-full object-contain mix-blend-multiply select-none"
               onError={(e) => {
                 if (!isImageFailed) {
                   setFailedImages(prev => new Set(prev).add(activeImage))
                 } else {
                   e.currentTarget.src = SAFE_PLACEHOLDER
                 }
               }}
             />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      {typeof document !== 'undefined' ? createPortal(zoomModal, document.body) : null}

      {/* --- DESKTOP LUXURY GALLERY --- */}
      <div className="hidden lg:flex lg:h-[600px] lg:flex-row lg:items-stretch lg:gap-5">
        {/* Vertical Thumbnail Rail */}
        {images.length > 1 && (
          <div className="flex w-[88px] shrink-0 flex-col items-center self-stretch">
            {images.length > 5 && (
              <button
                type="button"
                onClick={() => scrollThumbs(-1)}
                className="mb-2 flex size-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition-colors hover:border-neutral-300 hover:text-black"
                aria-label="Scroll thumbnails up"
              >
                <ChevronUp className="size-4" strokeWidth={2} />
              </button>
            )}

            <div
              ref={thumbListRef}
              className="pdp-thumb-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto px-0.5 py-1"
            >
              {images.map((img, idx) => (
                <button
                  key={`desktop-${img}-${idx}`}
                  type="button"
                  onMouseEnter={() => {
                    setLoaded(false)
                    setSelectedImage(idx)
                  }}
                  onClick={() => setSelectedImage(idx)}
                  className={cn(
                    'relative flex size-[76px] shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white p-2 transition-all duration-200',
                    idx === selectedImage
                      ? 'border-black shadow-[0_4px_20px_rgba(0,0,0,0.08)]'
                      : 'border-neutral-200 opacity-75 hover:border-neutral-400 hover:opacity-100'
                  )}
                  aria-label={`View image ${idx + 1}`}
                  aria-current={idx === selectedImage ? 'true' : undefined}
                >
                  <img
                    src={failedImages.has(img) ? img : getSquareImage(img, 200)}
                    alt=""
                    className="max-h-full max-w-full object-contain mix-blend-multiply"
                    onError={(e) => {
                      if (!failedImages.has(img)) {
                        setFailedImages(prev => new Set(prev).add(img))
                      } else if (e.currentTarget.src !== SAFE_PLACEHOLDER) {
                        e.currentTarget.src = SAFE_PLACEHOLDER
                      }
                    }}
                  />
                </button>
              ))}
            </div>

            {images.length > 5 && (
              <button
                type="button"
                onClick={() => scrollThumbs(1)}
                className="mt-2 flex size-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition-colors hover:border-neutral-300 hover:text-black"
                aria-label="Scroll thumbnails down"
              >
                <ChevronDown className="size-4" strokeWidth={2} />
              </button>
            )}
          </div>
        )}

        {/* Main Massive Image Hub */}
        <div
          className="relative flex aspect-square w-full min-w-0 cursor-zoom-in items-center justify-center overflow-hidden rounded-2xl bg-[#fbfbfb] lg:h-full lg:flex-1"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
          onClick={() => setShowModal(true)}
        >
          <div className="absolute inset-0 z-[5] pointer-events-none border border-neutral-100/50 rounded-2xl" />
          
          <div className={cn(
            "absolute bottom-6 left-6 z-10 flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-black shadow-sm transition-opacity duration-300",
            isZooming ? "opacity-0" : "opacity-100"
          )}>
            <svg className="size-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            Move to zoom • Click for full screen
          </div>

          {!loaded && <div className="absolute inset-0 animate-pulse bg-neutral-50" />}

          {activeImage ? (
            <AnimatePresence mode="wait">
              <motion.img
                key={`desktop-main-${activeImage}`}
                src={isImageFailed ? activeImage : getSquareImage(activeImage, 1000)}
                alt={title}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                onLoad={() => setLoaded(true)}
                onError={(e) => {
                  if (!isImageFailed) {
                    setFailedImages(prev => new Set(prev).add(activeImage))
                  } else if (e.currentTarget.src !== SAFE_PLACEHOLDER) {
                    e.currentTarget.src = SAFE_PLACEHOLDER
                  }
                }}
                className={cn(
                  'h-[96%] w-[96%] object-contain mix-blend-multiply pointer-events-none transition-transform will-change-transform',
                  loaded ? 'opacity-100' : 'opacity-0',
                  isZooming ? 'duration-[150ms] ease-out z-20' : 'duration-700 ease-in-out'
                )}
                style={zoomStyle}
              />
            </AnimatePresence>
          ) : (
            <div className="text-sm text-neutral-400 italic font-serif">No image available</div>
          )}
        </div>
      </div>

      {/* --- MOBILE PREMIUM SWIPE SLIDER --- */}
      <div className="lg:hidden relative w-full bg-[#fbfbfb] pt-2">
        <div 
          className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide" 
          onScroll={(e) => {
             const scrollLeft = e.target.scrollLeft;
             const width = e.target.clientWidth;
             const newSelected = Math.round(scrollLeft / width);
             if (newSelected !== selectedImage) setSelectedImage(newSelected);
          }}
          onClick={() => setShowModal(true)}
        >
          {images.length > 0 ? (
            images.map((img, idx) => (
              <div key={`mobile-${img}-${idx}`} className="relative flex aspect-square w-full min-w-full shrink-0 snap-center items-center justify-center p-2 sm:p-4">
                 <img
                  src={failedImages.has(img) ? img : getSquareImage(img, 600)}
                  alt={`Slide ${idx + 1}`}
                  loading={idx === 0 ? "eager" : "lazy"}
                  className="h-[96%] w-[96%] object-contain mix-blend-multiply drop-shadow-sm pointer-events-none"
                  onError={(e) => {
                    if (!failedImages.has(img)) {
                      setFailedImages(prev => new Set(prev).add(img))
                    } else if (e.currentTarget.src !== SAFE_PLACEHOLDER) {
                      e.currentTarget.src = SAFE_PLACEHOLDER
                    }
                  }}
                />
              </div>
            ))
          ) : (
            <div className="w-full aspect-square flex items-center justify-center text-sm text-neutral-400 italic font-serif">No image available</div>
          )}
        </div>

        {/* Mobile Position Dots */}
        {images.length > 1 && (
          <div className="mt-4 flex justify-center gap-2 pb-6">
            {images.map((_, idx) => (
              <div 
                key={`dot-${idx}`} 
                className={cn(
                  "h-1 rounded-full transition-all duration-300", 
                  selectedImage === idx ? "w-6 bg-black" : "w-1 bg-neutral-300"
                )} 
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
