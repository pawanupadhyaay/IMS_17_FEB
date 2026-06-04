import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { updatePageSEO } from '../utils/seoHelper'
import { motion } from 'framer-motion'
import { Award, Shield, Clock, Users } from 'lucide-react'

const HERO_IMAGE = '/images/about-banner-new.png'

/** Composite overlap artwork (single asset with rounded panels) */
const ABOUT_STORY_IMAGE = '/images/about-story-watches.png'

const JOURNEY = [
  {
    year: '1969',
    title: 'The beginning',
    description:
      'Visionary Sangat Ram Kathpal began a small venture with a simple belief: timepieces deserve honesty, care, and enduring quality. That spirit still guides every Samay Watch boutique and showroom today.',
  },
  {
    year: '1980s–90s',
    title: 'Earning trust',
    description:
      'Through meticulous service and curated collections, the name grew beyond a single counter—becoming synonymous with authentic watches and knowledgeable guidance for families and collectors alike.',
  },
  {
    year: '2006',
    title: 'Flagship presence',
    description:
      'The first dedicated boutique opened in Guwahati, Assam, setting a new standard for how luxury and fashion watch brands could be experienced in India—with warmth, expertise, and authorised peace of mind.',
  },
  {
    year: '2010',
    title: 'National footprint',
    description:
      'Expansion across major metros brought the Samay experience closer to enthusiasts nationwide—always with the same promise: genuine products, manufacturer warranty, and service you can rely on.',
  },
  {
    year: '2015',
    title: 'Digital showroom',
    description:
      'A refined online presence extended the in-store experience—detailed guidance, secure fulfilment, and the same curated assortment, wherever you choose to discover your next watch.',
  },
  {
    year: '2020',
    title: 'Global partnerships',
    description:
      'Deepened relationships with leading maisons and maisons-to-watch strengthened our portfolio—so you can explore icons and newcomers alike under one trusted roof.',
  },
  {
    year: 'Today',
    title: 'The journey continues',
    description:
      'SAMAY means “time” in Hindi—and we still measure success in decades of loyalty, not headlines. Whether you visit us in person or online, we are here to help you choose a timepiece worthy of your story.',
  },
]

/** Set to true to show the brand grid again (desktop + mobile). */
const SHOW_BRAND_ECOSYSTEM = false

const BRANDS = [
  'ARMANI EXCHANGE', 'BOSS', 'BERING', 'CITIZEN', 'CASIO', 'CALVIN KLEIN',
  'DIESEL', 'EMPORIO ARMANI', 'FOSSIL', 'FURLA', 'GARMIN', 'GUESS',
  'LONGINES', 'MOVADO', 'MICHAEL KORS', 'NAUTICA', 'RADO', 'SEIKO',
  'TISSOT', 'TIMEX', 'VERSACE',
]

export default function AboutUs() {
  useEffect(() => {
    updatePageSEO({
      title: 'Our Heritage & Story | Samay Watch',
      description: 'Discover the heritage of Samay Watch since 1969. Committed to premium craftsmanship, absolute integrity, and expert watch retail in India.',
      keywords: 'about samay watch, watch showroom history, Sangat Ram Kathpal, luxury watch heritage, Rajesh Kathpal',
      ogImage: 'https://i.ibb.co/2XHCWRL/samay-logo.png'
    });
  }, []);

  return (
    <div className="bg-white">
      {/* Breadcrumb */}
      <nav
        className="border-b border-neutral-100 bg-white"
        aria-label="Breadcrumb"
      >
        <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6 md:px-8">
          <ol className="flex items-center gap-2 text-[11px] font-medium tracking-wide text-neutral-500 sm:text-xs">
            <li>
              <Link to="/" className="transition-colors hover:text-neutral-900">
                Home
              </Link>
            </li>
            <li aria-hidden className="text-neutral-300">
              /
            </li>
            <li className="text-neutral-900">About</li>
          </ol>
        </div>
      </nav>

      {/* 1 — Banner */}
      <section className="relative h-[min(65vh,480px)] w-full overflow-hidden sm:h-[min(58vh,560px)] md:h-[min(62vh,640px)]">
        <img
          src={HERO_IMAGE}
          alt="Samay Watch Showroom"
          className="absolute inset-0 size-full object-cover object-[85%_15%] sm:object-[center_35%]"
        />
        <div className="absolute inset-0 bg-neutral-900/35 sm:bg-neutral-900/55" aria-hidden />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/20"
          aria-hidden
        />

        <div className="relative mx-auto flex h-full max-w-7xl items-center justify-center px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center text-white"
          >
            <p className="mb-6 text-[10px] font-semibold uppercase tracking-[0.35em] text-white sm:text-xs sm:tracking-[0.4em]">
              About Samay Watches
            </p>
            <h1 className="font-serif text-[2rem] font-normal leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3.25rem]">
              Who we are
            </h1>
          </motion.div>
        </div>
      </section>

      {/* 2 — About copy + overlapping images */}
      <section className="py-14 sm:py-20 md:py-24" aria-labelledby="about-story-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16 lg:gap-x-20">
            <div className="order-1">
              <div className="mx-auto w-full max-w-xl lg:mx-0 lg:max-w-none">
                <img
                  src={ABOUT_STORY_IMAGE}
                  alt="Samay Watch — curated chronograph and minimalist timepieces"
                  className="w-full object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.12)]"
                  decoding="async"
                />
              </div>
            </div>

            <div className="order-2">
              <h2
                id="about-story-heading"
                className="font-serif text-2xl font-normal tracking-tight text-neutral-900 sm:text-3xl md:text-[2.25rem]"
              >
                About us
              </h2>
              <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-neutral-600 sm:text-base md:leading-[1.75]">
                <p>
                  In the year <strong className="font-semibold text-neutral-800">1969</strong>,
                  visionary <strong className="font-semibold text-neutral-800">Sangat Ram Kathpal</strong>{' '}
                  began a small venture, which has now become a trusted name in the world of timepieces
                  and accessories across India.
                </p>
                <p>
                  What started as a humble counter grew into a family-led commitment to{' '}
                  <strong className="font-semibold text-neutral-800">craftsmanship</strong>,{' '}
                  <strong className="font-semibold text-neutral-800">integrity</strong>, and long-term
                  relationships with collectors and first-time buyers alike.
                </p>
                <p>
                  <strong className="font-semibold text-neutral-800">SAMAY</strong> means{' '}
                  <em className="not-italic text-neutral-700">“time”</em> in Hindi—a reminder that every
                  watch we offer is part of a larger story: yours, measured in moments that matter.
                </p>
                <p>
                  Today, Samay Watch brings together authorised global brands, expert guidance, and
                  after-sales care so you can choose with confidence—whether you step into our boutique
                  or explore our digital showroom.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 — Year-wise journey */}
      <section
        className="border-t border-neutral-200/80 bg-[#fafafa] py-16 sm:py-20 md:py-28"
        aria-labelledby="journey-heading"
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 md:max-w-4xl md:px-8 lg:max-w-5xl">
          <div className="mx-auto mb-12 max-w-xl text-center md:mb-16">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-500">
              Heritage
            </p>
            <h2
              id="journey-heading"
              className="font-serif text-[1.65rem] font-normal leading-snug tracking-tight text-neutral-900 sm:text-3xl md:text-[2rem]"
            >
              Samay Watch through the years
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600 md:text-base">
              From 1969 to today—a timeline shaped by people who love watches as much as you do.
            </p>
          </div>

          {/* Mobile: stacked cards with left rail */}
          <div className="md:hidden">
            <ul className="relative space-y-0 pl-2">
              <div
                className="absolute left-[11px] top-2 bottom-2 w-px bg-neutral-200"
                aria-hidden
              />
              {JOURNEY.map((item, idx) => (
                <li key={`${item.year}-${idx}`} className="relative pb-10 pl-8 last:pb-0">
                  <span
                    className="absolute left-0 top-1.5 flex size-[22px] items-center justify-center rounded-full border-2 border-white bg-neutral-900 shadow-sm ring-2 ring-neutral-100"
                    aria-hidden
                  />
                  <p className="font-serif text-2xl font-normal tabular-nums text-neutral-900">
                    {item.year}
                  </p>
                  <h3 className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                    {item.title}
                  </h3>
                  <p className="mt-3 rounded-xl border border-neutral-200/90 bg-white p-4 text-[13px] leading-relaxed text-neutral-600 shadow-sm">
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Desktop: alternating timeline */}
          <ul className="relative hidden md:block">
            <div
              className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-neutral-200"
              aria-hidden
            />
            {JOURNEY.map((item, idx) => {
              const isLeft = idx % 2 === 0
              return (
                <motion.li
                  key={`${item.year}-${idx}`}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.45, delay: Math.min(idx * 0.05, 0.35) }}
                  className="relative grid grid-cols-2 gap-8 pb-16 last:pb-4"
                >
                  <div
                    className={`${isLeft ? 'pr-12 text-right' : 'col-start-2 pl-12 text-left'}`}
                  >
                    <div
                      className={`inline-block max-w-md text-left ${isLeft ? 'ml-auto' : ''}`}
                    >
                      <p className="font-serif text-3xl font-normal tabular-nums text-neutral-900 lg:text-4xl">
                        {item.year}
                      </p>
                      <h3 className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                        {item.title}
                      </h3>
                      <p className="mt-4 text-sm leading-relaxed text-neutral-600 lg:text-[15px] lg:leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <div
                    className="absolute left-1/2 top-2 z-10 flex size-4 -translate-x-1/2 items-center justify-center rounded-full border-4 border-[#fafafa] bg-neutral-900 shadow-sm"
                    aria-hidden
                  />
                  <div className={isLeft ? 'col-start-2' : 'col-start-1 row-start-1'} aria-hidden />
                </motion.li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* Founder's Note */}
      <section className="py-16 px-4 sm:px-8 md:py-24">
        <div className="mx-auto max-w-5xl rounded-2xl border border-neutral-200 bg-neutral-900 p-8 text-white shadow-xl sm:p-12 md:rounded-3xl md:p-20">
          <div className="grid gap-10 md:grid-cols-[1fr_2fr] md:items-center md:gap-12">
            <div className="text-center md:text-left">
              <div className="mx-auto mb-6 flex h-36 w-36 overflow-hidden rounded-full border-2 border-neutral-600 bg-neutral-800 md:mx-0 md:h-40 md:w-40">
                <div className="flex h-full w-full items-center justify-center text-neutral-500">
                  <Users className="size-14 md:size-16" strokeWidth={1.25} />
                </div>
              </div>
              <h3 className="font-serif text-xl font-normal text-white md:text-2xl">Rajesh Kathpal</h3>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                Founder &amp; CEO
              </p>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute -top-6 left-0 font-serif text-7xl leading-none text-white/[0.07] md:-top-10 md:text-8xl">
                &ldquo;
              </span>
              <div className="space-y-4 text-[15px] font-normal italic leading-relaxed text-neutral-300 md:text-lg">
                <p>
                  I am overwhelmed by the love and support that Samay Watch has received from all of you.
                  Since 1969, with your unwavering trust, we have become one of India&apos;s leading
                  destinations for international timepieces.
                </p>
                <p>
                  My team and I have always strived to provide you with the best and will continue to do so.
                  Our goal is to be the ideal destination to obtain authentic branded watches at the best
                  price—whether online or in-store.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {SHOW_BRAND_ECOSYSTEM && (
        <section className="border-t border-neutral-100 bg-white py-16 px-4 sm:px-8 md:py-24">
          <div className="mx-auto max-w-7xl text-center">
            <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-500 md:text-xs">
              Our brand ecosystem
            </h2>
            <p className="mb-12 text-sm text-neutral-600 md:mb-16 md:text-base">
              Authorised retailers for the world&apos;s most respected watchmakers
            </p>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-7">
              {BRANDS.map((brand) => (
                <div
                  key={brand}
                  className="flex min-h-[52px] items-center justify-center border border-neutral-200 bg-neutral-50/50 px-2 py-3 transition-colors hover:border-neutral-300 hover:bg-white md:min-h-0 md:py-4"
                >
                  <span className="text-[9px] font-semibold tracking-tight text-neutral-500 sm:text-[10px] md:tracking-tighter">
                    {brand}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Values */}
      <section className="border-t border-neutral-100 bg-[#fafafa] py-16 px-4 sm:px-8 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-8 md:gap-y-8">
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm">
                <Award className="size-7 text-neutral-800" strokeWidth={1.5} />
              </div>
              <h4 className="mb-2 text-sm font-semibold text-neutral-900">Authenticity</h4>
              <p className="text-sm leading-relaxed text-neutral-600">
                100% genuine products with official warranties.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm">
                <Shield className="size-7 text-neutral-800" strokeWidth={1.5} />
              </div>
              <h4 className="mb-2 text-sm font-semibold text-neutral-900">Trust</h4>
              <p className="text-sm leading-relaxed text-neutral-600">
                Decades of excellence in watch retail and service.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm">
                <Clock className="size-7 text-neutral-800" strokeWidth={1.5} />
              </div>
              <h4 className="mb-2 text-sm font-semibold text-neutral-900">Heritage</h4>
              <p className="text-sm leading-relaxed text-neutral-600">
                A legacy of quality timepieces for every generation.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm">
                <Users className="size-7 text-neutral-800" strokeWidth={1.5} />
              </div>
              <h4 className="mb-2 text-sm font-semibold text-neutral-900">Service</h4>
              <p className="text-sm leading-relaxed text-neutral-600">
                Expert care and professional watch servicing.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
