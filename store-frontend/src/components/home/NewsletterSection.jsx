import { useState } from 'react'

export default function NewsletterSection() {
  const [email, setEmail] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    // TODO: wire to API or analytics
  }

  return (
    <section
      className="border-t border-gray-100 bg-white py-14 sm:py-20 md:py-24"
      aria-labelledby="newsletter-heading"
    >
      <div className="mx-auto max-w-xl px-4 sm:px-6 text-center">
        <h2
          id="newsletter-heading"
          className="text-[22px] sm:text-2xl font-poppins font-black tracking-tight text-gray-900"
        >
          Stay Updated
        </h2>
        <p className="mt-2 sm:mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
          Receive exclusive previews and new arrivals.
        </p>
        <p className="mt-3 text-[11px] text-gray-500 leading-snug md:hidden">
          We respect your inbox — unsubscribe anytime.
        </p>
        <form onSubmit={handleSubmit} className="mt-5 sm:mt-8 flex flex-col gap-3 sm:flex-row sm:gap-0">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            className="w-full min-h-[50px] rounded-full border border-gray-200/90 bg-neutral-50/50 px-5 py-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-inner focus:border-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200 sm:rounded-r-none sm:border-r-0 sm:shadow-none sm:focus:ring-1 sm:bg-white sm:pr-4"
            aria-label="Email address"
          />
          <button
            type="submit"
            className="min-h-[50px] rounded-full border border-neutral-900 bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800 active:scale-[0.98] sm:rounded-l-none"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  )
}
