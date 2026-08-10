import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { updatePageSEO } from '../utils/seoHelper'
import FindYourWatch from '../components/home/FindYourWatch'

export default function FindYourWatchPage() {
    useEffect(() => {
        updatePageSEO({
            title: 'Find Your Watch | Custom Watch Procurement Sourcing',
            description: 'Can\'t find a specific watch? Submit a query to Samay Watch boutique concierge. We operate globally to source rare, vintage, and luxury timepieces.',
            keywords: 'source luxury watch, custom watch inquiry, find watch online, rare watches sourcing, watch concierge service',
            ogImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30'
        });
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="bg-black min-h-screen">
            {/* Breadcrumb Navigation */}
            <nav className="border-b border-neutral-900 bg-black py-4" aria-label="Breadcrumb">
                <div className="mx-auto max-w-7xl px-4 sm:px-6">
                    <ol className="flex items-center gap-2 text-xs font-medium tracking-wide text-neutral-500">
                        <li>
                            <Link to="/" className="hover:text-white transition-colors">Home</Link>
                        </li>
                        <li aria-hidden className="text-neutral-700">/</li>
                        <li className="text-neutral-300">Find Your Watch</li>
                    </ol>
                </div>
            </nav>

            {/* Procurement Sourcing Component */}
            <FindYourWatch />
        </div>
    )
}
