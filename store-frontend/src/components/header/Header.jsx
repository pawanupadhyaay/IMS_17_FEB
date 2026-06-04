import { useState, useEffect } from 'react'
import TopStrip from './TopStrip'
import MainHeader from './MainHeader'
import NavBar from './NavBar'

export default function Header() {
  const [isSticky, setIsSticky] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 120) {
        setIsSticky(true)
      } else {
        setIsSticky(false)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className="w-full">
      <TopStrip />
      <MainHeader />
      <div
        id="main-nav"
        className={`
          w-full transition-all duration-300
          ${isSticky ? 'fixed top-0 left-0 right-0 shadow-sm z-[100] bg-white' : 'relative bg-white'}
        `}
      >
        <NavBar />
      </div>
      {isSticky && <div className="h-[70px]" aria-hidden="true" />}
    </header>
  )
}
