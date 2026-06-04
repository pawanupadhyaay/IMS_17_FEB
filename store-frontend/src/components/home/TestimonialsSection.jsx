import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination } from 'swiper/modules'
import { useReducedMotion } from 'framer-motion'
import 'swiper/css'
import 'swiper/css/pagination'

const TESTIMONIALS = [
  {
    quote:
      'The Tissot arrived exactly as described—papers, box, and condition were flawless. Samay Watch made buying a serious timepiece online feel effortless and trustworthy.',
    name: 'Rahul Mehta',
    detail: 'Mumbai · Verified purchase',
  },
  {
    quote:
      'I compared three authorised sellers before choosing Samay. Their team knew movements, warranty, and servicing inside out. This is how a watch boutique should feel.',
    name: 'Ananya Krishnan',
    detail: 'Bengaluru · Collector',
  },
  {
    quote:
      'From sizing advice to secure delivery, every step was calm and professional. My Rado has been on my wrist daily since—could not be happier with the experience.',
    name: 'Vikram Singh',
    detail: 'New Delhi · First luxury watch',
  },
]

function QuoteMark({ className = '' }) {
  return (
    <span className={`font-serif text-[2.75rem] leading-none text-neutral-200 md:text-[3.25rem] ${className}`} aria-hidden>
      “
    </span>
  )
}

function TestimonialCard({ item, figureClassName = '' }) {
  return (
    <figure
      className={`flex h-full min-h-[260px] flex-col border border-neutral-200/90 bg-white p-6 shadow-[0_1px_0_rgba(0,0,0,0.04),0_20px_50px_-24px_rgba(0,0,0,0.12)] sm:min-h-0 sm:p-7 md:min-h-0 md:p-8 ${figureClassName}`}
    >
      <QuoteMark className="mb-1 block" />
      <blockquote className="flex-1">
        <p className="font-serif text-[15px] font-normal leading-relaxed text-neutral-700 md:text-base md:leading-relaxed">
          {item.quote}
        </p>
      </blockquote>
      <figcaption className="mt-6 border-t border-neutral-100 pt-5">
        <p className="text-sm font-semibold tracking-wide text-neutral-900">{item.name}</p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
          {item.detail}
        </p>
      </figcaption>
    </figure>
  )
}

export default function TestimonialsSection() {
  const reduceMotion = useReducedMotion()

  const desktopFigureClass =
    'md:transition-[transform,box-shadow,border-color] md:duration-500 md:ease-out md:group-hover:-translate-y-2 md:group-hover:border-neutral-400/80 md:group-hover:shadow-[0_28px_70px_-20px_rgba(0,0,0,0.22)]'

  return (
    <section
      className="border-t border-neutral-200/80 bg-[#fafafa] py-14 sm:py-16 md:py-24"
      aria-labelledby="testimonials-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-neutral-500">
            Testimonials
          </p>
          <h2
            id="testimonials-heading"
            className="font-poppins text-[1.5rem] font-black leading-snug tracking-tight text-neutral-900 sm:text-[1.75rem] md:text-3xl"
          >
            What our collectors say
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600 md:text-base">
            Real stories from clients who chose Samay Watch for their next timepiece.
          </p>
        </div>

        {/* Mobile: premium carousel, ~4.5s auto-advance */}
        <div className="-mx-1 md:hidden">
          <Swiper
            modules={[Autoplay, Pagination]}
            loop
            speed={850}
            autoplay={
              reduceMotion
                ? false
                : {
                    delay: 4500,
                    disableOnInteraction: false,
                  }
            }
            pagination={{
              clickable: true,
              dynamicBullets: true,
            }}
            slidesPerView={1.14}
            spaceBetween={16}
            centeredSlides
            className="testimonials-swiper px-1"
          >
            {TESTIMONIALS.map((item) => (
              <SwiperSlide key={item.name} className="h-auto py-0.5">
                <TestimonialCard item={item} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* md+: three-column grid, hover lifts card */}
        <ul className="hidden gap-8 md:grid md:grid-cols-3 md:gap-8 lg:gap-10">
          {TESTIMONIALS.map((item) => (
            <li key={item.name} className="group h-full">
              <TestimonialCard item={item} figureClassName={desktopFigureClass} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
