import { useState, useMemo } from 'react'
import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebounce } from '../hooks/useDebounce'
import { useIsMobile } from '../hooks/useMediaQuery'
import { AuthContext } from '../context/AuthContext'
import { getDisplayBrand } from '../utils/brandUtils'
import { useProducts, useDeleteProduct, usePatchProduct, usePatchProductsBulk, useDeleteProductsBulk } from '../hooks/useProducts'
import { useDashboardStats } from '../hooks/useDashboard'
import { exportToCSV } from '../services/exportService'
import InventoryTable from '../components/InventoryTable'
import StatsCards from '../components/StatsCards'
import ProductModal from '../components/ProductModal'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import BulkActions from '../components/BulkActions'
import ExportModal from '../components/ExportModal'
import ImportModal from '../components/ImportModal'
import BrandSummaryBar from '../components/BrandSummaryBar'
import PaginationBar from '../components/PaginationBar'
import { DIAL_COLOR_OPTIONS, STRAP_COLOR_OPTIONS } from '../constants/productOptions'
// Mobile components
import MobileHeader from '../components/mobile/MobileHeader'
import MobileStatsBar from '../components/mobile/MobileStatsBar'
import MobileSearchBar from '../components/mobile/MobileSearchBar'
import MobileProductList from '../components/mobile/MobileProductList'
import MobileFAB from '../components/mobile/MobileFAB'
import MobileFilterSheet from '../components/mobile/MobileFilterSheet'
import MobileProductModal from '../components/mobile/MobileProductModal'
import MobileActionSheet from '../components/mobile/MobileActionSheet'
import MobileSelectionBar from '../components/mobile/MobileSelectionBar'
import MobilePagination from '../components/mobile/MobilePagination'
import './Dashboard.css'
import './MobileDashboard.css'

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [filters, setFilters] = useState({
    brand: '',
    search: '',
    page: 1,
    startDate: '',
    endDate: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showFilterSheet, setShowFilterSheet] = useState(false)
  const [modalMode, setModalMode] = useState('view') // view, edit, create
  // Mobile action sheet
  const [showActionSheet, setShowActionSheet] = useState(false)
  const [actionSheetProduct, setActionSheetProduct] = useState(null)
  // Shared delete confirmation modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteProduct, setDeleteProduct] = useState(null)
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  // Debounce search input (500ms)
  const debouncedSearch = useDebounce(filters.search, 500)

  // Build query filters
  const pageSize = isMobile ? 10 : 50
  const queryFilters = useMemo(() => ({
    page: filters.page,
    limit: pageSize,
    brand: filters.brand || undefined,
    search: debouncedSearch || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    sortBy: filters.sortBy || undefined,
    sortOrder: filters.sortOrder || undefined,
  }), [filters.page, filters.brand, debouncedSearch, filters.startDate, filters.endDate, filters.sortBy, filters.sortOrder, pageSize])

  // React Query hooks - automatic caching, background refetching
  const { data: productsData, isLoading: productsLoading } = useProducts(queryFilters)
  // Fetch all products to get complete brand list (no filters)
  const { data: allProductsData } = useProducts({ limit: 10000 })
  const { data: statsData, isLoading: statsLoading, isError: statsError, error: statsErrorObj } = useDashboardStats()
  const deleteProductMutation = useDeleteProduct()
  const patchProductMutation = usePatchProduct()
  const patchProductsBulkMutation = usePatchProductsBulk()
  const deleteProductsBulkMutation = useDeleteProductsBulk()

  // Extract data with safe defaults
  const products = productsData?.data || []
  const pagination = productsData?.pagination || { page: 1, limit: pageSize, total: 0, pages: 0 }
  const allProducts = allProductsData?.data || []

  // Build brands dynamically from products
  const brands = useMemo(() => {
    return allProducts
      .map(p => p.brand)
      .filter(Boolean)          // remove null/undefined
      .map(b => b.trim())       // remove spaces
      .filter(b => b.length)    // remove empty strings
      .filter((b, i, a) => a.indexOf(b) === i) // unique
      .sort((a, b) => a.localeCompare(b))
  }, [allProducts])
  // Always provide a stats object so KPI cards never disappear (prevents "nothing shows")
  const stats = statsData?.data || {
    totalProducts: 0,
    totalStock: 0,
    totalStoreValue: 0,
    outOfStockCount: 0,
  }
  if (statsError) {
    console.error('Dashboard stats failed:', statsErrorObj)
  }

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      if (prev[key] === value) return prev
      return {
        ...prev,
        [key]: value,
        page: 1, // Reset to first page on filter change
      }
    })
  }

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLoadMore = () => {
    if (pagination.page < pagination.pages) {
      handlePageChange(pagination.page + 1)
    }
  }

  const handleClearFilters = () => {
    setFilters({
      brand: '',
      search: '',
      page: 1,
      startDate: '',
      endDate: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })
  }

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.brand ||
      filters.search ||
      filters.startDate ||
      filters.endDate ||
      filters.sortBy !== 'createdAt' ||
      filters.sortOrder !== 'desc'
    )
  }, [filters.brand, filters.search, filters.startDate, filters.endDate, filters.sortBy, filters.sortOrder])

  const isOwner = user?.role?.toLowerCase() === 'owner'
  const canEditSeo = isOwner || user?.canEditSeo !== false

  // Extract unique dialColors and strapColors dynamically from all products in the database
  const dynamicDialColors = useMemo(() => {
    const defaultSet = new Set(DIAL_COLOR_OPTIONS.map(c => c.toLowerCase()))
    const uniqueColors = new Set()
    allProducts.forEach(p => {
      if (p.dialColor && p.dialColor.trim()) {
        const trimmed = p.dialColor.trim()
        if (!defaultSet.has(trimmed.toLowerCase())) {
          uniqueColors.add(trimmed)
        }
      }
    })
    return Array.from(uniqueColors).sort((a, b) => a.localeCompare(b))
  }, [allProducts])

  const dynamicStrapColors = useMemo(() => {
    const defaultSet = new Set(STRAP_COLOR_OPTIONS.map(c => c.toLowerCase()))
    const uniqueColors = new Set()
    allProducts.forEach(p => {
      if (p.strapColor && p.strapColor.trim()) {
        const trimmed = p.strapColor.trim()
        if (!defaultSet.has(trimmed.toLowerCase())) {
          uniqueColors.add(trimmed)
        }
      }
    })
    return Array.from(uniqueColors).sort((a, b) => a.localeCompare(b))
  }, [allProducts])

  const handleViewProduct = (product) => {
    setSelectedProduct(product)
    setModalMode('view')
    setShowModal(true)
  }

  const handleEditProduct = (product) => {
    setSelectedProduct(product)
    setModalMode('edit')
    setShowModal(true)
  }

  const handleCreateProduct = () => {
    setSelectedProduct(null)
    setModalMode('create')
    setShowModal(true)
  }

  // Unified delete handler - opens confirmation modal
  const handleDeleteClick = (product) => {
    setDeleteProduct(product)
    setShowDeleteConfirm(true)
  }

  // Confirmed delete - calls API and updates UI
  const handleConfirmDelete = async () => {
    if (deleteProduct && deleteProduct._id) {
      try {
        await deleteProductMutation.mutateAsync(deleteProduct._id)
        // React Query automatically updates cache and refetches
        setShowDeleteConfirm(false)
        setDeleteProduct(null)
        // Also close action sheet if open
        setShowActionSheet(false)
        setActionSheetProduct(null)
      } catch (error) {
        console.error('Error deleting product:', error)
        alert('Failed to delete product')
      }
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setDeleteProduct(null)
  }

  // Mobile-specific handlers
  const handleMoreClick = (product) => {
    setActionSheetProduct(product)
    setShowActionSheet(true)
  }

  const handleActionSheetDelete = () => {
    if (actionSheetProduct) {
      handleDeleteClick(actionSheetProduct)
    }
  }

  const handleModalClose = () => {
    setShowModal(false)
    setSelectedProduct(null)
    // No need to reload - React Query handles cache updates
  }

  const handleOpenExport = () => {
    setShowExportModal(true)
  }

  const handleConfirmExport = async (exportParams) => {
    try {
      await exportToCSV(exportParams)
      setShowExportModal(false)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Failed to export CSV')
    }
  }

  const loading = productsLoading && products.length === 0

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="mobile-dashboard">
        <MobileHeader
          user={user}
          onLogout={logout}
          onCreateProduct={handleCreateProduct}
          onExportCSV={handleOpenExport}
          onImportCSV={() => setShowImportModal(true)}
        />

        {(user?.canViewStats !== false) && <MobileStatsBar stats={stats} />}

        {(user?.canAccessFilters !== false) && (
          <MobileSearchBar
            value={filters.search}
            onChange={(value) => handleFilterChange('search', value)}
            onFilterClick={() => setShowFilterSheet(true)}
            hasActiveFilters={hasActiveFilters}
          />
        )}

        <main className="mobile-dashboard-main">
          {loading && products.length === 0 ? (
            <div className="mobile-loading">Loading...</div>
          ) : (
            <>
              <BrandSummaryBar
                selectedBrand={filters.brand}
                brandStats={productsData?.brandStats}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={handleClearFilters}
              />
              <MobileProductList
                products={products}
                onView={handleViewProduct}
                onEdit={handleEditProduct}
                onMoreClick={handleMoreClick}
                loading={productsLoading}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                page={pagination.page}
                limit={pagination.limit}
              />
              {pagination.pages > 0 &&
                !showFilterSheet &&
                !showModal &&
                !showActionSheet &&
                !showDeleteConfirm && (
                  <div style={{ paddingBottom: selectedIds.size > 0 ? '100px' : '0' }}>
                    <MobilePagination
                      page={pagination.page}
                      totalPages={pagination.pages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
            </>
          )}
        </main>

        {selectedIds.size > 0 ? (
          <MobileSelectionBar
            selectedCount={selectedIds.size}
            selectedIds={selectedIds}
            products={products}
            onBulkEdit={async (updates) => {
              try {
                await patchProductsBulkMutation.mutateAsync({
                  ids: Array.from(selectedIds),
                  data: updates
                })
                setSelectedIds(new Set())
              } catch (error) {
                console.error('Bulk update error:', error)
                alert('Some products failed to update')
              }
            }}
            onBulkDelete={async () => {
              if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} product(s)?`)) {
                return
              }
              try {
                await deleteProductsBulkMutation.mutateAsync({
                  ids: Array.from(selectedIds)
                })
                setSelectedIds(new Set())
              } catch (error) {
                console.error('Bulk delete error:', error)
                alert('Some products failed to delete')
              }
            }}
            onBulkCategoryChange={async (category) => {
              try {
                await patchProductsBulkMutation.mutateAsync({
                  ids: Array.from(selectedIds),
                  data: { category }
                })
                setSelectedIds(new Set())
              } catch (error) {
                console.error('Bulk category change error:', error)
                alert('Some products failed to update')
              }
            }}
            onBulkExportCSV={handleOpenExport}
            onClearSelection={() => setSelectedIds(new Set())}
          />
        ) : (
          (user?.role?.toLowerCase() !== 'staff' || user?.canEditProducts !== false) ? (
            <MobileFAB
              onCreateProduct={handleCreateProduct}
              onExportCSV={handleOpenExport}
              onImportCSV={() => setShowImportModal(true)}
            />
          ) : (
            <button
              onClick={handleOpenExport}
              style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#0f172a',
                color: 'white',
                border: 'none',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
                zIndex: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Export CSV"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          )
        )}

        <MobileFilterSheet
          isOpen={showFilterSheet}
          onClose={() => setShowFilterSheet(false)}
          brands={brands}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />

        <MobileActionSheet
          isOpen={showActionSheet}
          onClose={() => {
            setShowActionSheet(false)
            setActionSheetProduct(null)
          }}
          onDelete={handleActionSheetDelete}
        />

        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          product={deleteProduct}
        />

        {showModal && (
          <MobileProductModal
            product={selectedProduct}
            mode={modalMode}
            onClose={handleModalClose}
            onSave={handleModalClose}
            brands={brands}
            isOwner={isOwner}
            dynamicDialColors={dynamicDialColors}
            dynamicStrapColors={dynamicStrapColors}
            canEditSeo={canEditSeo}
          />
        )}

        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onConfirm={handleConfirmExport}
          brands={brands}
          currentFilters={{
            brand: filters.brand || undefined,
            search: debouncedSearch || undefined
          }}
          selectedCount={selectedIds.size}
          selectedIds={selectedIds}
          pagination={pagination}
        />

        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onUploadSuccess={() => {
            window.location.reload()
          }}
        />
      </div>
    )
  }

  // Desktop Layout (unchanged)
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="dashboard-brand">
            <img
              src="https://i.ibb.co/2XHCWRL/samay-logo.png"
              alt="Samay IMS logo"
              className="dashboard-logo"
            />
          </div>
          <div className="header-actions">
            <button
              onClick={() => navigate('/activity-history')}
              className="btn-activity-history"
            >
              Activity History
            </button>
            {user?.role?.toLowerCase() === 'owner' && (
              <>
                <button
                  onClick={() => navigate('/my-store')}
                  className="btn-my-store"
                  style={{ background: '#0a1638', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', marginRight: '8px', fontWeight: 'bold' }}
                >
                  My Store
                </button>
                <button
                  onClick={() => navigate('/my-store/staffs')}
                  className="btn-staff-management"
                  style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', marginRight: '8px', fontWeight: 'bold' }}
                >
                  Staff Management
                </button>
              </>
            )}
            <span className="user-info">Welcome, {user?.name}</span>
            <button onClick={logout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {loading && !stats && products.length === 0 ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            {user?.canViewStats !== false && <StatsCards stats={stats} />}

            <div className="dashboard-controls">
              {user?.canAccessFilters !== false && (
                <div className="controls-left">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="search-input"
                  />
                  <select
                    value={filters.brand}
                    onChange={(e) => handleFilterChange('brand', e.target.value)}
                    className="brand-filter"
                  >
                    <option value="">All Brands</option>
                    {brands.map((brand) => (
                      <option key={brand} value={brand}>
                        {getDisplayBrand(brand)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={`${filters.sortBy}-${filters.sortOrder}`}
                    onChange={(e) => {
                      const [sortBy, sortOrder] = e.target.value.split('-');
                      setFilters(prev => ({ ...prev, sortBy, sortOrder, page: 1 }));
                    }}
                    className="brand-filter"
                    style={{ minWidth: '180px' }}
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
                  <button
                    onClick={handleClearFilters}
                    disabled={!hasActiveFilters}
                    style={{
                      padding: '0.75rem 1.25rem',
                      background: hasActiveFilters ? '#dc3545' : '#e2e8f0',
                      color: hasActiveFilters ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: hasActiveFilters ? 'pointer' : 'not-allowed',
                      fontSize: '0.95rem',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s',
                    }}
                    type="button"
                    onMouseEnter={(e) => {
                      if (hasActiveFilters) e.target.style.backgroundColor = '#c82333';
                    }}
                    onMouseLeave={(e) => {
                      if (hasActiveFilters) {
                        e.target.style.backgroundColor = '#dc3545';
                      } else {
                        e.target.style.backgroundColor = '#e2e8f0';
                      }
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    Clear All
                  </button>
                </div>
              )}
              <div className="controls-right" style={user?.canAccessFilters === false ? { marginLeft: 'auto' } : {}}>
                {(user?.role?.toLowerCase() !== 'staff' || user?.canEditProducts !== false) && (
                  <>
                    <button onClick={handleCreateProduct} className="btn-primary">
                      + Add Product
                    </button>
                    <button onClick={() => setShowImportModal(true)} className="btn-secondary" style={{ marginRight: '8px' }}>
                      Import CSV
                    </button>
                  </>
                )}
                <button onClick={handleOpenExport} className="btn-secondary">
                  Export CSV
                </button>
              </div>
            </div>

            {user?.canAccessFilters !== false && (
              /* Date Range Sub-row */
              <div className="date-range-filters-bar" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap', background: '#f8fafc', padding: '10px 16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>Added Date Range:</span>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', color: '#0a1638', outline: 'none', backgroundColor: '#ffffff' }}
                  />
                  <span style={{ fontSize: '13px', color: '#64748b' }}>to</span>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', color: '#0a1638', outline: 'none', backgroundColor: '#ffffff' }}
                  />
                  {(filters.startDate || filters.endDate) && (
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, startDate: '', endDate: '', page: 1 }))
                      }}
                      style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#475569' }}
                      type="button"
                    >
                      Clear Range
                    </button>
                  )}
                </div>
              </div>
            )}

            <BrandSummaryBar
              selectedBrand={filters.brand}
              brandStats={productsData?.brandStats}
              hasActiveFilters={hasActiveFilters}
            />

            <InventoryTable
              products={products}
              onView={handleViewProduct}
              onEdit={handleEditProduct}
              onDelete={handleDeleteClick}
              loading={productsLoading}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              page={pagination.page}
              limit={pagination.limit}
              canEdit={user?.role?.toLowerCase() !== 'staff' || user?.canEditProducts !== false}
            />

            {selectedIds.size > 0 && (
              <BulkActions
                selectedCount={selectedIds.size}
                selectedIds={selectedIds}
                products={products}
                onBulkEdit={async (updates) => {
                  try {
                    await patchProductsBulkMutation.mutateAsync({
                      ids: Array.from(selectedIds),
                      data: updates
                    })
                    setSelectedIds(new Set())
                  } catch (error) {
                    console.error('Bulk update error:', error)
                    alert('Some products failed to update')
                  }
                }}
                onBulkDelete={async () => {
                  if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} product(s)?`)) {
                    return
                  }
                  try {
                    await deleteProductsBulkMutation.mutateAsync({
                      ids: Array.from(selectedIds)
                    })
                    setSelectedIds(new Set())
                  } catch (error) {
                    console.error('Bulk delete error:', error)
                    alert('Some products failed to delete')
                  }
                }}
                onBulkCategoryChange={async (category) => {
                  try {
                    await patchProductsBulkMutation.mutateAsync({
                      ids: Array.from(selectedIds),
                      data: { category }
                    })
                    setSelectedIds(new Set())
                  } catch (error) {
                    console.error('Bulk category change error:', error)
                    alert('Some products failed to update')
                  }
                }}
                onBulkExportCSV={handleOpenExport}
                onClearSelection={() => setSelectedIds(new Set())}
              />
            )}

            {pagination.pages > 0 && (
              <PaginationBar
                page={pagination.page}
                pages={pagination.pages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </main>

      {showModal && (
        <ProductModal
          product={selectedProduct}
          mode={modalMode}
          onClose={handleModalClose}
          onSave={handleModalClose}
          brands={brands}
          isOwner={isOwner}
          dynamicDialColors={dynamicDialColors}
          dynamicStrapColors={dynamicStrapColors}
          canEditSeo={canEditSeo}
        />
      )}

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        product={deleteProduct}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleConfirmExport}
        brands={brands}
        currentFilters={{
          brand: filters.brand || undefined,
          search: debouncedSearch || undefined
        }}
        selectedCount={selectedIds.size}
        selectedIds={selectedIds}
        pagination={pagination}
      />

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onUploadSuccess={() => {
          window.location.reload()
        }}
      />
    </div>
  )
}

export default Dashboard
