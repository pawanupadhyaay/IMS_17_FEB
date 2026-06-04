import { useRef, useState, useEffect, useCallback } from 'react'

const DEFAULT_OVERLAY_OPACITY = 0.35

export default function BrandVideoCard({
  videoUrl,
  thumbnailUrl,
  overlayOpacity = DEFAULT_OVERLAY_OPACITY,
}) {
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [videoError, setVideoError] = useState(false)

  const handleIntersect = useCallback((entries) => {
    const [entry] = entries
    const video = videoRef.current
    if (!video) return

    if (entry.isIntersecting) {
      setIsVisible(true)
      video.play().catch(() => {})
    } else {
      setIsVisible(false)
      video.pause()
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(handleIntersect, {
      threshold: 0.5,
      rootMargin: '0px',
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [handleIntersect])

  useEffect(() => {
    if (!isVisible && videoRef.current) {
      videoRef.current.pause()
    }
  }, [isVisible])

  const handleLoaded = useCallback(() => {
    setIsLoaded(true)
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[16/9] overflow-hidden rounded-2xl group"
    >
      {(!isLoaded || videoError) && (
        <div className="absolute inset-0">
          {thumbnailUrl ? (
            <img 
              src={thumbnailUrl} 
              alt="" 
              className="h-full w-full object-cover transition-opacity duration-700"
              onError={(e) => {
                const currentSrc = e.currentTarget.src;
                if (currentSrc.includes('res.cloudinary.com')) {
                  e.currentTarget.src = thumbnailUrl;
                } else if (thumbnailUrl && currentSrc === thumbnailUrl) {
                  const SAFE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800' viewBox='0 0 800 800'%3E%3Crect width='800' height='800' fill='%23171717'/%3E%3Cpath d='M400 300a50 50 0 1 0 0 100 50 50 0 0 0 0-100zm-150 200h300l-75-100-75 100-50-60-100 60z' fill='%23404040'/%3E%3C/svg%3E";
                  e.currentTarget.src = SAFE_PLACEHOLDER;
                }
              }}
            />
          ) : (
            <div className="h-full w-full animate-pulse bg-neutral-800" />
          )}
        </div>
      )}
      {videoUrl && !videoError && (
        <video
          ref={videoRef}
          src={videoUrl}
          poster={thumbnailUrl}
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedData={handleLoaded}
          onError={() => {
            console.warn(`Video failed to load: ${videoUrl}`);
            setVideoError(true);
          }}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out group-hover:scale-105 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden
        />
      )}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }}
        aria-hidden
      />
    </div>
  )
}
