import { Link } from 'react-router-dom'

const IMAGE_URL = 'https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/samay_hf2_bjzxdp.png'

export default function FeaturedCollection() {
  return (
    <section
      className="w-full bg-gradient-to-b from-neutral-950 to-black py-16 sm:py-20 md:from-black md:to-black md:py-28"
      aria-labelledby="featured-collection-heading"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 sm:gap-12 px-4 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-16">
        <div className="flex-1 text-center md:text-left order-2 md:order-1">
          <p className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.25em] text-neutral-500 md:text-neutral-400">
            Curated
          </p>
          <h2
            id="featured-collection-heading"
            className="mt-3 sm:mt-4 font-poppins text-[26px] sm:text-3xl md:text-5xl lg:text-6xl text-white font-black leading-[1.15] tracking-tight uppercase"
          >
            Limited Edition Collection
          </h2>
          <p className="mt-3 sm:mt-5 mx-auto md:mx-0 max-w-md text-sm sm:text-base text-neutral-300 md:text-neutral-400 leading-relaxed">
            Crafted for collectors who value distinction.
          </p>
          <Link
            to="/all-products"
            className="mt-6 sm:mt-8 inline-flex w-full max-w-xs md:max-w-none mx-auto md:mx-0 min-h-[50px] items-center justify-center border border-neutral-400 bg-transparent px-6 py-3.5 sm:px-8 sm:py-4 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-neutral-100 transition-all duration-500 hover:bg-neutral-200 hover:border-neutral-200 hover:text-neutral-900 active:scale-[0.98] md:w-auto"
          >
            Discover Now
          </Link>
        </div>
        <div className="flex-1 w-full max-w-lg overflow-hidden rounded-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.4)] order-1 md:order-2 sm:rounded-lg md:border-white/10 md:shadow-none">
          <img
            src={IMAGE_URL}
            alt="Limited edition timepiece"
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      </div>
    </section>
  )
}
