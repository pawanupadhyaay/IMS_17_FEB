import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import AnalogClock from './AnalogClock'

export default function MainHeader() {
  const [time, setTime] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const dateFormatted = time.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const dateCompact = time.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="w-full bg-white border-b border-neutral-100">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center gap-1 px-4 py-1.5 sm:px-6 md:px-8 sm:py-2.5 md:flex-row md:justify-between md:gap-4">
        <motion.a
          href="/"
          className="shrink-0 flex items-center md:order-none"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <img 
            src="https://res.cloudinary.com/dnrbahpzc/image/upload/v1777546626/samay-logo-removebg-preview_u9zwef.png" 
            alt="Samay Watch" 
            className="h-10 sm:h-11 md:h-12 w-auto object-contain"
          />
        </motion.a>

        <time
          dateTime={time.toISOString()}
          className="text-center text-[10px] font-serif uppercase tracking-[0.2em] text-neutral-400 md:hidden"
        >
          {dateCompact}
        </time>

        <div className="hidden lg:flex flex-col items-center">
          <time
            dateTime={time.toISOString()}
            className="text-xs italic tracking-wide text-neutral-500 font-serif md:text-sm"
          >
            {dateFormatted}
          </time>
        </div>

        <div className="hidden lg:flex justify-end">
          <AnalogClock time={time} />
        </div>
      </div>
    </div>
  )
}
