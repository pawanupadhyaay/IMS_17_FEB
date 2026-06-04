let lockCount = 0
let savedScrollY = 0

export function lockBodyScroll() {
  if (typeof document === 'undefined') return () => {}

  const body = document.body
  const html = document.documentElement

  if (lockCount === 0) {
    savedScrollY = window.scrollY
    const scrollbarWidth = window.innerWidth - html.clientWidth

    body.dataset.scrollLocked = 'true'
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${savedScrollY}px`
    body.style.width = '100%'
    body.style.paddingRight = scrollbarWidth > 0 ? `${scrollbarWidth}px` : ''
    html.style.overflow = 'hidden'
  }

  lockCount += 1

  return () => {
    unlockBodyScroll()
  }
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return

  lockCount = Math.max(0, lockCount - 1)
  if (lockCount > 0) return

  const body = document.body
  const html = document.documentElement
  const scrollY = savedScrollY

  body.style.overflow = ''
  body.style.position = ''
  body.style.top = ''
  body.style.width = ''
  body.style.paddingRight = ''
  html.style.overflow = ''
  delete body.dataset.scrollLocked

  window.scrollTo(0, scrollY)
}

/** Reset scroll lock if overlays/modals leave body stuck (e.g. after navigation). */
export function forceUnlockBodyScroll() {
  if (typeof document === 'undefined') return

  const body = document.body
  const html = document.documentElement

  let scrollY = savedScrollY
  if (body.style.position === 'fixed' && body.style.top) {
    const parsed = parseInt(body.style.top, 10)
    if (!Number.isNaN(parsed)) scrollY = Math.abs(parsed)
  }

  lockCount = 0

  body.style.overflow = ''
  body.style.position = ''
  body.style.top = ''
  body.style.width = ''
  body.style.paddingRight = ''
  html.style.overflow = ''
  delete body.dataset.scrollLocked

  window.scrollTo(0, scrollY)
  savedScrollY = scrollY
}
