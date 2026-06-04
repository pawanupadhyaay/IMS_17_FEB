import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'

/**
 * Dynamic filter accordion: checkboxes per option, optional count, selected count in title.
 * Props:
 *   filterKey - param key (e.g. 'brand')
 *   title - display label (e.g. 'Brand')
 *   options - [{ value: string, count?: number }]
 *   selectedValues - string[] (current selection from URL)
 *   onToggle - (value: string) => void
 *   defaultOpen - boolean
 */
export default function FilterSection({
  filterKey,
  title,
  options = [],
  selectedValues = [],
  onToggle,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen)
  const selectedCount = selectedValues.length

  return (
    <div className="border-b border-neutral-200">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-4 text-left font-serif text-sm text-neutral-800 transition-colors hover:text-neutral-900"
        aria-expanded={open}
      >
        <span>
          {title}
          {selectedCount > 0 && (
            <span className="ml-1.5 text-neutral-500">({selectedCount})</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-neutral-500 transition-transform duration-200',
            open && 'rotate-180'
          )}
          aria-hidden
        />
      </button>
      <div
        className={cn(
          'grid transition-all duration-300 ease-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="pb-4 pt-0">
            {options.length === 0 ? (
              <p className="text-xs text-neutral-400">No options</p>
            ) : (
              <ul className="space-y-2">
                {options.map((opt) => {
                  const val = opt.value?.trim()
                  if (val === '') return null
                  const isChecked = selectedValues.includes(val)
                  return (
                    <li key={val}>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700 hover:text-neutral-900">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggle(val)}
                          className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400"
                        />
                        <span className="flex-1">{val}</span>
                        {opt.count != null && (
                          <span className="text-xs text-neutral-400">
                            ({opt.count})
                          </span>
                        )}
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
