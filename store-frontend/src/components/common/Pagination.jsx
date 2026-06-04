import { cn } from '../../utils/cn'

/**
 * Builds pagination items: page numbers and ellipsis where there are gaps.
 * Always includes: first, last, current, one before/after current.
 * Near start: 1, 2, 3, 4, ..., last. Near end: 1, ..., last-3..last.
 * Max 7 numeric buttons; ellipsis for gaps.
 */
function buildPaginationItems(currentPage, totalPages) {
  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1])
  if (currentPage <= 4) {
    ;[2, 3, 4].forEach((p) => p <= totalPages && pages.add(p))
  }
  if (currentPage >= totalPages - 3) {
    ;[totalPages - 3, totalPages - 2, totalPages - 1].forEach((p) => p >= 1 && pages.add(p))
  }
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)

  const items = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) items.push({ type: 'ellipsis' })
    items.push({ type: 'page', value: sorted[i] })
  }
  return items
}

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 0) return null

  const items = buildPaginationItems(currentPage, totalPages)
  const buttonClass =
    'flex h-9 w-9 items-center justify-center rounded-full text-sm transition duration-300'

  return (
    <nav
      className="flex items-center justify-center gap-2"
      aria-label="Pagination"
    >
      <button
        type="button"
        onClick={() => onPageChange?.(currentPage - 1)}
        disabled={currentPage <= 1}
        className={cn(
          buttonClass,
          currentPage > 1
            ? 'border border-neutral-300 text-neutral-700 hover:bg-neutral-100'
            : 'cursor-not-allowed border border-neutral-300 text-neutral-400 opacity-40 hover:bg-transparent'
        )}
        aria-label="Previous page"
      >
        &lt;
      </button>

      {items.map((item, idx) =>
        item.type === 'ellipsis' ? (
          <span
            key={`ellipsis-${idx}`}
            className="flex h-9 w-9 cursor-default items-center justify-center text-neutral-400"
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={item.value}
            type="button"
            onClick={() => onPageChange?.(item.value)}
            className={cn(
              buttonClass,
              currentPage === item.value
                ? 'bg-black text-white'
                : 'border border-neutral-300 text-neutral-700 hover:bg-neutral-100'
            )}
            aria-current={currentPage === item.value ? 'page' : undefined}
          >
            {item.value}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange?.(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={cn(
          buttonClass,
          currentPage < totalPages
            ? 'border border-neutral-300 text-neutral-700 hover:bg-neutral-100'
            : 'cursor-not-allowed border border-neutral-300 text-neutral-400 opacity-40 hover:bg-transparent'
        )}
        aria-label="Next page"
      >
        &gt;
      </button>
    </nav>
  )
}
