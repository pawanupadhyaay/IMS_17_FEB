import { useEffect } from 'react'
import { updatePageSEO } from '../utils/seoHelper'
import { motion } from 'framer-motion'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import InquiryForm from '../components/common/InquiryForm'

const BOUTIQUE_MAPS_URL = 'https://maps.app.goo.gl/nc9QXKu4GpgLVTFN7'
const BOUTIQUE_MAP_EMBED_URL = 'https://maps.google.com/maps?q=Samay+Luxury+Boutique,+Kamla+Nagar,+New+Delhi&ll=28.6804013,77.2039204&z=17&output=embed'

export default function ContactUs() {
    useEffect(() => {
        updatePageSEO({
            title: 'Contact Us & Location | Samay Watch Boutique New Delhi',
            description: 'Get in touch with Samay Watch Boutique in Kamla Nagar, New Delhi. Reach us via phone, WhatsApp, email, or visit our luxury showroom for expert consultations.',
            keywords: 'contact samay watch, watch showroom location, Kamla Nagar watch shop, New Delhi watch showroom, watch experts consultation',
            ogImage: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&q=80&w=2000'
        });
    }, []);

    return (
        <div className="bg-white">
            {/* Hero Section */}
            <section className="relative h-[50vh] w-full overflow-hidden bg-black">
                <div className="absolute inset-0 opacity-40">
                    <img
                        src="https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&q=80&w=2000"
                        alt="Contact Us"
                        className="h-full w-full object-cover grayscale-[20%]"
                    />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

                <div className="relative mx-auto flex h-full max-w-7xl flex-col items-center justify-center px-8 text-center text-white">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <span className="mb-4 block text-xs font-black uppercase tracking-[0.4em] text-gold">Get in touch</span>
                        <h1 className="mb-6 font-serif text-5xl font-black tracking-tight text-white md:text-6xl">
                            Contact Us
                        </h1>
                        <p className="mx-auto max-w-2xl text-lg font-medium text-neutral-300">
                            We are here to assist you with any inquiries regarding our collections, boutique appointments, or after-sales service.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Info & Map Section */}
            <section className="mx-auto max-w-7xl px-8 py-24">
                <div className="grid gap-16 lg:grid-cols-[1fr_1.5fr]">

                    {/* Contact Details */}
                    <div className="flex flex-col justify-center space-y-12">
                        <div>
                            <h2 className="mb-4 font-serif text-3xl font-bold text-black">Samay Watch Boutique</h2>
                            <div className="mb-8 h-1 w-16 bg-gold" />
                            <p className="text-neutral-500 leading-relaxed">
                                Visit our flagship boutique to experience our curated collection of luxury timepieces in person. Our watch experts are ready to provide you with personalized consultation.
                            </p>
                        </div>

                        <div className="space-y-8">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-50 text-gold">
                                    <MapPin className="size-5" />
                                </div>
                                <div>
                                    <h4 className="mb-1 font-bold text-black">Location</h4>
                                    <p className="text-sm text-neutral-500">Shop No.5, New Market,<br />Bara Gole Chakkar, Kamla Nagar,<br />New Delhi-110007</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-50 text-gold">
                                    <Phone className="size-5" />
                                </div>
                                <div>
                                    <h4 className="mb-1 font-bold text-black">Phone & WhatsApp</h4>
                                    <p className="text-sm text-neutral-500">+91 8595513656<br />Tue-Sun, 11:00 AM to 8:00 PM</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-50 text-gold">
                                    <Mail className="size-5" />
                                </div>
                                <div>
                                    <h4 className="mb-1 font-bold text-black">Email</h4>
                                    <p className="text-sm text-neutral-500">rajesh@samaywatch.com</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-50 text-gold">
                                    <Clock className="size-5" />
                                </div>
                                <div>
                                    <h4 className="mb-1 font-bold text-black">Store Hours</h4>
                                    <p className="text-sm text-neutral-500">11:00 AM - 8:00 PM<br />Tuesday to Sunday (Monday Off)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Map Embed */}
                    <button
                        type="button"
                        onClick={() => window.open(BOUTIQUE_MAPS_URL, '_blank', 'noopener,noreferrer')}
                        className="group h-[600px] w-full cursor-pointer overflow-hidden rounded-2xl border border-neutral-100 bg-neutral-50 text-left shadow-xl"
                        aria-label="Open Samay Luxury Boutique in Google Maps"
                    >
                        <iframe
                            src={BOUTIQUE_MAP_EMBED_URL}
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen=""
                            loading="lazy"
                            title="Samay Luxury Boutique Location"
                            referrerPolicy="no-referrer-when-downgrade"
                            className="pointer-events-none"
                        />
                    </button>
                </div>
            </section>

            {/* Inquiry Form CTA */}
            <section className="bg-neutral-50 py-24 px-8">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="mb-6 font-serif text-3xl font-bold text-black uppercase tracking-tight">Send an Inquiry</h2>
                    <p className="mb-10 text-neutral-500">Fill out our digital form and a dedicated representative will get back to you within 24 hours.</p>

                    <div className="bg-white p-8 md:p-12 rounded-2xl shadow-premium border border-neutral-100">
                        <InquiryForm source="contact_page" />
                    </div>
                </div>
            </section>
        </div>
    )
}
