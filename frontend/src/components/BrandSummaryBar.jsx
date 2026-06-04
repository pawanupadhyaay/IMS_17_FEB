import { useMemo } from 'react'
import { getDisplayBrand } from '../utils/brandUtils'
import './BrandSummaryBar.css'

const BrandSummaryBar = ({ selectedBrand, brandStats, hasActiveFilters, onClearFilters }) => {
  // Only show when hasActiveFilters is active
  if (!hasActiveFilters) {
    return null
  }

  // Use stats provided by backend or safe defaults
  const summary = {
    totalProducts: brandStats?.totalProducts || 0,
    totalInventory: brandStats?.totalInventory || 0,
    totalValue: brandStats?.totalValue || 0,
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value)
  }

  const displayBrand = selectedBrand ? getDisplayBrand(selectedBrand) : "Filtered Catalog Summary"

  return (
    <div className="brand-summary">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div className="brand-title" style={{ margin: 0 }}>{displayBrand}</div>
        {onClearFilters && (
          <button 
            onClick={onClearFilters}
            className="clear-all-pill"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '700',
              color: '#ffffff',
              backgroundColor: '#dc3545',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 4px rgba(220, 53, 69, 0.2)',
              transition: 'background-color 0.2s',
            }}
            type="button"
            onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Clear All
          </button>
        )}
      </div>
      <div className="brand-metrics">
        <div className="metric">
          <span className="metric-value">{summary.totalProducts}</span>
          <span className="metric-label">Products</span>
        </div>
        <div className="metric">
          <span className="metric-value">{summary.totalInventory.toLocaleString()}</span>
          <span className="metric-label">Inventory</span>
        </div>
        <div className="metric">
          <span className="metric-value">{formatCurrency(summary.totalValue)}</span>
          <span className="metric-label">Value</span>
        </div>
      </div>
    </div>
  )
}

export default BrandSummaryBar


