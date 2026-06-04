import { ShieldCheck, Lock, Award, RotateCcw } from 'lucide-react'

const ITEMS = [
  {
    title: '100% Authentic Guarantee',
    description: 'Every timepiece is verified for authenticity before it reaches you.',
    icon: ShieldCheck
  },
  {
    title: 'Secure Payment',
    description: 'Industry-standard encryption and trusted payment partners.',
    icon: Lock
  },
  {
    title: 'International Warranty',
    description: 'Manufacturer warranty honored across our service network.',
    icon: Award
  },
  {
    title: '7-Day Return Policy',
    description: 'Hassle-free returns within 7 days of delivery.',
    icon: RotateCcw
  },
]

export default function AuthenticitySection() {
  return (
    <section className="bg-gray-50 py-14 sm:py-16 md:py-20" aria-labelledby="authenticity-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.32em] text-neutral-500 sm:hidden">
          Our standards
        </p>
        <h2
          id="authenticity-heading"
          className="mx-auto text-center font-poppins text-[1.05rem] min-[375px]:text-[1.1rem] min-[400px]:text-[1.2rem] font-black leading-snug tracking-normal text-neutral-900 whitespace-nowrap uppercase sm:text-2xl sm:tracking-wide md:text-3xl"
        >
          Why Shop With <span className="ml-[0.35rem] sm:ml-0">Samay Watch</span>
        </h2>

        {/* Mobile: horizontal snap rail (luxury retail pattern) */}
        <div
          className="mt-9 -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth px-4 pb-2 pt-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:hidden"
          role="list"
          aria-label="Shopping benefits"
        >
          {ITEMS.map((item) => (
            <article
              key={item.title}
              role="listitem"
              className="flex w-[min(86vw,300px)] shrink-0 snap-center flex-col border border-neutral-200/90 bg-white px-5 py-6 text-left shadow-[0_1px_0_rgba(0,0,0,0.06),0_12px_40px_-12px_rgba(0,0,0,0.12)]"
            >
              <div className="mb-4 flex size-9 items-center justify-center rounded-full border border-neutral-900/15 bg-neutral-50 text-neutral-900">
                <item.icon strokeWidth={1.5} className="size-[1.125rem]" />
              </div>
              <h3 className="text-[13px] font-semibold leading-snug tracking-wide text-neutral-900">
                {item.title}
              </h3>
              <p className="mt-2 text-[12px] leading-relaxed text-neutral-600">
                {item.description}
              </p>
            </article>
          ))}
        </div>

        {/* sm+: original grid — unchanged layout for tablet/desktop */}
        <div className="mt-8 hidden grid-cols-2 gap-10 sm:mt-12 sm:grid md:grid-cols-4 md:gap-8">
          {ITEMS.map((item) => (
            <div
              key={item.title}
              className="flex flex-col items-center px-2 text-center sm:px-2 sm:py-0"
            >
              <div className="mb-2 flex items-center justify-center text-neutral-700 sm:mb-3">
                <item.icon strokeWidth={1.5} className="size-5" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 sm:text-base">{item.title}</h3>
              <p className="mt-1 max-w-[220px] text-xs leading-snug text-gray-500 sm:mt-1 sm:max-w-none sm:text-sm">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
