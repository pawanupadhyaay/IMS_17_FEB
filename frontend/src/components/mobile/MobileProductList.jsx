import { memo } from 'react'
import MobileProductCard from './MobileProductCard'
import './MobileProductList.css'

const MobileProductList = memo(({ products, onView, onEdit, onMoreClick, loading, selectedIds, onSelectionChange, page = 1, limit = 10 }) => {
  if (loading && products.length === 0) {
    return (
      <div className="mobile-product-list-loading">
        <div className="loading-spinner"></div>
        <div>Loading products...</div>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="mobile-product-list-empty">
        <div className="empty-icon">📦</div>
        <div className="empty-message">No products found</div>
      </div>
    )
  }

  const isAllSelected = products.length > 0 && products.every(p => selectedIds?.has(p._id))

  return (
    <div className="mobile-product-list">
      <div className="mobile-list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem', borderBottom: '1px solid #eee', backgroundColor: '#f9f9f9', marginBottom: '0.5rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={isAllSelected}
            onChange={(e) => {
              const newSelectedIds = new Set(selectedIds || [])
              if (e.target.checked) {
                products.forEach(p => newSelectedIds.add(p._id))
              } else {
                products.forEach(p => newSelectedIds.delete(p._id))
              }
              onSelectionChange?.(newSelectedIds)
            }}
            style={{ width: '18px', height: '18px' }}
          />
          Select All
        </label>
        <span style={{ fontSize: '0.8rem', color: '#666' }}>{products.length} items</span>
      </div>

      {products.map((product, index) => {
        const serial = (page - 1) * limit + index + 1
        return (
        <MobileProductCard
          key={product._id}
          product={product}
          serial={serial}
          onView={onView}
          onEdit={onEdit}
          onMoreClick={onMoreClick}
          isSelected={selectedIds?.has(product._id) || false}
          onSelectionChange={(checked) => {
            const newSelectedIds = new Set(selectedIds || [])
            if (checked) {
              newSelectedIds.add(product._id)
            } else {
              newSelectedIds.delete(product._id)
            }
            onSelectionChange?.(newSelectedIds)
          }}
        />
      )})}
    </div>
  )
})

MobileProductList.displayName = 'MobileProductList'

export default MobileProductList

