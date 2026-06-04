import { useState } from 'react'
import { getDisplayBrand } from '../../utils/brandUtils'
import './MobileFilterSheet.css'

const MobileFilterSheet = ({ isOpen, onClose, brands, filters, onFilterChange, onClearFilters }) => {
  const [localFilters, setLocalFilters] = useState(filters)

  const handleApply = () => {
    onFilterChange('brand', localFilters.brand)
    onFilterChange('search', localFilters.search)
    onFilterChange('startDate', localFilters.startDate)
    onFilterChange('endDate', localFilters.endDate)
    onFilterChange('sortBy', localFilters.sortBy)
    onFilterChange('sortOrder', localFilters.sortOrder)
    onClose()
  }

  const handleClear = () => {
    setLocalFilters({ brand: '', search: '', startDate: '', endDate: '', sortBy: 'createdAt', sortOrder: 'desc' })
    onClearFilters()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="mobile-filter-overlay" onClick={onClose}>
      <div className="mobile-filter-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-filter-header">
          <h2>Filters</h2>
          <button className="mobile-filter-close" onClick={onClose}>×</button>
        </div>

        <div className="mobile-filter-content">
          <div className="mobile-filter-section">
            <label className="mobile-filter-label">Search</label>
            <input
              type="text"
              className="mobile-filter-input"
              placeholder="Search products..."
              value={localFilters.search}
              onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value })}
            />
          </div>

          <div className="mobile-filter-section">
            <label className="mobile-filter-label">Brand</label>
            <select
              className="mobile-filter-select"
              value={localFilters.brand}
              onChange={(e) => setLocalFilters({ ...localFilters, brand: e.target.value })}
            >
              <option value="">All Brands</option>
              {brands
                .filter(Boolean)
                .filter(b => b.trim().length)
                .map((brand) => (
                  <option key={brand} value={brand}>
                    {getDisplayBrand(brand)}
                  </option>
                ))}
            </select>
          </div>

          <div className="mobile-filter-section">
            <label className="mobile-filter-label">Sort By</label>
            <select
              className="mobile-filter-select"
              value={`${localFilters.sortBy}-${localFilters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-')
                setLocalFilters({ ...localFilters, sortBy, sortOrder })
              }}
            >
              <option value="createdAt-desc">Newest Added First</option>
              <option value="createdAt-asc">Oldest Added First</option>
              <option value="title-asc">Title: A to Z</option>
              <option value="title-desc">Title: Z to A</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="inventory-asc">Inventory: Low to High</option>
              <option value="inventory-desc">Inventory: High to Low</option>
            </select>
          </div>

          <div className="mobile-filter-section">
            <label className="mobile-filter-label">Added Date Range</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="date"
                className="mobile-filter-input"
                style={{ flex: 1, minHeight: '38px' }}
                value={localFilters.startDate || ''}
                onChange={(e) => setLocalFilters({ ...localFilters, startDate: e.target.value })}
              />
              <span style={{ fontSize: '13px', color: '#64748b' }}>to</span>
              <input
                type="date"
                className="mobile-filter-input"
                style={{ flex: 1, minHeight: '38px' }}
                value={localFilters.endDate || ''}
                onChange={(e) => setLocalFilters({ ...localFilters, endDate: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="mobile-filter-actions">
          <button className="mobile-filter-btn clear" onClick={handleClear}>
            Clear All
          </button>
          <button className="mobile-filter-btn apply" onClick={handleApply}>
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  )
}

export default MobileFilterSheet

