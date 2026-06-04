import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { forceUnlockBodyScroll } from '../../utils/bodyScrollLock'

export default function ScrollToTop() {
    const { pathname, search } = useLocation()

    useEffect(() => {
        forceUnlockBodyScroll()
        window.scrollTo({ top: 0, behavior: 'instant' })
    }, [pathname, search])

    return null
}
