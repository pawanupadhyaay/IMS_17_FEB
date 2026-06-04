import { useState, useEffect } from 'react'
import { updatePageSEO } from '../utils/seoHelper'
import { motion, AnimatePresence } from 'framer-motion'
import { Wrench, ShieldCheck, Clock, Search, Droplets, Zap, Award, Microscope, ClipboardCheck, ChevronRight, ChevronDown, MessageSquare, MapPin, Phone, Mail } from 'lucide-react'
import InquiryForm from '../components/common/InquiryForm'

const SERVICES = [
    {
        title: 'Battery Replacement',
        description: 'Quick and authentic battery replacement ensuring long-lasting performance for your quartz timepieces.',
        icon: <Zap className="size-6 text-gold" />,
    },
    {
        title: 'Complete Overhaul',
        description: 'A comprehensive dismantling, cleaning, lubrication, and reassembly of the movement to factory standards.',
        icon: <Wrench className="size-6 text-gold" />,
    },
    {
        title: 'Polishing & Refinishing',
        description: 'Restore the original luster of your case and bracelet with our expert polishing services.',
        icon: <ShieldCheck className="size-6 text-gold" />,
    },
    {
        title: 'Water Resistance',
        description: 'State-of-the-art pressure testing to guarantee your watch remains protected against moisture.',
        icon: <Droplets className="size-6 text-gold" />,
    },
]

const STEPS = [
    {
        number: '01',
        title: 'Diagnosis',
        description: 'Initial inspection of the movement, case, and bracelet to identify issues.',
        icon: <Search className="size-5" />
    },
    {
        number: '02',
        title: 'Dismantling',
        description: 'The case is completely disassembled, and the movement is removed.',
        icon: <Wrench className="size-5" />
    },
    {
        number: '03',
        title: 'Cleaning',
        description: 'The movement components are cleaned in an ultrasonic bath.',
        icon: <Droplets className="size-5" />
    },
    {
        number: '04',
        title: 'Refurbishment',
        description: 'Each component is checked and replaced with original parts if needed.',
        icon: <Microscope className="size-5" />
    },
    {
        number: '05',
        title: 'Reassembly',
        description: 'The movement is meticulously reassembled and lubricated.',
        icon: <Zap className="size-5" />
    },
    {
        number: '06',
        title: 'Final Testing',
        description: 'Strict testing for precision, power reserve, and water resistance.',
        icon: <ClipboardCheck className="size-5" />
    }
]

const BRANDS = [
    'ROLEX', 'OMEGA', 'CARTIER', 'TAG HEUER', 'TISSOT', 'SEIKO', 'LONGINES', 'RADO', 'ORIS', 'BREITLING', 'PATEK PHILIPPE', 'AUDEMARS PIGUET', 'HUBLOT', 'ZENITH', 'IWC'
]

const DOOR_TO_DOOR_STEPS = [
    {
        number: '01',
        title: 'Create a Pickup Request',
        description: 'Schedule a pickup by filling out our service form below or request a call back. Our team will confirm your slot and guide you through the process.',
    },
    {
        number: '02',
        title: 'Watch Pickup from Your Doorstep',
        description: 'A trained courier partner will collect your timepiece from your residence with secure packaging and documented handover for complete peace of mind.',
    },
    {
        number: '03',
        title: 'Secure Watch Drop-off',
        description: 'Once servicing is complete, your watch is safely delivered back to your doorstep with quality checks and service documentation.',
    },
]

const SERVICE_CENTER = {
    title: 'Samay Watch Care At New Delhi',
    address: 'Shop No.5, New Market, Bara Gole Chakkar, Kamla Nagar, New Delhi - 110007',
    phones: ['+91 8595513656'],
    email: 'rajesh@samaywatch.com',
    hours: '11:00 AM - 8:00 PM, Tuesday to Sunday (Monday Off)',
    mapsUrl: 'https://maps.app.goo.gl/YQcwp4pU8pPsTKeS8',
}

const WORKSHOP_MAPS_URL = 'https://maps.app.goo.gl/fqZcNPCaJgn4t8Bk8'
const WORKSHOP_MAP_EMBED_URL = 'https://maps.google.com/maps?q=Samay+Watch+Service+Center,+Kamla+Nagar,+New+Delhi,+110007&z=17&output=embed'

const FAQS = [
    {
        question: 'How often should a luxury watch be serviced?',
        answer: 'For most mechanical timepieces, we recommend a complete service every 3 to 5 years. Quartz watches may need battery changes more frequently, along with a gasket check.'
    },
    {
        question: 'What is the typical turnaround time for repairs?',
        answer: 'Minor services like battery changes or polishing can take 2-4 days. A complete movement overhaul typically takes 4-6 weeks, as it involves rigorous precision testing.'
    },
    {
        question: 'Do you provide a warranty on your services?',
        answer: 'Yes, all complete services come with a 12 to 24-month performance warranty, covering the movement and water resistance.'
    },
    {
        question: 'Are original spare parts used for all brands?',
        answer: 'As an authorized service center, we use 100% original parts sourced directly from the manufacturers to maintain your watch\'s value and integrity.'
    }
]

export default function RepairService() {
    const [openIndex, setOpenIndex] = useState(null)
    const [dynamicBrands, setDynamicBrands] = useState([])
    const [loadingBrands, setLoadingBrands] = useState(true)

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

    useEffect(() => {
        updatePageSEO({
            title: 'Authorized Watch Repair & Service Center New Delhi | Samay Watch',
            description: 'Professional luxury watch repair & service center in Kamla Nagar, New Delhi. Expert horologists, authentic spare parts, battery change, overhaul and doorstep pickup.',
            keywords: 'watch repair New Delhi, watch service center, battery replacement watch, luxury watch repair, Rolex service New Delhi, Samay Watch repair',
            ogImage: 'https://res.cloudinary.com/dnrbahpzc/image/upload/v1777543582/ac43b6f2-ede6-4c31-9d7c-44b235b8362a_1_k6qh9b.jpg'
        });
    }, []);

    useEffect(() => {
        fetch(`${API_BASE}/api/store/brands`)
            .then(res => res.json())
            .then(json => {
                if (json?.success && Array.isArray(json.data)) {
                    // Extract names and ensure unique uppercase strings for the marquee
                    const names = json.data.map(b => b.name.toUpperCase())
                    setDynamicBrands(names)
                }
            })
            .catch(err => console.error('Failed to fetch brands:', err))
            .finally(() => setLoadingBrands(false))
    }, [])

    const toggleFaq = (index) => {
        setOpenIndex(openIndex === index ? null : index)
    }

    return (
        <div className="bg-white selection:bg-gold/30 selection:text-gold-900">
            {/* Custom Animations for Marquee */}
            <style>
                {`
                    @keyframes marquee {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                    }
                    .animate-marquee {
                        display: flex;
                        width: fit-content;
                        animation: marquee 60s linear infinite;
                    }
                    .hide-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                    .hide-scrollbar {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                `}
            </style>

            {/* Breadcrumb & Navigation Space */}
            <div className="mx-auto max-w-7xl px-6 pt-24 pb-8 md:px-12">
                <nav className="flex space-x-2 text-sm font-medium text-neutral-400">
                    <a href="/" className="hover:text-black transition-colors">Home</a>
                    <span>/</span>
                    <span className="text-neutral-900">Repair And Service</span>
                </nav>
            </div>

            {/* Premium Hero Section */}
            <section className="mx-auto max-w-5xl px-6 text-center md:px-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="space-y-8"
                >
                    <div className="space-y-4">
                        <span className="block text-[10px] font-black uppercase tracking-[0.4em] text-gold">Horological Maintenance</span>
                        <h1 className="mx-auto max-w-4xl font-poppins text-4xl font-bold normal-case leading-tight tracking-tight text-black md:text-6xl lg:text-[4.5rem]">
                            Premium Watch Care & Service Walkthrough
                        </h1>
                    </div>

                    <p className="mx-auto max-w-2xl text-base leading-relaxed text-neutral-500 md:text-lg">
                        Time is precious, and we at <span className="font-bold text-neutral-900">Samay Watch</span> understand that.
                        As the largest watch retailer in India, we guarantee the highest standards of horological upkeep.
                        We service and repair over 10+ of the world’s top luxury watch brands.
                    </p>

                    <div className="flex justify-center pt-4">
                        <button
                            className="bg-neutral-900 px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-gold hover:shadow-xl active:scale-95 md:px-10 md:text-xs"
                            onClick={() => document.getElementById('repair-form-section')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            REQUEST A CALL BACK
                        </button>
                    </div>
                </motion.div>

                {/* Hero Hero Image */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="relative mt-12 overflow-hidden rounded-[1.5rem] shadow-2xl md:mt-20 md:rounded-[2rem]"
                >
                    <img
                        src="https://res.cloudinary.com/dnrbahpzc/image/upload/v1777543582/ac43b6f2-ede6-4c31-9d7c-44b235b8362a_1_k6qh9b.jpg"
                        alt="Expert Watchmaker at work"
                        className="h-[300px] w-full object-cover md:h-[600px] lg:h-[700px]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />
                </motion.div>
            </section>

            {/* Door-to-Door Service & Location */}
            <section className="border-y border-neutral-200 bg-[#f4f3ef]">
                <div className="mx-auto max-w-7xl">
                    <div className="grid lg:grid-cols-2 lg:items-stretch">
                        {/* Left — Door-to-Door */}
                        <div className="relative flex flex-col justify-center overflow-hidden px-6 py-14 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
                            <div className="pointer-events-none absolute -left-16 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-gold/5 blur-3xl" />

                            <div className="relative">
                                <span className="mb-4 block text-[10px] font-bold uppercase tracking-[0.35em] text-gold">
                                    Door-To-Door Service
                                </span>
                                <h2 className="max-w-xl font-serif text-2xl font-normal uppercase leading-snug tracking-wide text-neutral-900 sm:text-[1.75rem] md:text-3xl">
                                    Watch Repair Pickup &amp; Delivery Service
                                </h2>
                                <p className="mt-4 max-w-lg text-sm leading-relaxed text-neutral-600 sm:text-[15px]">
                                    From request to return — a seamless, secure experience designed for your convenience.
                                </p>

                                <div className="relative mt-10 space-y-5 pl-1 sm:mt-12">
                                    <div className="absolute bottom-6 left-[15px] top-6 w-px bg-neutral-300" />

                                    {DOOR_TO_DOOR_STEPS.map((step, idx) => (
                                        <div key={step.number}>
                                            <div className="relative rounded-xl border border-neutral-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
                                                <div className="absolute -left-1 top-6 flex size-8 items-center justify-center rounded-full border border-neutral-200 bg-white font-serif text-[11px] font-bold text-gold shadow-sm sm:-left-1">
                                                    {step.number}
                                                </div>
                                                <div className="pl-7 sm:pl-8">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-neutral-400">
                                                        Step {step.number}
                                                    </p>
                                                    <h3 className="mt-1.5 font-serif text-lg uppercase leading-snug text-neutral-900 sm:text-xl">
                                                        {step.title}
                                                    </h3>
                                                    <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                                                        {step.description}
                                                    </p>
                                                </div>
                                            </div>

                                            {idx < DOOR_TO_DOOR_STEPS.length - 1 && (
                                                <div className="relative z-10 flex justify-start py-1 pl-[11px]">
                                                    <ChevronDown className="size-4 text-red-500" strokeWidth={2.5} />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={() => document.getElementById('repair-form-section')?.scrollIntoView({ behavior: 'smooth' })}
                                        className="inline-flex min-h-[48px] flex-1 items-center justify-center bg-neutral-900 px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-gold sm:max-w-xs sm:text-[11px]"
                                    >
                                        Schedule Pickup
                                    </button>
                                    <a
                                        href="tel:+918595513656"
                                        className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 border border-neutral-300 bg-white px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-900 transition-all hover:border-neutral-900 sm:max-w-xs sm:text-[11px]"
                                    >
                                        <Phone className="size-3.5" />
                                        Call Now
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Right — Service Center */}
                        <div className="flex flex-col justify-center border-t border-neutral-200 bg-white px-6 py-14 sm:px-10 sm:py-16 lg:border-t-0 lg:border-l lg:px-14 lg:py-20">
                            <span className="mb-4 block text-[10px] font-bold uppercase tracking-[0.35em] text-gold">
                                Visit Us
                            </span>
                            <h3 className="font-serif text-2xl font-normal uppercase leading-snug text-neutral-900 sm:text-[1.75rem]">
                                {SERVICE_CENTER.title}
                            </h3>
                            <div className="mb-8 mt-4 h-px w-14 bg-gold" />
                            <p className="-mt-4 mb-8 max-w-md text-sm leading-relaxed text-neutral-500">
                                Visit our New Delhi service center for expert assessment, authentic parts, and trusted after-sales care.
                            </p>

                            <div className="space-y-5">
                                <div className="flex items-start gap-4 rounded-xl border border-neutral-100 bg-neutral-50/80 p-4 transition-colors hover:border-neutral-200">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-gold shadow-sm">
                                        <MapPin className="size-4" strokeWidth={1.75} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">Location</p>
                                        <p className="mt-1 text-sm leading-relaxed text-neutral-700">{SERVICE_CENTER.address}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 rounded-xl border border-neutral-100 bg-neutral-50/80 p-4 transition-colors hover:border-neutral-200">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-gold shadow-sm">
                                        <Phone className="size-4" strokeWidth={1.75} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">Phone</p>
                                        {SERVICE_CENTER.phones.map((phone) => (
                                            <a
                                                key={phone}
                                                href={`tel:${phone.replace(/\s/g, '')}`}
                                                className="mt-1 block text-sm font-medium text-neutral-800 transition-colors hover:text-gold"
                                            >
                                                {phone}
                                            </a>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 rounded-xl border border-neutral-100 bg-neutral-50/80 p-4 transition-colors hover:border-neutral-200">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-gold shadow-sm">
                                        <Mail className="size-4" strokeWidth={1.75} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">Email</p>
                                        <a
                                            href={`mailto:${SERVICE_CENTER.email}`}
                                            className="mt-1 block text-sm font-medium text-neutral-800 transition-colors hover:text-gold"
                                        >
                                            {SERVICE_CENTER.email}
                                        </a>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 rounded-xl border border-neutral-100 bg-neutral-50/80 p-4 transition-colors hover:border-neutral-200">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-gold shadow-sm">
                                        <Clock className="size-4" strokeWidth={1.75} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">Service Hours</p>
                                        <p className="mt-1 text-sm font-medium text-neutral-800">Tuesday – Sunday</p>
                                        <p className="text-sm text-neutral-600">11:00 AM – 8:00 PM</p>
                                        <p className="mt-1 text-xs text-neutral-500">Monday closed</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => window.open(SERVICE_CENTER.mapsUrl, '_blank', 'noopener,noreferrer')}
                                className="mt-8 inline-flex min-h-[48px] w-full items-center justify-center border border-neutral-900 bg-neutral-900 px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-gold hover:border-gold sm:w-auto sm:text-[11px]"
                            >
                                Get Directions
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* The Service Journey */}
            <section className="py-20 md:py-32">
                <div className="mx-auto max-w-7xl px-6 md:px-12">
                    <div className="mb-12 space-y-4 text-center md:mb-20">
                        <span className="block text-xs font-bold uppercase tracking-[0.3em] text-gold">The Process</span>
                        <h2 className="font-serif text-3xl font-normal text-neutral-900 md:text-5xl">The Service Journey</h2>
                        <div className="mx-auto h-px w-24 bg-gold/30" />
                    </div>

                    <div className="relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="absolute top-7 left-0 hidden h-px w-full bg-neutral-100 lg:block lg:top-[28px]" />

                        {/* Slider on Mobile, Grid on Desktop */}
                        <div className="hide-scrollbar flex snap-x snap-mandatory overflow-x-auto lg:grid lg:grid-cols-6 lg:gap-4 lg:overflow-x-visible">
                            {STEPS.map((step, idx) => (
                                <motion.div
                                    key={step.number}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                                    className="relative flex min-w-[280px] snap-center flex-col items-center space-y-6 px-4 text-center first:pl-6 last:pr-6 lg:min-w-0 lg:px-0 lg:first:pl-0 lg:last:pr-0"
                                >
                                    <div className="z-10 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-neutral-900 text-white shadow-xl">
                                        {step.icon}
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gold">{step.number}</span>
                                        <h3 className="font-serif text-xl font-medium text-neutral-900">{step.title}</h3>
                                        <p className="text-sm leading-relaxed text-neutral-500">
                                            {step.description}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Our Expertise / Services Grid */}
            <section className="bg-neutral-50 py-20 md:py-32">
                <div className="mx-auto max-w-7xl px-6 md:px-12">
                    <div className="mb-12 grid gap-8 lg:mb-20 lg:grid-cols-2 lg:items-end">
                        <div className="space-y-4">
                            <span className="block text-xs font-bold uppercase tracking-[0.3em] text-gold">Our Expertise</span>
                            <h2 className="font-serif text-2xl font-normal text-neutral-900 md:text-5xl">Mastery in Every Detail</h2>
                        </div>
                        <p className="max-w-xl text-base text-neutral-500 md:text-lg">
                            Our atelier is equipped with the latest Swiss instrumentation, allowing us to perform everything from routine maintenance to complex mechanical restorations with absolute precision.
                        </p>
                    </div>

                    {/* Slider on Mobile, Grid on Desktop */}
                    <div className="hide-scrollbar flex snap-x snap-mandatory overflow-x-auto gap-6 lg:grid lg:grid-cols-4 lg:overflow-x-visible lg:gap-8">
                        {SERVICES.map((service, idx) => (
                            <motion.div
                                key={service.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="group relative min-w-[280px] snap-center overflow-hidden rounded-3xl bg-white p-8 shadow-sm transition-all hover:-translate-y-2 hover:shadow-2xl md:p-10 lg:min-w-0"
                            >
                                <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-50 group-hover:bg-gold transition-colors">
                                    <div className="group-hover:text-white transition-colors">
                                        {service.icon}
                                    </div>
                                </div>
                                <h4 className="mb-4 font-serif text-2xl font-medium text-neutral-900 lowercase first-letter:uppercase">{service.title}</h4>
                                <p className="text-sm font-medium leading-relaxed text-neutral-500 italic">
                                    "{service.description}"
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Iconic Brands We Service - Marquee Effect */}
            <section className="py-20 md:py-32 overflow-hidden bg-white">
                <div className="mx-auto max-w-7xl px-6 md:px-12">
                    <div className="mb-12 text-center space-y-4 md:mb-16">
                        <h3 className="font-serif text-xl font-normal text-neutral-400 md:text-2xl">Trusted By The Icons</h3>
                        <div className="mx-auto h-px w-20 bg-neutral-200" />
                    </div>
                </div>

                <div className="relative flex overflow-x-hidden group">
                    <div className="animate-marquee group-hover:[animation-play-state:paused] py-4">
                        {(dynamicBrands.length > 0 ? [...dynamicBrands, ...dynamicBrands] : [...BRANDS, ...BRANDS]).map((brand, i) => (
                            <span
                                key={i}
                                className="mx-8 text-xl font-black tracking-[0.3em] text-black md:mx-12 md:text-4xl transition-all hover:text-gold"
                            >
                                {brand}
                            </span>
                        ))}
                    </div>
                    {/* Gradient Overlays for smooth edges */}
                    <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white to-transparent md:w-40" />
                    <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white to-transparent md:w-40" />
                </div>
            </section>

            {/* Frequently Asked Questions - Accordion Style */}
            <section className="bg-neutral-50 py-20 md:py-32">
                <div className="mx-auto max-w-3xl px-6 md:px-12">
                    <div className="mb-12 text-center space-y-4 md:mb-16">
                        <span className="block text-xs font-bold uppercase tracking-[0.3em] text-gold">FAQ</span>
                        <h2 className="font-serif text-3xl font-normal text-neutral-900 md:text-5xl">Service Queries</h2>
                    </div>

                    <div className="space-y-4">
                        {FAQS.map((faq, idx) => (
                            <div key={idx} className="overflow-hidden border-b border-neutral-200 last:border-0 bg-white rounded-2xl shadow-sm">
                                <button
                                    onClick={() => toggleFaq(idx)}
                                    className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-neutral-50"
                                >
                                    <span className="font-serif text-lg font-medium text-neutral-900 md:text-xl">
                                        {faq.question}
                                    </span>
                                    <motion.div
                                        animate={{ rotate: openIndex === idx ? 90 : 0 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        className="ml-4 shrink-0"
                                    >
                                        <ChevronRight className={`size-5 transition-colors ${openIndex === idx ? 'text-gold' : 'text-neutral-400'}`} />
                                    </motion.div>
                                </button>
                                <AnimatePresence initial={false}>
                                    {openIndex === idx && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <div className="px-6 pb-6 text-base text-neutral-500 leading-relaxed">
                                                {faq.answer}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Repair Inquiry Form Section */}
            <section id="repair-form-section" className="py-20 md:py-32 bg-white">
                <div className="mx-auto max-w-7xl px-6 md:px-12">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <span className="block text-xs font-bold uppercase tracking-[0.3em] text-gold">Concierge Service</span>
                                <h2 className="font-serif text-3xl font-normal text-neutral-900 md:text-5xl">Request a Call Back</h2>
                                <p className="text-lg text-neutral-500 leading-relaxed max-w-lg">
                                    Our master watchmakers and service experts are dedicated to providing you with the highest level of care.
                                    Leave your details below, and we will contact you to discuss your timepiece's requirements.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-4 group">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-50 text-gold group-hover:bg-gold group-hover:text-white transition-all">
                                        <MessageSquare className="size-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-black">Expert Consultation</h4>
                                        <p className="text-sm text-neutral-500">Direct access to our senior horologists.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 group">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-50 text-gold group-hover:bg-gold group-hover:text-white transition-all">
                                        <ShieldCheck className="size-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-black">Authentic Parts</h4>
                                        <p className="text-sm text-neutral-500">Only original components from the manufacturer.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-neutral-50 p-8 md:p-12 rounded-[2rem] shadow-premium border border-neutral-100">
                            <InquiryForm
                                source="repair_service_page"
                                defaultMessage="I would like to request a callback for Watch Repair and Service. Please contact me at your earliest convenience."
                                messageLabel="Describe your issue"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA & Location */}
            <section id="contact-section" className="pb-20 md:pb-24 px-6 md:px-12">
                <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-neutral-900 shadow-2xl md:rounded-[2.5rem]">
                    <div className="grid lg:grid-cols-2">
                        <div className="flex flex-col justify-center p-8 text-white md:p-20 space-y-8">
                            <div className="space-y-4">
                                <span className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-gold md:text-xs">
                                    <Award className="size-4" />
                                    <span>Authorized Service Center</span>
                                </span>
                                <h3 className="font-serif text-3xl font-normal md:text-5xl lg:text-6xl text-balance leading-tight text-white">Visit Our Workshop</h3>
                                <p className="max-w-md text-base text-neutral-400 font-light md:text-lg">
                                    Experience the pinnacle of watch care. Our master watchmakers are ready to restore your timepiece to its original glory.
                                </p>
                            </div>

                            <div className="space-y-6 pt-4">
                                <div className="flex items-center space-x-4 md:space-x-6">
                                    <div className="flex h-10 w-10 min-w-[40px] items-center justify-center rounded-lg bg-white/10 md:h-12 md:w-12">
                                        <Clock className="size-4 text-gold md:size-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Service Hours</p>
                                        <p className="text-base md:text-lg">Tuesday - Sunday: 11:00 AM - 08:30 PM</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-4 pt-4">
                                    <button
                                        type="button"
                                        className="group flex flex-1 min-w-[160px] items-center justify-center space-x-4 bg-gold px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-white hover:text-black md:px-8 md:py-5 md:text-xs lg:flex-none"
                                        onClick={() => window.open(WORKSHOP_MAPS_URL, '_blank', 'noopener,noreferrer')}
                                    >
                                        <span>Get Directions</span>
                                        <div className="h-px w-6 bg-white group-hover:bg-black transition-colors" />
                                    </button>
                                    <a
                                        href="tel:+918448138426"
                                        className="flex flex-1 min-w-[160px] items-center justify-center space-x-4 border border-white/20 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-white hover:text-black md:px-8 md:py-5 md:text-xs lg:flex-none"
                                    >
                                        <span>Call Now</span>
                                    </a>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => window.open(WORKSHOP_MAPS_URL, '_blank', 'noopener,noreferrer')}
                            className="group relative h-[300px] w-full cursor-pointer overflow-hidden text-left lg:h-auto"
                            aria-label="Open Samay Watch Service Center in Google Maps"
                        >
                            <iframe
                                src={WORKSHOP_MAP_EMBED_URL}
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen=""
                                loading="lazy"
                                title="Samay Watch Service Center Location"
                                referrerPolicy="no-referrer-when-downgrade"
                                className="pointer-events-none grayscale contrast-125 transition-all duration-1000 group-hover:grayscale-0"
                            />
                            <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />
                        </button>
                    </div>
                </div>
            </section>
        </div>
    )
}
