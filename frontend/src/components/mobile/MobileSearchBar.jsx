import { useState } from 'react'
import './MobileSearchBar.css'

const MobileSearchBar = ({ value, onChange, onFilterClick, hasActiveFilters }) => {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <div className={`mobile-search-bar ${isFocused ? 'focused' : ''}`}>
      <div className="mobile-search-input-wrapper">
        <span className="mobile-search-icon">🔍</span>
        <input
          type="text"
          className="mobile-search-input"
          placeholder="Search products..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </div>
      <button
        className="mobile-filter-btn"
        onClick={onFilterClick}
        aria-label="Open filters"
        style={{ position: 'relative' }}
      >
        <span className="filter-icon">⚙️</span>
        {hasActiveFilters && (
          <span 
            className="filter-active-dot" 
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '8px',
              height: '8px',
              backgroundColor: '#dc3545',
              borderRadius: '50%',
              border: '2px solid #ffffff'
            }}
          />
        )}
      </button>
    </div>
  )
}

export default MobileSearchBar


