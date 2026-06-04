import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const IMAGE_MAIN =
  'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/About-samay-watches.jpg'
const IMAGE_OVERLAY =
  'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/group_photo.jpg'

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-48px' },
  transition: { duration: 0.5, ease: 'easeOut' },
}

export default function CraftsmanshipSection() {
  return (
    <section
      className="py-14 sm:py-16 md:py-24"
      aria-labelledby="craftsmanship-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-10 sm:gap-14 lg:grid-cols-2 lg:gap-16">
          {/* Mobile: appears last (images). Desktop: left column */}
          <motion.div
            className="order-1 w-full lg:order-1"
            {...fadeIn}
          >
            <div className="relative w-full pb-12 sm:pb-16 md:pb-24">
              <img
                src={IMAGE_MAIN}
                alt="Samay Watches craftsmanship"
                className="w-full rounded-2xl object-cover shadow-[0_12px_40px_rgba(0,0,0,0.12)] md:shadow-md"
              />
              {/* Second image: bottom-right overlap — scaled on mobile, larger offset on md+ */}
              <img
                src={IMAGE_OVERLAY}
                alt="Samay Watches team"
                className="
                  absolute z-10 rounded-xl border-[3px] border-white object-cover shadow-2xl
                  w-[44%] max-w-[200px]
                  bottom-[-10px] right-[-6px]
                  sm:max-w-[240px] sm:bottom-[-14px] sm:right-[-8px] sm:rounded-2xl sm:border-4
                  md:bottom-[-60px] md:right-[-60px] md:w-1/2 md:max-w-[320px]
                "
              />
            </div>
          </motion.div>

          {/* Mobile: title first, then copy + CTA. Desktop: right column */}
          <motion.div
            className="order-2 flex flex-col justify-center gap-6 lg:order-2 lg:gap-8 sm:px-0 sm:pl-4 lg:pl-16"
            {...fadeIn}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-neutral-500 sm:text-sm">
                About Samay Watches
              </p>
              <h2
                id="craftsmanship-heading"
                className="mt-4 font-poppins text-2xl sm:text-3xl lg:text-3xl xl:text-[2.15rem] text-gray-900 leading-[1.3] font-bold uppercase tracking-tight max-w-2xl"
              >
                CRAFTED EXCELLENCE: <br className="hidden lg:block" />
                <span className="whitespace-nowrap">THE LEGACY OF SAMAY WATCHES</span>
              </h2>
            </div>
            <div className="mt-2">
              <p className="max-w-lg text-sm sm:text-base leading-[1.8] text-gray-600">
                Every timepiece is a testament to decades of expertise. We blend traditional
                watchmaking with contemporary design to create pieces that endure.
              </p>
              <Link
                to="/about-us"
                className="mt-8 inline-flex w-full max-w-xs min-h-[48px] items-center justify-center border border-neutral-900 bg-neutral-900 px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-all duration-500 hover:bg-neutral-800 hover:border-neutral-800 active:scale-[0.98] sm:max-w-none sm:w-fit sm:px-8 sm:py-4 sm:text-xs"
              >
                Explore Our Story
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
