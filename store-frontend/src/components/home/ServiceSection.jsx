import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function ServiceSection() {
  return (
    <section className="relative overflow-hidden bg-white py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="order-2 flex flex-col justify-center lg:order-1 lg:pr-8"
          >
            <span className="mb-4 block text-xs font-bold uppercase tracking-[0.25em] text-neutral-500 sm:text-sm">
              Horological Excellence
            </span>
            <h2 className="mb-4 font-poppins text-[1.1rem] min-[375px]:text-xl min-[400px]:text-[1.35rem] sm:text-3xl lg:text-3xl xl:text-[2rem] text-gray-900 leading-[1.3] font-bold uppercase tracking-tighter sm:tracking-tight max-w-2xl whitespace-nowrap">
              EXPERT WATCH CARE & SERVICING
            </h2>
            <p className="mb-10 max-w-lg text-sm leading-[1.8] text-gray-600 sm:text-base">
              Our master watchmakers combine decades of heritage with state-of-the-art diagnostic technology to ensure your timepiece continues to perform with absolute precision.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                to="/repair-service"
                className="inline-flex h-[56px] items-center justify-center rounded-lg bg-black px-10 text-xs font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-neutral-800 active:scale-[0.98] shadow-lg hover:shadow-xl"
              >
                Book a Service
              </Link>
              <Link
                to="/contact"
                className="inline-flex h-[56px] items-center justify-center rounded-lg border border-neutral-200 bg-transparent px-10 text-xs font-black uppercase tracking-[0.2em] text-black transition-all hover:bg-neutral-50 active:scale-[0.98]"
              >
                Find a Boutique
              </Link>
            </div>
          </motion.div>

          {/* Image Content */}
          <motion.div
            initial={{ opacity: 0, scale: 1.05 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2 }}
            className="order-1 lg:order-2"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl md:aspect-[3/2] lg:aspect-square">
              <img
                src="https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/samay_hf_jcdhy0.png"
                alt="Expert Watch Servicing"
                className="h-full w-full object-cover grayscale-[10%] transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-neutral-900/5 transition-opacity hover:opacity-0" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
