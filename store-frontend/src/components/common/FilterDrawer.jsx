import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'
import { lockBodyScroll } from '../../utils/bodyScrollLock'

/**
 * Premium Filter & Sort Drawer — SamayWatch style
 * Props:
 *   open           - boolean
 *   onClose        - () => void
 *   filterKeys     - string[]
 *   filterLabels   - { [key]: string }
 *   filtersData    - { [key]: [{ value, count }] }
 *   selectedByKey  - { [key]: string[] }
 *   onToggle       - (filterKey, value) => void
 *   onClearAll     - () => void
 *   sortBy         - string
 *   onSortChange   - (value) => void
 *   totalProducts  - number
 */
export default function FilterDrawer({
  open,
  onClose,
  filterKeys = [],
  filterLabels = {},
  filtersData = {},
  selectedByKey = {},
  onToggle,
  onClearAll,
  sortBy,
  onSortChange,
  totalProducts = 0,
}) {
  const [activeTab, setActiveTab] = useState('filters')
  const [openSections, setOpenSections] = useState({})
  const [brandSearch, setBrandSearch] = useState('')

  const totalSelected = filterKeys.reduce((acc, k) => acc + (selectedByKey[k]?.length || 0), 0)

  function toggleSection(key) {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (!open) return undefined
    return lockBodyScroll()
  }, [open])

  const SORT_OPTIONS = [
    { value: 'alphabetically', label: 'Alphabetically, A–Z' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'newest', label: 'Newest First' },
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 bottom-0 z-[90] flex w-full max-w-[420px] flex-col bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-6 py-5">
              <div className="flex items-center gap-2">
                <span className="font-serif text-[20px] font-black text-black">
                  {activeTab === 'filters' ? 'Filters' : 'Sort By'}
                </span>
                {totalSelected > 0 && activeTab === 'filters' && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-black text-white">
                    {totalSelected}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 transition-colors hover:border-black hover:text-black"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex shrink-0 border-b border-neutral-100">
              {['filters', 'sort'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'flex-1 py-3.5 text-[11px] font-black uppercase tracking-[0.18em] transition-all',
                    activeTab === tab
                      ? 'border-b-2 border-black text-black'
                      : 'text-neutral-400 hover:text-neutral-600'
                  )}
                >
                  {tab === 'filters' ? 'Filters' : 'Sort By'}
                </button>
              ))}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto py-2">
              {/* Selected Filters Summary (Inside Drawer) */}
              {totalSelected > 0 && activeTab === 'filters' && (
                <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Active Filters</span>
                    <button 
                      onClick={onClearAll}
                      className="text-[10px] font-black uppercase tracking-widest text-gold hover:text-black transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {filterKeys.map(key => (
                      (selectedByKey[key] || []).map(val => (
                        <button
                          key={`${key}-${val}`}
                          onClick={() => onToggle(key, val)}
                          className="flex items-center gap-1.5 rounded-full bg-white border border-neutral-200 pl-2.5 pr-1.5 py-1 text-[10px] font-bold text-neutral-700 hover:border-black transition-colors"
                        >
                          {val}
                          <X className="size-3 text-neutral-400" />
                        </button>
                      ))
                    ))}
                  </div>
                </div>
              )}

              {/* Filters Tab */}
              {activeTab === 'filters' && (
                <div className="divide-y divide-neutral-100">
                  {filterKeys.map((key) => {
                    const opts = filtersData[key] || []
                    const selected = selectedByKey[key] || []
                    const isOpen = openSections[key] ?? (key === 'brand' || key === 'gender')

                    return (
                      <div key={key}>
                        <button
                          type="button"
                          onClick={() => toggleSection(key)}
                          className="flex w-full items-center justify-between px-6 py-4 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-black uppercase tracking-[0.18em] text-black">
                              {filterLabels[key] || key}
                            </span>
                            {selected.length > 0 && (
                              <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-black text-gold">
                                {selected.length}
                              </span>
                            )}
                          </div>
                          <ChevronDown
                            className={cn(
                              'size-4 text-neutral-400 transition-transform duration-200',
                              isOpen && 'rotate-180'
                            )}
                          />
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: 'easeOut' }}
                              className="overflow-hidden"
                            >
                              {key === 'brand' && opts.length > 8 && (
                                <div className="px-6 pb-3">
                                  <input 
                                    type="text" 
                                    placeholder="Search brands..." 
                                    value={brandSearch}
                                    onChange={(e) => setBrandSearch(e.target.value)}
                                    className="w-full rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 text-[11px] placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-0"
                                  />
                                </div>
                              )}
                              <div className="flex flex-wrap gap-2 px-6 pb-5">
                                {opts
                                  .filter(opt => key !== 'brand' || opt.value.toLowerCase().includes(brandSearch.toLowerCase()))
                                  .map((opt) => {
                                  const val = opt.value?.trim()
                                  if (!val) return null
                                  const checked = selected.includes(val)
                                  return (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => onToggle(key, val)}
                                      className={cn(
                                        'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-bold tracking-wide transition-all duration-200',
                                        checked
                                          ? 'border-black bg-black text-white shadow-sm'
                                          : 'border-neutral-200 bg-white text-neutral-600 hover:border-black/40 hover:text-black'
                                      )}
                                    >
                                      {val}
                                      {opt.count != null && (
                                        <span className={cn(
                                          'text-[9px]',
                                          checked ? 'text-white/70' : 'text-neutral-400'
                                        )}>
                                          ({opt.count})
                                        </span>
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Sort Tab */}
              {activeTab === 'sort' && (
                <div className="divide-y divide-neutral-100 px-2">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { onSortChange(opt.value); onClose() }}
                      className={cn(
                        'flex w-full items-center justify-between px-4 py-4 text-left transition-colors',
                        sortBy === opt.value ? 'text-black' : 'text-neutral-500 hover:text-neutral-900'
                      )}
                    >
                      <span className="text-[13px] font-semibold">{opt.label}</span>
                      {sortBy === opt.value && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black">
                          <svg className="size-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-neutral-100 bg-white px-6 py-5">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { onClearAll(); }}
                  className="flex-1 rounded-lg border-2 border-neutral-200 py-3.5 text-[11px] font-black uppercase tracking-widest text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-800"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-[2] rounded-lg bg-black py-3.5 text-[11px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-neutral-900"
                >
                  Show {totalProducts > 0 ? `${totalProducts} ` : ''}Results
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
