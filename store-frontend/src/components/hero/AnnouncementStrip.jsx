import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, Sparkles, Award, Star } from 'lucide-react'

const ITEMS = [
  { icon: ShieldCheck, text: 'AUTHENTICITY GUARANTEED' },
  { icon: Sparkles, text: 'CURATED LUXURY SELECTION' },
  { icon: Award, text: 'LIMITED EDITIONS' },
  { icon: Star, text: 'MOST LOVED BRANDS' },
]

function StripItem({ icon: Icon, text }) {
  return (
    <div className="flex shrink-0 items-center gap-3 px-8 whitespace-nowrap">
      <Icon className="size-4 text-gold/90" strokeWidth={1.5} aria-hidden />
      <span className="text-[11px] font-black tracking-[0.25em] text-white/90 uppercase font-poppins">
        {text}
      </span>
    </div>
  )
}

export default function AnnouncementStrip() {
  const [isPaused, setIsPaused] = useState(false)
  
  // Triple the items to ensure enough width for smooth infinite looping on all screens
  const marqueeContent = [...ITEMS, ...ITEMS, ...ITEMS]

  return (
    <div
      className="relative w-full overflow-hidden bg-neutral-950 py-4 border-t border-b border-white/5"
      aria-label="Announcements"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Premium Side Fades */}
      <div className="absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-neutral-950 to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-neutral-950 to-transparent pointer-events-none" />

      <motion.div 
        className="flex items-center"
        animate={{
          x: isPaused ? undefined : ["0%", "-50%"],
        }}
        transition={{
          duration: 30, 
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop"
        }}
        style={{ width: 'max-content' }}
      >
        {marqueeContent.map((item, i) => (
          <StripItem key={i} icon={item.icon} text={item.text} />
        ))}
        {/* Mirror the content for seamless loop */}
        {marqueeContent.map((item, i) => (
          <StripItem key={`mirror-${i}`} icon={item.icon} text={item.text} />
        ))}
      </motion.div>
    </div>
  )
}
