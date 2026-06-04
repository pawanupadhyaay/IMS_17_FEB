import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Truck, RefreshCw, Lock } from 'lucide-react'

const POLICY_DATA = {
  'privacy-policy': {
    title: 'Privacy Policy',
    icon: Lock,
    content: (
      <div className="space-y-6">
        <p>Your privacy is important to us. This Privacy Policy explains how Samay Watch collects, uses, and protects your personal information.</p>
        <section>
          <h3 className="text-lg font-bold text-neutral-900 mb-3">Information Collection</h3>
          <p>We collect information you provide directly, such as when you create an account, make a purchase, or contact us for support.</p>
        </section>
        <section>
          <h3 className="text-lg font-bold text-neutral-900 mb-3">Data Security</h3>
          <p>We implement industry-standard security measures to protect your data from unauthorized access or disclosure.</p>
        </section>
      </div>
    )
  },
  'terms-conditions': {
    title: 'Terms & Conditions',
    icon: ShieldCheck,
    content: (
      <div className="space-y-6">
        <p>By using the Samay Watch website, you agree to comply with the following terms and conditions.</p>
        <section>
          <h3 className="text-lg font-bold text-neutral-900 mb-3">User Obligations</h3>
          <p>Users must provide accurate information and respect intellectual property rights when using our services.</p>
        </section>
        <section>
          <h3 className="text-lg font-bold text-neutral-900 mb-3">Limitation of Liability</h3>
          <p>Samay Watch is not liable for indirect or consequential damages arising from the use of our website or products.</p>
        </section>
      </div>
    )
  },
  'return-refund-policy': {
    title: 'Return & Refund Policy',
    icon: RefreshCw,
    content: (
      <div className="space-y-8">
        <p className="text-lg font-medium text-neutral-800 leading-relaxed">
          At Samay Watch, we are committed to providing you with the highest quality timepieces and a seamless boutique experience. 
          Our refund and exchange policies for online orders are outlined below to ensure complete transparency.
        </p>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">01</span>
             Order Cancellation
          </h3>
          <p>
            To initiate a cancellation, please submit a request by contacting us at <a href="mailto:rajesh@samaywatch.com" className="font-bold text-black underline underline-offset-4">rajesh@samaywatch.com</a> with your order details (Order Confirmation Number and Reference).
          </p>
          <div className="p-4 bg-neutral-50 border-l-4 border-black rounded-r-xl">
             <p className="text-[13px] font-bold uppercase tracking-wider text-black">Cancellation Window</p>
             <p className="mt-1">Orders can only be cancelled or exchanged within <strong>12 hours</strong> of placement.</p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">02</span>
             Refunds & Exchanges
          </h3>
          <p>
            Upon approval of a valid cancellation request, <span className="font-bold">www.samaywatch.com</span> will refund the full purchase amount within <strong>2 business days</strong> to the original payment source.
          </p>
          <p>
            In case of an exchange, any price difference for the new timepiece must be paid by the customer. If a cancellation is requested after shipment, our support team will guide you through the standard exchange process.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">03</span>
             Manufacturing Defects
          </h3>
          <p>
            If a delivered watch exhibits a manufacturing defect, please report it immediately to <a href="mailto:rajesh@samaywatch.com" className="font-bold text-black underline underline-offset-4">rajesh@samaywatch.com</a> or call us at <a href="tel:+918595513656" className="font-bold text-black underline underline-offset-4">+91 8595513656</a> within <strong>24 hours of delivery</strong>.
          </p>
          <div className="rounded-2xl border border-red-100 bg-red-50/30 p-5">
             <p className="text-[13px] font-bold text-red-900 uppercase tracking-widest leading-relaxed">
               Strict Limit: Samay Watch cannot be held responsible for defects reported after the 24-hour window. No refunds or exchanges will be processed after this period.
             </p>
          </div>
        </section>

        <section className="pt-8 border-t border-neutral-100">
           <p className="text-[12px] font-medium text-neutral-400 italic">
             All legal matters are subject to the exclusive jurisdiction of Delhi.
           </p>
        </section>
      </div>
    )
  },
  'shipping-policy': {
    title: 'Shipping Policy',
    icon: Truck,
    content: (
      <div className="space-y-6">
        <p>We provide secure and insured shipping for all our timepieces across India.</p>
        <section>
          <h3 className="text-lg font-bold text-neutral-900 mb-3">Delivery Times</h3>
          <p>Standard delivery typically takes 3-5 business days for major metros and 5-7 days for other locations.</p>
        </section>
        <section>
          <h3 className="text-lg font-bold text-neutral-900 mb-3">Tracking</h3>
          <p>A tracking number will be provided via email once your order has been dispatched.</p>
        </section>
      </div>
    )
  }
}

export default function Policies() {
  const { type } = useParams()
  const policy = POLICY_DATA[type] || POLICY_DATA['privacy-policy']
  const Icon = policy.icon

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [type])

  return (
    <div className="bg-white min-h-screen">
      {/* Breadcrumb */}
      <nav className="border-b border-neutral-100 bg-white" aria-label="Breadcrumb">
        <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6 md:px-8">
          <ol className="flex items-center gap-2 text-[11px] font-medium tracking-wide text-neutral-500 sm:text-xs">
            <li><Link to="/" className="hover:text-neutral-900 transition-colors">Home</Link></li>
            <li aria-hidden className="text-neutral-300">/</li>
            <li className="text-neutral-900">Policies</li>
            <li aria-hidden className="text-neutral-300">/</li>
            <li className="text-neutral-900 italic capitalize">{type?.replace(/-/g, ' ')}</li>
          </ol>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 md:px-8">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
            <Icon className="size-8 text-neutral-900" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-normal text-neutral-900">{policy.title}</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold mt-1">Last updated: April 2026</p>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-neutral max-w-none text-neutral-600 leading-relaxed"
        >
          {policy.content}
        </motion.div>

        <div className="mt-20 p-8 bg-neutral-900 rounded-3xl text-white">
          <h2 className="font-serif text-2xl font-normal mb-4">Have questions?</h2>
          <p className="text-neutral-400 text-sm mb-6">If you need clarification on any of our policies, our team is here to help.</p>
          <Link 
            to="/contact" 
            className="inline-flex h-12 items-center justify-center bg-white text-black px-8 rounded-full text-[12px] font-bold uppercase tracking-widest transition-transform hover:scale-105"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}
