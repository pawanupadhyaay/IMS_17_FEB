import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Facebook, 
  Instagram, 
  Mail, 
  Phone, 
  MapPin, 
  ArrowUpRight,
} from 'lucide-react'

const QUICK_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'All Products', href: '/all-products' },
  { label: 'About Us', href: '/about-us' },
  { label: 'Repair & Service', href: '/repair-service' },
  { label: 'Our Presence', href: '/our-presence' },
  { label: 'Contact Us', href: '/contact' },
]

const CATEGORIES = [
  { label: 'Luxury Brands', href: '/all-products?brandCategory=luxury' },
  { label: 'Fashion Brands', href: '/all-products?brandCategory=fashion' },
  { label: 'New Arrivals', href: '/all-products?sortBy=newest' },
  { label: 'Featured Deals', href: '/all-products?sortBy=price-low' },
]

const POLICIES = [
  { label: 'Return & Refund Policy', href: '/policies/return-refund-policy' },
  { label: 'Shipping Policy', href: '/policies/shipping-policy' },
  { label: 'Privacy Policy', href: '/policies/privacy-policy' },
  { label: 'Terms & Conditions', href: '/policies/terms-conditions' },
]

const CONTACT_INFO = {
  address: "Shop No.5, New Market, Bara Gole Chakkar, Kamla Nagar, New Delhi-110007",
  phone: "+91 8595513656",
  email: "rajesh@samaywatch.com",
  facebook: "https://www.facebook.com/profile.php?id=100064182931844&rdid=TIUff6188AATcome&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F19UF7V3Qcc%2F#",
  instagram: "https://www.instagram.com/samaywatch?igsh=MTBnNTlvZnQwaHlrdA%3D%3D"
}

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const FooterHeading = ({ children }) => (
    <h3 className="mb-4 font-serif text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">
      {children}
    </h3>
  )

  const FooterLink = ({ label, href, isExternal = false }) => {
    const Component = isExternal ? 'a' : Link
    const props = isExternal ? { href, target: "_blank", rel: "noopener noreferrer" } : { to: href }

    return (
      <li className="group">
        <Component 
          {...props}
          className="inline-flex items-center text-[12px] font-medium text-neutral-400 transition-colors hover:text-white"
        >
          {label}
          <motion.span
            className="ml-1 opacity-0 transition-opacity group-hover:opacity-100"
            initial={{ x: -2 }}
            whileHover={{ x: 0 }}
          >
            <ArrowUpRight className="size-3 text-gold" />
          </motion.span>
        </Component>
      </li>
    )
  }

  return (
    <footer className="w-full bg-[#121417] pt-10 sm:pt-14 border-t border-black">
      <div className="mx-auto max-w-7xl px-5 pb-8 sm:px-6 md:px-8">
        
        {/* Main Grid: Desktop-4col, Mobile-2col */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-2 md:grid-cols-4 md:gap-12">
          
          {/* Col 1: QUICK LINKS */}
          <div>
            <FooterHeading>Boutique</FooterHeading>
            <ul className="space-y-4">
              {QUICK_LINKS.map(link => (
                <FooterLink key={link.label} {...link} />
              ))}
            </ul>
          </div>

          {/* Col 2: CATEGORIES */}
          <div>
            <FooterHeading>Collections</FooterHeading>
            <ul className="space-y-4">
              {CATEGORIES.map(link => (
                <FooterLink key={link.label} {...link} />
              ))}
            </ul>
          </div>

          {/* Col 3: POLICIES */}
          <div>
            <FooterHeading>Customer Care</FooterHeading>
            <ul className="space-y-4">
              {POLICIES.map(link => (
                <FooterLink key={link.label} {...link} />
              ))}
            </ul>
          </div>

          {/* Col 4: CONNECT / LOCATION */}
          <div className="col-span-2 md:col-span-1">
            <FooterHeading>Visit Us</FooterHeading>
            <div className="space-y-5">
              <div className="group flex gap-3">
                <MapPin className="mt-1 size-3.5 shrink-0 text-gold" strokeWidth={1.5} />
                <p className="text-[12px] leading-relaxed text-neutral-400 group-hover:text-white transition-colors">
                  {CONTACT_INFO.address}
                </p>
              </div>
              
              <div className="space-y-2">
                <a 
                  href={`tel:${CONTACT_INFO.phone}`}
                  className="flex items-center gap-3 text-[12px] text-neutral-400 hover:text-white transition-colors"
                >
                  <Phone className="size-3.5 text-gold" strokeWidth={1.5} />
                  {CONTACT_INFO.phone}
                </a>
                <p className="pl-6.5 text-[10px] text-neutral-500 font-medium">Tue-Sun, 11:00 AM to 8:00 PM (Mon Off)</p>
                <a 
                  href={`mailto:${CONTACT_INFO.email}`}
                  className="flex items-center gap-3 text-[12px] text-neutral-400 hover:text-white transition-colors"
                >
                  <Mail className="size-3.5 text-gold" strokeWidth={1.5} />
                  {CONTACT_INFO.email}
                </a>
              </div>

              {/* Socials */}
              <div className="flex gap-4 pt-3">
                <motion.a
                  href={CONTACT_INFO.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-sm transition-all hover:bg-gold hover:text-white hover:border-gold text-neutral-300"
                  whileHover={{ y: -4 }}
                >
                  <Facebook className="size-4" fill="currentColor" strokeWidth={0} />
                </motion.a>
                <motion.a
                  href={CONTACT_INFO.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-sm transition-all hover:bg-gold hover:text-white hover:border-gold text-neutral-300"
                  whileHover={{ y: -4 }}
                >
                  <Instagram className="size-4" strokeWidth={2} />
                </motion.a>
              </div>
            </div>
          </div>

        </div>

        {/* Brand Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:mt-16 sm:flex-row sm:gap-6">
          <div className="flex items-center gap-2 text-neutral-500">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] hover:text-white transition-colors">© {currentYear} Samay Watch</span>
            <span className="text-white/20" aria-hidden>|</span>
            <span className="text-[10px] font-medium uppercase tracking-widest hover:text-white transition-colors">Heritage Since 1969</span>
          </div>

          <a
            href="https://www.instagram.com/omrie.digital/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-500 transition-colors hover:text-gold"
          >
            Powered by <span className="font-bold text-neutral-400">Omrie Digital</span>
          </a>
        </div>
      </div>
    </footer>
  )
}

