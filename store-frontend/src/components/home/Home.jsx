import { useState, useEffect } from 'react'
import { updatePageSEO } from '../../utils/seoHelper'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import HeroSlider from "../hero/HeroSlider"
import AnnouncementStrip from "../hero/AnnouncementStrip"
import MostLovedBrands from "./MostLovedBrands"
import NewArrivals from "./NewArrivals"
import CraftsmanshipSection from "./CraftsmanshipSection"
import AuthenticitySection from "./AuthenticitySection"
import FeaturedCollection from "./FeaturedCollection"
import ServiceSection from "./ServiceSection"
import TestimonialsSection from "./TestimonialsSection"
import NewsletterSection from "./NewsletterSection"
import SocialMediaSection from "./SocialMediaSection"

const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }
  }
}

const sectionVariantsReduced = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35 } },
}

const sectionVariantsMobile = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

function useIsNarrowViewport() {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767.98px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767.98px)')
    const apply = () => setNarrow(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return narrow
}

function RevealSection({ children }) {
  const reduceMotion = useReducedMotion()
  const narrow = useIsNarrowViewport()
  const variants = reduceMotion
    ? sectionVariantsReduced
    : narrow
      ? sectionVariantsMobile
      : sectionVariants

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: reduceMotion ? '0px' : '-100px' }}
      variants={variants}
    >
      {children}
    </motion.div>
  )
}

const BLOG_ITEMS = [
  {
    title: "Watch(ING) Our Journey",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
    date: "FEB | 04 | 2025"
  },
  {
    title: "Explore A Diverse Array Of...",
    image: "https://images.unsplash.com/photo-1547996160-81dfa63595aa",
    date: "FEB | 04 | 2025"
  },
  {
    title: "Elegance For Every Glance",
    image: "https://images.unsplash.com/photo-1508057198894-247b23fe5ade",
    date: "FEB | 04 | 2025"
  }
]

function LatestBlogSection() {
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await (import('../../services/blogService')).then(m => m.default.getBlogs())
        if (res.success) {
          // Take only latest 3 live blogs
          const liveBlogs = res.data
            .filter(b => b.status === 'Live')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 3)
          setBlogs(liveBlogs)
        }
      } catch (err) {
        console.error('Failed to fetch home blogs:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchBlogs()
  }, [])

  if (loading) return null;
  if (blogs.length === 0) return null;

  return (
    <section className="bg-[#f4f3ef] py-14 sm:py-16 md:py-28" aria-labelledby="latest-blog-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-9 text-center md:mb-16 sm:mb-10">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.38em] text-neutral-500 md:hidden">
            Journal
          </p>
          <h2
            id="latest-blog-heading"
            className="mx-auto mb-3 max-w-[14rem] font-poppins text-[1.65rem] font-black leading-tight tracking-tight text-black sm:mb-4 sm:max-w-none sm:text-3xl md:text-4xl uppercase"
          >
            Latest Blog
          </h2>
          <p className="mx-auto max-w-[19rem] text-[13px] leading-relaxed text-neutral-500 sm:max-w-md sm:text-base sm:text-gray-600">
            Subscribe for latest news and blog updates from our editor.
          </p>
        </div>

        {/* Mobile: horizontal snap rail */}
        <div
          className="-mx-4 mb-1 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth px-4 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:hidden"
          role="list"
          aria-label="Blog posts"
        >
          {blogs.map((blog) => (
            <article
              key={`m-${blog._id}`}
              role="listitem"
              className="flex w-[min(88vw,320px)] shrink-0 snap-center flex-col border border-neutral-200/80 bg-white shadow-[0_1px_0_rgba(0,0,0,0.04),0_16px_48px_-16px_rgba(0,0,0,0.12)]"
            >
              <Link to={`/blog/${blog.slug}`} className="relative aspect-[5/4] w-full overflow-hidden bg-neutral-100">
                <img
                  src={blog.coverImage}
                  alt={blog.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </Link>
              <div className="flex flex-col px-5 pb-6 pt-5 text-left">
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-neutral-500">
                  {new Date(blog.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).replace(',', ' |').toUpperCase()}
                </p>
                <p className="mt-3 flex items-center gap-2 text-[11px] tracking-wide text-neutral-400">
                  <span className="h-px w-8 bg-neutral-300" aria-hidden />
                  Editorial
                </p>
                <h3 className="mt-3 font-poppins text-[1.125rem] font-black leading-snug tracking-tight text-black uppercase line-clamp-2 min-h-[3rem]">
                  {blog.title}
                </h3>
                <Link
                  to={`/blog/${blog.slug}`}
                  className="mt-5 inline-flex min-h-[44px] w-fit items-center justify-center border border-neutral-900 bg-transparent px-6 py-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-900 transition-colors duration-300 hover:bg-neutral-900 hover:text-white active:opacity-90"
                >
                  More details
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* sm+: 3-column grid */}
        <div className="hidden grid-cols-1 gap-6 sm:grid sm:gap-10 md:grid-cols-3 md:gap-14">
          {blogs.map((blog) => (
            <article
              key={blog._id}
              className="group rounded-2xl border border-gray-200/80 bg-white/90 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.06)] md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none"
            >
              <Link to={`/blog/${blog.slug}`} className="relative block h-[220px] overflow-hidden rounded-xl sm:h-[320px] md:h-[420px] md:rounded-xl">
                <img
                  src={blog.coverImage}
                  alt={blog.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute left-3 top-3 bg-white/95 px-3 py-1.5 text-[10px] font-medium tracking-widest shadow-sm backdrop-blur-sm rounded-md sm:left-6 sm:top-6 md:px-5 md:py-2 md:text-xs">
                  {new Date(blog.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}
                </div>
              </Link>

              <div className="mt-4 px-1 md:mt-6 md:px-0">
                <div className="mb-2 flex items-center gap-2 text-[11px] text-gray-500 md:mb-4 md:text-sm">
                  <span className="h-px w-6 bg-gray-300 sm:hidden" aria-hidden />
                  <span>By {blog.author || 'Store Owner'}</span>
                </div>
                <h3 className="mb-3 font-poppins text-lg font-black leading-snug text-black transition group-hover:text-black sm:text-xl md:mb-5 md:text-[28px] uppercase line-clamp-2">
                  {blog.title}
                </h3>
                <Link
                  to={`/blog/${blog.slug}`}
                  className="inline-flex min-h-[44px] items-center rounded-sm border border-neutral-900 bg-neutral-900 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition duration-300 hover:bg-neutral-800 hover:border-neutral-800 active:opacity-90 md:text-sm"
                >
                  More Details
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  useEffect(() => {
    updatePageSEO({
      title: 'Samay Watch | Premium Hand-Crafted Luxury Watch Store',
      description: 'Discover Samay Watch, the ultimate online destination for certified premium & luxury watches. Engineered with premium craftsmanship and absolute authenticity.',
      keywords: 'luxury watches, premium timepieces, buy watches online, authentic watches, Samay Watch, branded watches',
      ogImage: 'https://i.ibb.co/2XHCWRL/samay-logo.png',
      ogType: 'website'
    });
  }, []);

  return (
    <div className="space-y-12 sm:space-y-14 md:space-y-16">
      <section className="mx-auto w-full max-w-7xl px-0 sm:px-4 md:px-8">
        <div className="overflow-hidden rounded-none sm:rounded-b-xl">
          <HeroSlider />
          <AnnouncementStrip />
        </div>
      </section>
      <RevealSection><MostLovedBrands /></RevealSection>
      <RevealSection><NewArrivals /></RevealSection>
      <RevealSection><CraftsmanshipSection /></RevealSection>
      <RevealSection><AuthenticitySection /></RevealSection>
      <RevealSection><FeaturedCollection /></RevealSection>
      <RevealSection><ServiceSection /></RevealSection>
      <RevealSection><TestimonialsSection /></RevealSection>
      <RevealSection><LatestBlogSection /></RevealSection>
      <RevealSection><SocialMediaSection /></RevealSection>
      <RevealSection><NewsletterSection /></RevealSection>
    </div>
  )
}
