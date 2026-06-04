import { useState, useEffect } from 'react'
import { getDisplayBrand } from '../utils/brandUtils'
import './ExportModal.css'

const ExportModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  brands = [], 
  currentFilters = {},
  selectedCount = 0,
  selectedIds = new Set(),
  pagination = {}
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // 1. Export Format: shopify or simple
  const [exportType, setExportType] = useState('shopify')
  
  // 2. Export Scope: filtered, page, brand, all, or selected
  const [scope, setScope] = useState(() => {
    if (selectedCount > 0) return 'selected'
    if (currentFilters.brand) return 'brand'
    return 'filtered'
  })

  // 3. Stock Level Filter: all, moreThanOne, zero
  const [stockFilter, setStockFilter] = useState('all')

  // 4. Selected Brand (if scope is 'brand')
  const [selectedBrand, setSelectedBrand] = useState(currentFilters.brand || '')

  // Reset or adjust state when parameters change
  useEffect(() => {
    if (selectedCount > 0) {
      setScope('selected')
    } else if (currentFilters.brand) {
      setScope('brand')
      setSelectedBrand(currentFilters.brand)
    } else {
      setScope('filtered')
    }
  }, [selectedCount, currentFilters.brand])

  const handleExportClick = () => {
    const params = {
      exportType,
      stockFilter
    }

    if (scope === 'selected') {
      params.ids = Array.from(selectedIds).join(',')
    } else if (scope === 'page') {
      params.page = pagination.page || 1
      params.limit = pagination.limit || 50
      // Also pass current query search/brand to scope it to current filtered page
      if (currentFilters.brand) params.brand = currentFilters.brand
      if (currentFilters.search) params.search = currentFilters.search
    } else if (scope === 'brand') {
      params.brand = selectedBrand
      if (currentFilters.search) params.search = currentFilters.search
    } else if (scope === 'filtered') {
      if (currentFilters.brand) params.brand = currentFilters.brand
      if (currentFilters.search) params.search = currentFilters.search
    }

    onConfirm(params)
  }

  if (!isOpen) return null

  return (
    <div className="export-modal-overlay" onClick={onClose}>
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="export-modal-header">
          <div className="export-header-title-block">
            <svg className="export-modal-header-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffffff' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <h3>Export Settings</h3>
          </div>
          <button className="export-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="export-modal-content">
          
          {/* Format Section */}
          <div className="export-section">
            <h4 className="export-section-title">1. Select Format</h4>
            <div className="export-radio-group">
              <label className={`export-radio-label ${exportType === 'shopify' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="exportType" 
                  value="shopify" 
                  checked={exportType === 'shopify'}
                  onChange={() => setExportType('shopify')}
                />
                <span className="radio-content">
                  <strong>Detailed Export Sheet</strong>
                  <small>Includes product handles, vendor, tags, prices, options, variant rules, and all Shopify columns.</small>
                </span>
              </label>
              <label className={`export-radio-label ${exportType === 'website' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="exportType" 
                  value="website" 
                  checked={exportType === 'website'}
                  onChange={() => setExportType('website')}
                />
                <span className="radio-content">
                  <strong>Website Spec Sheet</strong>
                  <small>Includes exact same name columns for all watch specs (case, dial, movement, strap, shape & size) matching the product details page.</small>
                </span>
              </label>
              <label className={`export-radio-label ${exportType === 'simple' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="exportType" 
                  value="simple" 
                  checked={exportType === 'simple'}
                  onChange={() => setExportType('simple')}
                />
                <span className="radio-content">
                  <strong>Simple Stock Sheet</strong>
                  <small>Includes SKU, Price, and Current Inventory (Minimal for barcode/audit systems).</small>
                </span>
              </label>
            </div>
          </div>

          {/* Scope Section */}
          <div className="export-section">
            <h4 className="export-section-title">2. Select Scope</h4>
            <div className="export-grid-options">
              
              {selectedCount > 0 && (
                <label className={`export-scope-card ${scope === 'selected' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="scope" 
                    value="selected" 
                    checked={scope === 'selected'}
                    onChange={() => setScope('selected')}
                  />
                  <strong>Selected Only</strong>
                  <span className="badge">{selectedCount} items selected</span>
                </label>
              )}

              <label className={`export-scope-card ${scope === 'filtered' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="scope" 
                  value="filtered" 
                  checked={scope === 'filtered'}
                  onChange={() => setScope('filtered')}
                />
                <strong>Current Filters</strong>
                <small>Matching current search/category query.</small>
              </label>

              <label className={`export-scope-card ${scope === 'page' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="scope" 
                  value="page" 
                  checked={scope === 'page'}
                  onChange={() => setScope('page')}
                />
                <strong>Page Products</strong>
                <small>Only items on this page (Page {pagination.page || 1}).</small>
              </label>

              <label className={`export-scope-card ${scope === 'brand' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="scope" 
                  value="brand" 
                  checked={scope === 'brand'}
                  onChange={() => setScope('brand')}
                />
                <strong>Brand Wise</strong>
                <small>Target a specific watch brand catalog.</small>
              </label>

              <label className={`export-scope-card ${scope === 'all' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="scope" 
                  value="all" 
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                />
                <strong>All Products</strong>
                <small>Export entire inventory database.</small>
              </label>
            </div>

            {/* Dynamic Brand Select Dropdown if Scope is Brand */}
            {scope === 'brand' && (
              <div className="brand-select-dropdown-container">
                <label className="brand-select-label">Choose Brand:</label>
                <select 
                  className="brand-export-select"
                  value={selectedBrand} 
                  onChange={(e) => setSelectedBrand(e.target.value)}
                >
                  <option value="">Select a Brand</option>
                  {brands.map(b => (
                    <option key={b} value={b}>{getDisplayBrand(b)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Stock Filters Section */}
          {scope !== 'selected' && (
            <div className="export-section">
              <h4 className="export-section-title">3. Stock Levels Filter</h4>
              <div className="export-stock-filters">
                <label className={`stock-filter-pill ${stockFilter === 'all' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="stockFilter" 
                    value="all" 
                    checked={stockFilter === 'all'}
                    onChange={() => setStockFilter('all')}
                  />
                  <span>All Levels</span>
                </label>
                <label className={`stock-filter-pill ${stockFilter === 'moreThanOne' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="stockFilter" 
                    value="moreThanOne" 
                    checked={stockFilter === 'moreThanOne'}
                    onChange={() => setStockFilter('moreThanOne')}
                  />
                  <span>In Stock (Inventory &gt; 1)</span>
                </label>
                <label className={`stock-filter-pill ${stockFilter === 'zero' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="stockFilter" 
                    value="zero" 
                    checked={stockFilter === 'zero'}
                    onChange={() => setStockFilter('zero')}
                  />
                  <span>Out of Stock (Inventory = 0)</span>
                </label>
              </div>
            </div>
          )}

        </div>

        <div className="export-modal-actions">
          <button className="export-btn cancel" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="export-btn confirm" onClick={handleExportClick} type="button">
            Download CSV
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportModal
