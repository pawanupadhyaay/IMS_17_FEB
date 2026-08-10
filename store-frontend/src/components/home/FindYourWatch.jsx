import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import InquiryForm from '../common/InquiryForm'

export default function FindYourWatch() {
    return (
        <section id="find-your-watch" className="bg-black py-16 sm:py-24 md:py-32 text-white overflow-hidden relative">
            {/* Subtle luxury glow background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#d4af37]/10 blur-[120px] pointer-events-none"></div>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
                <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] items-center">
                    
                    {/* Visual & Context Text */}
                    <div className="space-y-6 text-left">
                        <span className="text-xs font-black uppercase tracking-[0.4em] text-[#d4af37]">Custom Procurement</span>
                        <h2 className="font-serif text-4xl sm:text-5xl font-normal leading-tight text-white uppercase tracking-tight">
                            Find Your Watch
                        </h2>
                        <div className="h-1 w-16 bg-[#d4af37]" />
                        <p className="text-sm sm:text-base text-neutral-400 leading-relaxed font-medium">
                            Can't find the exact model or brand of timepiece you are looking for? Our boutique concierge network operates globally to source rare, limited-edition, or premium luxury watches.
                        </p>
                        <p className="text-sm sm:text-base text-neutral-400 leading-relaxed font-medium">
                            Submit a query with the watch details, brand name, reference number, or description of the timepiece. We will raise a sourcing ticket and contact you with procurement details.
                        </p>
                        
                        <div className="pt-6 flex items-center gap-4 text-neutral-500">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 border border-neutral-800 text-[#d4af37] shadow-sm">
                                <Search className="size-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-sm">Global Sourcing Concierge</h4>
                                <p className="text-xs text-neutral-500 mt-0.5">Response within 24-48 business hours</p>
                            </div>
                        </div>
                    </div>

                    {/* Sourcing Form Container */}
                    <div className="bg-white text-neutral-900 p-6 sm:p-10 rounded-3xl border border-neutral-100 shadow-2xl relative">
                        <div className="mb-6">
                            <h3 className="font-serif text-xl sm:text-2xl font-bold text-black">Request Sourcing</h3>
                            <p className="text-xs text-neutral-400 mt-1 font-medium">Provide details of the watch you wish to source.</p>
                        </div>
                        <InquiryForm 
                            source="find-your-watch"
                            type="ticket"
                            messageLabel="Watch Details (Brand, Model, Ref #, etc.)"
                            defaultMessage=""
                        />
                    </div>

                </div>
            </div>
        </section>
    )
}
