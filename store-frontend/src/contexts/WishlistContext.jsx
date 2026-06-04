import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const WishlistContext = createContext()

const WISHLIST_KEY = 'ims_store_wishlist'

export function WishlistProvider({ children }) {
  const { user, openAuthModal } = useAuth()
  const [wishlistItems, setWishlistItems] = useState([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setWishlistItems(parsed)
        }
      }
    } catch (err) {
      console.error('Failed to load wishlist:', err)
    }
  }, [])

  // Persist to localStorage whenever wishlistItems change
  useEffect(() => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlistItems))
  }, [wishlistItems])

  const isInWishlist = (productId) => {
    return wishlistItems.some(item => item.productId === productId || item.key === productId)
  }

  const toggleWishlist = (product) => {
    // 1. Check if user is logged in
    if (!user) {
      openAuthModal()
      return
    }

    // 2. Perform Toggle
    const productId = product._id || product.productId
    const exists = isInWishlist(productId)

    if (exists) {
      setWishlistItems(prev => prev.filter(item => item.productId !== productId && item.key !== productId))
    } else {
      const newItem = {
        key: productId,
        productId: productId,
        slug: product.slug,
        title: product.title,
        brand: product.brand,
        price: Number(product.price) || 0,
        image: product.image?.url || product.images?.[0] || product.image || '',
      }
      setWishlistItems(prev => [...prev, newItem])
    }
  }

  const removeFromWishlist = (productId) => {
    setWishlistItems(prev => prev.filter(item => item.productId !== productId && item.key !== productId))
  }

  return (
    <WishlistContext.Provider value={{ wishlistItems, toggleWishlist, removeFromWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  )
}

export const useWishlist = () => {
  const context = useContext(WishlistContext)
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider')
  }
  return context
}
