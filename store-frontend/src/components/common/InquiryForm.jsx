import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, CheckCircle2 } from 'lucide-react'
import axios from 'axios'
import { toast } from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function InquiryForm({ defaultMessage = '', source = 'contact', messageLabel = 'Message / Inquiry' }) {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        mobile: '',
        message: defaultMessage
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    useEffect(() => {
        if (defaultMessage) {
            setFormData(prev => ({ ...prev, message: defaultMessage }))
        }
    }, [defaultMessage])

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!formData.firstName || !formData.email || !formData.mobile || !formData.message) {
            toast.error("Please fill in all mandatory fields", {
                style: { background: '#000', color: '#fff', fontSize: '12px' }
            })
            return
        }

        setIsSubmitting(true)
        try {
            const response = await axios.post(`${API_BASE}/api/store/queries`, {
                ...formData,
                source // Optional: to track where the query came from
            })
            if (response.data.success) {
                setIsSuccess(true)
                toast.success("Inquiry submitted successfully", {
                    icon: '✉️',
                    style: { background: '#000', color: '#fff', fontSize: '12px' }
                })
                setFormData({ firstName: '', lastName: '', email: '', mobile: '', message: defaultMessage })
            }
        } catch (error) {
            console.error("Submission Error:", error)
            toast.error(error.response?.data?.message || "Failed to submit inquiry. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isSuccess) {
        return (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-8 md:p-12 rounded-2xl border border-neutral-100 flex flex-col items-center gap-4 shadow-sm text-center"
            >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                    <CheckCircle2 className="size-10 text-green-500" />
                </div>
                <h3 className="text-2xl font-serif font-black text-black">Thank You!</h3>
                <p className="text-neutral-500 max-w-md mx-auto font-medium">Your inquiry has been received. Our concierge team will contact you shortly.</p>
                <button 
                    onClick={() => setIsSuccess(false)}
                    className="mt-4 text-xs font-black uppercase tracking-widest text-gold hover:text-black transition-colors"
                >
                    Send another message
                </button>
            </motion.div>
        )
    }

    return (
        <form className="space-y-6 text-left" onSubmit={handleSubmit}>
            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400">First Name</label>
                    <input 
                        type="text" 
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-neutral-200 p-3.5 text-sm font-medium focus:border-black transition-all outline-none bg-white" 
                        placeholder="John" 
                        required
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400">Last Name</label>
                    <input 
                        type="text" 
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-neutral-200 p-3.5 text-sm font-medium focus:border-black transition-all outline-none bg-white" 
                        placeholder="Doe" 
                    />
                </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400">Email Address</label>
                    <input 
                        type="email" 
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-neutral-200 p-3.5 text-sm font-medium focus:border-black transition-all outline-none bg-white" 
                        placeholder="john@example.com" 
                        required
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400">Mobile Number</label>
                    <input 
                        type="tel" 
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-neutral-200 p-3.5 text-sm font-medium focus:border-black transition-all outline-none bg-white" 
                        placeholder="+91 XXXXX XXXXX" 
                        required
                    />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400">{messageLabel}</label>
                <textarea 
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows="4" 
                    className="w-full rounded-lg border border-neutral-200 p-3.5 text-sm font-medium focus:border-black transition-all outline-none bg-white" 
                    placeholder="How can we help you?"
                    required
                ></textarea>
            </div>
            <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full h-[56px] rounded-lg text-xs font-black uppercase tracking-[0.3em] text-white transition-all shadow-xl hover:shadow-2xl flex items-center justify-center gap-3 bg-black hover:bg-neutral-900 active:scale-[0.98] disabled:bg-neutral-600 disabled:cursor-not-allowed"
            >
                {isSubmitting ? "Processing..." : (
                    <>
                        <Send className="size-4" />
                        Submit Inquiry
                    </>
                )}
            </button>
        </form>
    )
}
