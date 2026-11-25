import { useState, useMemo, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { AuthContext } from '../context/AuthContext'
import { useDebounce } from '../hooks/useDebounce'
import { useProducts, useBrands, productKeys } from '../hooks/useProducts'
import { pullProductEnrichment, publishProduct } from '../services/productService'
import { getDisplayBrand } from '../utils/brandUtils'
import {
  isEnrichableProduct,
  formatEnrichmentToast,
} from '../utils/enrichmentBrands'
import { getImageUrls, getThumbnailUrl } from '../utils/imageUtils'
import ProductThumbnail from '../components/ProductThumbnail'
import ProductModal from '../components/ProductModal'
import PaginationBar from '../components/PaginationBar'
import './NewListings.css'

const SHORT_DESCRIPTION_CHARS = 40

function countImages(product) {
  const urls = getImageUrls(product)
  if (urls.length > 0) return urls.length
  if (getThumbnailUrl(product)) return 1
  return 0
}

/** Chips for fields staff still need to fill in for a polished listing */
function getMissingFields(product) {
  const missing = []
  if (countImages(product) === 0) missing.push('images')
  const desc = (product.description || '').trim()
  if (desc.length < SHORT_DESCRIPTION_CHARS) missing.push('description')
  if (!(product.brand || '').trim()) missing.push('brand')
  if (!(product.sku || '').trim()) missing.push('sku')
  if (!product.price || Number(product.price) <= 0) missing.push('price')
  const hasSeo =
    (product.seoTitle || '').trim() && (product.seoDescription || '').trim()
  if (!hasSeo) missing.push('SEO')
  return missing
}

const NewListings = () => {
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({
    search: '',
    brand: '',
    missingImages: false,
    missingDescription: false,
    page: 1,
  })
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('edit')
  const [busyId, setBusyId] = useState(null)

  const debouncedSearch = useDebounce(filters.search, 500)

  const queryFilters = useMemo(
    () => ({
      page: filters.page,
      limit: 50,
      isPublished: false,
      brand: filters.brand || undefined,
      search: debouncedSearch || undefined,
      missingImages: filters.missingImages ? '1' : undefined,
      missingDescription: filters.missingDescription ? '1' : undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }),
    [
      filters.page,
      filters.brand,
      filters.missingImages,
      filters.missingDescription,
      debouncedSearch,
    ]
  )

  const { data: productsData, isLoading } = useProducts(queryFilters)
  const { data: brandsData } = useBrands()

  const products = productsData?.data || []
  const pagination = productsData?.pagination || {
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  }
  const listingMeta = productsData?.listingMeta || {
    unpublishedTotal: pagination.total,
    missingImagesCount: 0,
  }

  const brands = useMemo(() => {
    const list = brandsData?.data || brandsData || []
    if (!Array.isArray(list) || list.length === 0) return []
    const first = list.find((b) => b != null)
    if (typeof first === 'string') {
      return list
        .filter((b) => typeof b === 'string' && b.trim())
        .sort((a, b) => a.localeCompare(b))
    }
    if (first && typeof first === 'object' && first.name) {
      return list
        .map((b) => b?.name)
        .filter((name) => typeof name === 'string' && name.trim())
        .sort((a, b) => a.localeCompare(b))
    }
    return []
  }, [brandsData])

  const role = user?.role?.toLowerCase() || ''
  const isOwner = role === 'owner'
  const isAdmin = role === 'admin'
  const canPublish = isOwner || isAdmin
  const canEdit =
    role !== 'staff' || user?.canEditProducts !== false
  const canEditSeo = isOwner || user?.canEditSeo !== false

  const invalidateListings = () => {
    queryClient.invalidateQueries({ queryKey: productKeys.lists() })
  }

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const handleEdit = (product) => {
    setSelectedProduct(product)
    setModalMode('edit')
    setShowModal(true)
  }

  const handleView = (product) => {
    setSelectedProduct(product)
    setModalMode('view')
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setSelectedProduct(null)
  }

  const handleGetDetails = async (product) => {
    if (!product?._id || !isEnrichableProduct(product)) return
    setBusyId(`scan-${product._id}`)
    try {
      const res = await pullProductEnrichment(product._id, { liveScrape: true })
      toast.success(formatEnrichmentToast(res))
      invalidateListings()
      if (showModal && selectedProduct?._id === product._id && res?.data?.product) {
        setSelectedProduct(res.data.product)
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || 'Get details failed'
      )
    } finally {
      setBusyId(null)
    }
  }

  const handleApprovePublish = async (product) => {
    if (!product?._id) return
    const label = product.sku || product.title || 'this listing'
    if (
      !window.confirm(
        `Approve & go live "${label}"?\n\nGoes live immediately if it has a title and at least one image (inventory 0 / sold out is OK).`
      )
    ) {
      return
    }
    setBusyId(`pub-${product._id}`)
    try {
      const res = await publishProduct(product._id)
      toast.success(res?.message || 'Listing published')
      invalidateListings()
      if (showModal && selectedProduct?._id === product._id) {
        handleModalClose()
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || 'Publish failed'
      )
    } finally {
      setBusyId(null)
    }
  }

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value || 0)

  const loading = isLoading && products.length === 0

  return (
    <div className="new-listings-page">
      <div className="new-listings-header">
        <div className="breadcrumb">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="breadcrumb-link"
          >
            Dashboard
          </button>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-current">New listings</span>
        </div>
        <div className="page-title-section">
          <h1>New listings</h1>
          <p className="page-subtitle">
            Products not live on the storefront — fill in official info and images
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            onClick={() => navigate('/enrichment-status')}
            className="btn-back"
            style={{ background: '#0f172a' }}
          >
            Enrichment status
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn-back"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      <div className="new-listings-counts">
        <div className="count-item">
          <span className="count-value">{listingMeta.unpublishedTotal ?? 0}</span>
          <span className="count-label">Unpublished</span>
        </div>
        <div className="count-item">
          <span className="count-value">{listingMeta.missingImagesCount ?? 0}</span>
          <span className="count-label">Missing images</span>
        </div>
        <div className="count-item">
          <span className="count-value">{pagination.total ?? 0}</span>
          <span className="count-label">Showing</span>
        </div>
      </div>

      <div className="new-listings-filters">
        <div className="filters-row">
          <input
            type="text"
            placeholder="Search brand, SKU, title..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="filter-input search-input"
          />
          <select
            value={filters.brand}
            onChange={(e) => handleFilterChange('brand', e.target.value)}
            className="filter-select"
          >
            <option value="">All Brands</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {getDisplayBrand(brand)}
              </option>
            ))}
          </select>
          <label className="filter-toggle">
            <input
              type="checkbox"
              checked={filters.missingImages}
              onChange={(e) =>
                handleFilterChange('missingImages', e.target.checked)
              }
            />
            Missing images
          </label>
          <label className="filter-toggle">
            <input
              type="checkbox"
              checked={filters.missingDescription}
              onChange={(e) =>
                handleFilterChange('missingDescription', e.target.checked)
              }
            />
            Thin / missing description
          </label>
        </div>
      </div>

      <div className="new-listings-table-wrap">
        {loading ? (
          <div className="new-listings-loading">Loading...</div>
        ) : products.length === 0 ? (
          <div className="new-listings-empty">
            No unpublished products match these filters.
          </div>
        ) : (
          <div className="new-listings-table">
            <div className="nl-table-header">
              <div className="nl-cell image">Image</div>
              <div className="nl-cell brand">Brand</div>
              <div className="nl-cell sku">SKU</div>
              <div className="nl-cell title">Title</div>
              <div className="nl-cell inventory">Inv</div>
              <div className="nl-cell price">Price</div>
              <div className="nl-cell imgs">Imgs</div>
              <div className="nl-cell missing">Needs</div>
              <div className="nl-cell actions">Actions</div>
            </div>
            <div className="nl-table-body">
              {products.map((product, index) => {
                const missing = getMissingFields(product)
                const imgCount = countImages(product)
                const serial =
                  (pagination.page - 1) * pagination.limit + index + 1
                const enrichable = isEnrichableProduct(product)
                const scanning = busyId === `scan-${product._id}`
                const publishing = busyId === `pub-${product._id}`
                return (
                  <div key={product._id} className="nl-table-row">
                    <div className="nl-cell image">
                      <ProductThumbnail
                        product={product}
                        alt={product.title || product.brand || 'Product'}
                        size={44}
                        onClick={() => handleView(product)}
                      />
                    </div>
                    <div className="nl-cell brand" title={product.brand}>
                      {getDisplayBrand(product.brand) || '—'}
                    </div>
                    <div className="nl-cell sku" title={product.sku}>
                      {product.sku || '—'}
                    </div>
                    <div
                      className="nl-cell title"
                      title={product.title || ''}
                    >
                      <span className="nl-serial">{serial}.</span>{' '}
                      {product.title || (
                        <span className="nl-muted">No title</span>
                      )}
                    </div>
                    <div className="nl-cell inventory">
                      {product.inventory ?? 0}
                    </div>
                    <div className="nl-cell price">
                      {formatCurrency(product.price)}
                    </div>
                    <div className="nl-cell imgs">
                      <span
                        className={
                          imgCount === 0 ? 'nl-img-count empty' : 'nl-img-count'
                        }
                      >
                        {imgCount}
                      </span>
                    </div>
                    <div className="nl-cell missing">
                      <div className="nl-chips">
                        {missing.length === 0 ? (
                          <span className="nl-chip ok">ready to publish*</span>
                        ) : (
                          missing.map((field) => (
                            <span key={field} className={`nl-chip ${field}`}>
                              {field}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="nl-cell actions">
                      <div className="nl-action-group">
                        {canEdit ? (
                          <button
                            type="button"
                            className="nl-edit-btn"
                            onClick={() => handleEdit(product)}
                          >
                            Edit
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="nl-edit-btn secondary"
                            onClick={() => handleView(product)}
                          >
                            View
                          </button>
                        )}
                        {enrichable && canEdit && (
                          <button
                            type="button"
                            className="nl-edit-btn scan"
                            disabled={!!busyId}
                            onClick={() => handleGetDetails(product)}
                            title="Get details from brand site (fill empty fields only; does not publish)"
                          >
                            {scanning ? 'Getting…' : 'Get details'}
                          </button>
                        )}
                        {canPublish && (
                          <button
                            type="button"
                            className="nl-edit-btn publish"
                            disabled={!!busyId}
                            onClick={() => handleApprovePublish(product)}
                            title="Approve & go live — sets isPublished immediately (sold-out OK)"
                          >
                            {publishing ? 'Publishing…' : 'Approve & go live'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {pagination.pages > 0 && (
        <PaginationBar
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={(page) =>
            setFilters((prev) => ({ ...prev, page }))
          }
        />
      )}

      <p className="nl-footnote">
        * “Ready to publish” means images, description, brand, SKU, price, and SEO
        look filled in. <strong>Approve &amp; go live</strong> (owner/admin) sets{' '}
        <code>isPublished</code> immediately — sold-out (inventory 0) is OK.{' '}
        <strong>Get details</strong> (Balmain / Titan / Timex / Tissot / Fossil / Casio / Seiko / Longines / Rado / Emporio Armani) fills empty fields
        only and never publishes (scrape ≠ approve; staff data wins).
      </p>

      {showModal && (
        <ProductModal
          product={selectedProduct}
          mode={modalMode}
          onClose={handleModalClose}
          onSave={() => {
            handleModalClose()
            invalidateListings()
          }}
          brands={brands}
          isOwner={isOwner}
          canEditSeo={canEditSeo}
          canPublish={canPublish}
          onGetDetails={
            selectedProduct &&
            isEnrichableProduct(selectedProduct) &&
            canEdit
              ? () => handleGetDetails(selectedProduct)
              : undefined
          }
          onApprovePublish={
            canPublish && selectedProduct
              ? () => handleApprovePublish(selectedProduct)
              : undefined
          }
          enrichmentBusy={busyId}
        />
      )}
    </div>
  )
}

export default NewListings
