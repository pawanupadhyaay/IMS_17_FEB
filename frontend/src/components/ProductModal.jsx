import { useState, useEffect, useRef, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { useCreateProduct, usePatchProduct, useUpdateProduct, useProduct } from '../hooks/useProducts'
// Unified image pipeline: use product.images directly
import { getDisplayBrand } from '../utils/brandUtils'
import ImageGallery from './ImageGallery'
import ImageManager from './ImageManager'
import {
  CATEGORY_OPTIONS,
  CASE_MATERIAL_OPTIONS,
  DIAL_COLOR_OPTIONS,
  WATER_RESISTANCE_OPTIONS,
  WARRANTY_OPTIONS,
  MOVEMENT_OPTIONS,
  GENDER_OPTIONS,
  STRAP_COLOR_OPTIONS,
  CASE_SHAPE_OPTIONS,
  STRAP_MATERIAL_OPTIONS,
} from '../constants/productOptions'
import { useMemo } from 'react'
import './ProductModal.css'

const ProductModal = ({ product, mode, onClose, onSave, brands = [], isOwner, dynamicDialColors = [], dynamicStrapColors = [], canEditSeo }) => {
  const { user } = useContext(AuthContext)
  const isBasicInfoReadOnly = mode === 'view' || (user?.role?.toLowerCase() === 'staff' && user?.canEditBasicInfo === false)
  const [formData, setFormData] = useState({
    brand: '',
    sku: '',
    title: '',
    category: '',
    inventory: 0,
    price: 0,
    oldPrice: 0,
    description: '',
    caseMaterial: '',
    dialColor: '',
    waterResistance: '',
    warrantyPeriod: '',
    movement: '',
    gender: '',
    caseSize: '',
    strapColor: '',
    caseShape: '',
    images: [],
    strapMaterial: '',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    seoImage: '',
  })
  const [error, setError] = useState('')
  const [samePriceChecked, setSamePriceChecked] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [showCustomDial, setShowCustomDial] = useState(false)
  const [showCustomStrap, setShowCustomStrap] = useState(false)
  const [showCustomBrand, setShowCustomBrand] = useState(false)
  const [showCustomCategory, setShowCustomCategory] = useState(false)

  const brandOptions = useMemo(() => {
    const list = brands.filter(Boolean).filter(b => b.trim().length)
    if (isOwner) {
      list.push('Custom...')
    }
    return list
  }, [brands, isOwner])

  const categoryOptions = useMemo(() => {
    const list = [...CATEGORY_OPTIONS]
    if (isOwner) {
      list.push('Custom...')
    }
    return list
  }, [isOwner])

  const dialColors = useMemo(() => {
    const list = [...DIAL_COLOR_OPTIONS, ...dynamicDialColors]
    if (isOwner) {
      list.push('Custom...')
    }
    return list
  }, [dynamicDialColors, isOwner])

  const strapColors = useMemo(() => {
    const list = [...STRAP_COLOR_OPTIONS, ...dynamicStrapColors]
    if (isOwner) {
      list.push('Custom...')
    }
    return list
  }, [dynamicStrapColors, isOwner])
  // Ref keeps latest image order from ImageManager so Submit always sends user's reorder (avoids formData overwrite).
  const imagesOrderRef = useRef(null)

  // React Query mutations with optimistic updates
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const patchMutation = usePatchProduct() // Use PATCH for partial updates (optimized)

  // Fetch full product when modal opens (only if product._id exists)
  const { data: fullProductData } = useProduct(product?._id)
  const fullProduct = fullProductData?.data
  const displayProduct = fullProduct || product

  // Sync form from server once per product (so reordered images are not overwritten by refetch).
  // Compare by string ID so list item (string) vs fullProduct (ObjectId) still count as same product.
  useEffect(() => {
    const productId = displayProduct?._id != null ? String(displayProduct._id) : null
    if (!productId) return
    if (isDirty) return

    const initialImages = Array.isArray(displayProduct.images) ? [...displayProduct.images] : []
    imagesOrderRef.current = initialImages
    setFormData((prev) => ({
      ...prev,
      brand: displayProduct.brand || prev.brand || '',
      sku: displayProduct.sku || prev.sku || '',
      title: displayProduct.title || '',
      category: displayProduct.category || '',
      inventory: displayProduct.inventory ?? 0,
      price: displayProduct.price ?? 0,
      oldPrice: displayProduct.oldPrice ?? displayProduct.price ?? 0,
      description: displayProduct.description || '',
      images: initialImages,

      // Product Details (flat fields)
      caseMaterial: displayProduct.caseMaterial || '',
      dialColor: displayProduct.dialColor || '',
      waterResistance: displayProduct.waterResistance || '',
      warrantyPeriod: displayProduct.warrantyPeriod || '',
      movement: displayProduct.movement || '',
      gender: displayProduct.gender || '',
      strapColor: displayProduct.strapColor || '',
      caseShape: displayProduct.caseShape || '',
      caseSize: displayProduct.caseSize || '',
      strapMaterial: displayProduct.strapMaterial || '',
      seoTitle: displayProduct.seoTitle || '',
      seoDescription: displayProduct.seoDescription || '',
      seoKeywords: displayProduct.seoKeywords || '',
      seoImage: displayProduct.seoImage || '',
    }));

    const price = displayProduct.price ?? 0
    const oldPrice = displayProduct.oldPrice ?? price
    setSamePriceChecked(oldPrice === price)
    setShowCustomDial(false)
    setShowCustomStrap(false)
    setShowCustomBrand(false)
    setShowCustomCategory(false)
  }, [displayProduct, isDirty])

  // When modal opens for a different product, allow form sync again
  useEffect(() => {
    setIsDirty(false)
    imagesOrderRef.current = null
  }, [product?._id])


  useEffect(() => {
    if (samePriceChecked) {
      setFormData((prev) => ({
        ...prev,
        oldPrice: prev.price,
      }))
    }
  }, [samePriceChecked])


  const handleChange = (e) => {
    const { name, value } = e.target
    const newValue = name === 'inventory' || name === 'price' || name === 'oldPrice' ? parseFloat(value) || 0 : value

    setIsDirty(true)
    
    if (name === 'brand') {
      if (value === 'Custom...') {
        setShowCustomBrand(true)
        setFormData((prev) => ({ ...prev, brand: '' }))
      } else {
        setShowCustomBrand(false)
        setFormData((prev) => ({ ...prev, brand: value }))
      }
    } else if (name === 'category') {
      if (value === 'Custom...') {
        setShowCustomCategory(true)
        setFormData((prev) => ({ ...prev, category: '' }))
      } else {
        setShowCustomCategory(false)
        setFormData((prev) => ({ ...prev, category: value }))
      }
    } else if (name === 'dialColor') {
      if (value === 'Custom...') {
        setShowCustomDial(true)
        setFormData((prev) => ({ ...prev, dialColor: '' }))
      } else {
        setShowCustomDial(false)
        setFormData((prev) => ({ ...prev, dialColor: value }))
      }
    } else if (name === 'strapColor') {
      if (value === 'Custom...') {
        setShowCustomStrap(true)
        setFormData((prev) => ({ ...prev, strapColor: '' }))
      } else {
        setShowCustomStrap(false)
        setFormData((prev) => ({ ...prev, strapColor: value }))
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: newValue,
      }))
    }

    // If checkbox checked and price changed, sync oldPrice
    if (name === 'price' && samePriceChecked) {
      setFormData((prev) => ({
        ...prev,
        oldPrice: newValue,
      }))
    }
  }

  const handleImagesChange = (newImages) => {
    setIsDirty(true)
    imagesOrderRef.current = Array.isArray(newImages) ? [...newImages] : []
    setFormData((prev) => ({
      ...prev,
      images: newImages,
    }))
  }

  const handleImageReorder = async (newImages) => {
    // Only auto-save in edit mode
    if (mode === 'edit' && product?._id) {
      try {
        await patchMutation.mutateAsync({
          id: product._id,
          data: { images: newImages }
        })
        // No need to show success message, seamless UX
      } catch (err) {
        console.error('Failed to auto-save image order', err)
        setError('Failed to auto-save image order. Please try saving manually.')
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (mode === 'view') {
      onClose()
      return
    }
    if (createMutation.isLoading || updateMutation.isLoading || patchMutation.isLoading) return

    setError('')

    try {
      if (mode === 'create') {
        // Ensure oldPrice = price for new products
        const createData = {
          ...formData,
          title: formData.title || '',
          oldPrice: formData.oldPrice || formData.price || 0,
        }
        await createMutation.mutateAsync(createData)
        // Optimistic: Close modal immediately, React Query handles cache update
        onClose()
      } else if (mode === 'edit') {
        // Use ref so we always send user's last reorder (formData.images can be overwritten by sync effect).
        const orderedImages = Array.isArray(imagesOrderRef.current)
          ? imagesOrderRef.current.filter(Boolean)
          : Array.isArray(formData.images)
            ? formData.images.filter(Boolean)
            : []
        const payload = {
          ...formData,
          title: formData.title || '',
          images: orderedImages,
          samePriceChecked: samePriceChecked,
        }
        delete payload.brand
        delete payload.sku
        delete payload.image
        await patchMutation.mutateAsync({
          id: product._id,
          data: payload
        })
        // Optimistic: Close modal immediately, UI already updated
        onClose()
      }
    } catch (error) {
      setError(error.response?.data?.message || error.message || 'Failed to save product')
      // Don't close on error - let user retry
    }
  }

  const loading = createMutation.isLoading || updateMutation.isLoading || patchMutation.isLoading

  const isViewMode = mode === 'view'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {mode === 'view' && 'View Product'}
            {mode === 'edit' && 'Edit Product'}
            {mode === 'create' && 'Create Product'}
          </h2>
          <button onClick={onClose} className="modal-close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Brand</label>
                {mode === 'create' ? (
                  <>
                    <select
                      name="brand"
                      value={showCustomBrand ? 'Custom...' : formData.brand}
                      onChange={handleChange}
                      disabled={isBasicInfoReadOnly}
                      required
                      className="form-select"
                    >
                      <option value="">Select Brand</option>
                      {brandOptions
                        .map((brand) => (
                          <option key={brand} value={brand}>
                            {getDisplayBrand(brand)}
                          </option>
                        ))}
                    </select>
                    {showCustomBrand && (
                      <input
                        type="text"
                        placeholder="Enter custom brand..."
                        value={formData.brand}
                        onChange={(e) => {
                          setIsDirty(true)
                          setFormData(prev => ({ ...prev, brand: e.target.value }))
                        }}
                        className="form-input"
                        style={{ marginTop: '8px' }}
                        required
                      />
                    )}
                  </>
                ) : (
                  <input
                    type="text"
                    name="brand"
                    value={getDisplayBrand(formData.brand)}
                    readOnly
                    disabled
                    className="form-input-readonly"
                  />
                )}
              </div>
              <div className="form-group">
                <label>Title</label>
                {isBasicInfoReadOnly ? (
                  <div style={{ padding: '0.75rem', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', color: '#333' }}>
                    {displayProduct?.title?.trim() || '—'}
                  </div>
                ) : (
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    disabled={isBasicInfoReadOnly}
                  />
                )}
              </div>
              <div className="form-group">
                <label>SKU</label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  disabled={isViewMode || !isOwner}
                  readOnly={isViewMode || !isOwner}
                  className={isViewMode || !isOwner ? 'form-input-readonly' : ''}
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                {isBasicInfoReadOnly ? (
                  <div style={{ padding: '0.75rem', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', color: '#333' }}>
                    {formData.category || '-'}
                  </div>
                ) : (
                  <>
                    <select
                      name="category"
                      value={showCustomCategory ? 'Custom...' : formData.category}
                      onChange={handleChange}
                      disabled={isBasicInfoReadOnly}
                      className="form-select"
                    >
                      <option value="">Select Category</option>
                      {categoryOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {showCustomCategory && (
                      <input
                        type="text"
                        placeholder="Enter custom category..."
                        value={formData.category}
                        onChange={(e) => {
                          setIsDirty(true)
                          setFormData(prev => ({ ...prev, category: e.target.value }))
                        }}
                        className="form-input"
                        style={{ marginTop: '8px' }}
                        required
                      />
                    )}
                  </>
                )}
              </div>
              <div className="form-group">
                <label>Inventory</label>
                <input
                  type="number"
                  name="inventory"
                  value={formData.inventory}
                  onChange={handleChange}
                  disabled={isBasicInfoReadOnly}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Price (₹)</label>
                {isBasicInfoReadOnly ? (
                  <div style={{ padding: '0.75rem', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', color: '#333' }}>
                    {formData.oldPrice && formData.oldPrice > formData.price ? (
                      <>
                        <span style={{ textDecoration: 'line-through', color: '#666', marginRight: '0.5rem' }}>
                          ₹{formData.oldPrice.toFixed(2)}
                        </span>
                        <span>₹{formData.price?.toFixed(2) || '0.00'}</span>
                      </>
                    ) : (
                      <span>₹{formData.price?.toFixed(2) || '0.00'}</span>
                    )}
                  </div>
                ) : (
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    disabled={isBasicInfoReadOnly}
                    min="0"
                    step="0.01"
                  />
                )}
              </div>
              {!isBasicInfoReadOnly && (
                <div className="form-group">
                  <label>Old Price (MRP) (₹)</label>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'normal', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={samePriceChecked}
                        onChange={(e) => setSamePriceChecked(e.target.checked)}
                        disabled={isBasicInfoReadOnly}
                      />
                      <span>Same as price</span>
                    </label>
                  </div>
                  <input
                    type="number"
                    name="oldPrice"
                    value={formData.oldPrice || ''}
                    onChange={handleChange}
                    disabled={isBasicInfoReadOnly || samePriceChecked}
                    min="0"
                    step="0.01"
                  />
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isBasicInfoReadOnly}
                rows="3"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Product Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Case Material</label>
                {isBasicInfoReadOnly ? (
                  <div style={{ padding: '0.75rem', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', color: '#333' }}>
                    {displayProduct?.caseMaterial || '-'}
                  </div>
                ) : (
                  <select
                    name="caseMaterial"
                    value={formData.caseMaterial}
                    onChange={handleChange}
                    disabled={isBasicInfoReadOnly}
                    className="form-select"
                  >
                    <option value="">Select Case Material</option>
                    {CASE_MATERIAL_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label>Dial Color</label>
                {isBasicInfoReadOnly ? (
                  <div style={{ padding: '0.75rem', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', color: '#333' }}>
                    {displayProduct?.dialColor || '-'}
                  </div>
                ) : (
                  <>
                    <select
                      name="dialColor"
                      value={showCustomDial ? 'Custom...' : formData.dialColor}
                      onChange={handleChange}
                      disabled={isBasicInfoReadOnly}
                      className="form-select"
                    >
                      <option value="">Select Dial Color</option>
                      {dialColors.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {showCustomDial && (
                      <input
                        type="text"
                        placeholder="Enter custom dial color..."
                        value={formData.dialColor}
                        onChange={(e) => {
                          setIsDirty(true)
                          setFormData(prev => ({ ...prev, dialColor: e.target.value }))
                        }}
                        className="form-input"
                        style={{ marginTop: '8px' }}
                      />
                    )}
                  </>
                )}
              </div>
              <div className="form-group">
                <label>Water Resistance</label>
                {isBasicInfoReadOnly ? (
                  <div style={{ padding: '0.75rem', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', color: '#333' }}>
                    {displayProduct?.waterResistance || '-'}
                  </div>
                ) : (
                  <select
                    name="waterResistance"
                    value={formData.waterResistance}
                    onChange={handleChange}
                    disabled={isBasicInfoReadOnly}
                    className="form-select"
                  >
                    <option value="">Select Water Resistance</option>
                    {WATER_RESISTANCE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label>Warranty Period</label>
                {isBasicInfoReadOnly ? (
                  <div style={{ padding: '0.75rem', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', color: '#333' }}>
                    {displayProduct?.warrantyPeriod || '-'}
                  </div>
                ) : (
                  <select
                    name="warrantyPeriod"
                    value={formData.warrantyPeriod}
                    onChange={handleChange}
                    disabled={isBasicInfoReadOnly}
                    className="form-select"
                  >
                    <option value="">Select Warranty Period</option>
                    {WARRANTY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                    {formData.warrantyPeriod && !WARRANTY_OPTIONS.includes(formData.warrantyPeriod) && (
                      <option value={formData.warrantyPeriod}>
                        {formData.warrantyPeriod}
                      </option>
                    )}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label>Movement</label>
                {isBasicInfoReadOnly ? (
                  <div style={{ padding: '0.75rem', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', color: '#333' }}>
                    {displayProduct?.movement || '-'}
                  </div>
                ) : (
                  <select
                    name="movement"
                    value={formData.movement}
                    onChange={handleChange}
                    disabled={isBasicInfoReadOnly}
                    className="form-select"
                  >
                    <option value="">Select Movement</option>
                    {MOVEMENT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label>Gender</label>
                {isBasicInfoReadOnly ? (
                  <div style={{ padding: '0.75rem', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', color: '#333' }}>
                    {displayProduct?.gender || '-'}
                  </div>
                ) : (
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    disabled={isBasicInfoReadOnly}
                    className="form-select"
                  >
                    <option value="">Select Gender</option>
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label>Strap Color</label>
                {isBasicInfoReadOnly ? (
                  <div style={{ padding: '0.75rem', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', color: '#333' }}>
                    {displayProduct?.strapColor || '-'}
                  </div>
                ) : (
                  <>
                    <select
                      name="strapColor"
                      value={showCustomStrap ? 'Custom...' : formData.strapColor}
                      onChange={handleChange}
                      disabled={isBasicInfoReadOnly}
                      className="form-select"
                    >
                      <option value="">Select Strap Color</option>
                      {strapColors.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {showCustomStrap && (
                      <input
                        type="text"
                        placeholder="Enter custom strap color..."
                        value={formData.strapColor}
                        onChange={(e) => {
                          setIsDirty(true)
                          setFormData(prev => ({ ...prev, strapColor: e.target.value }))
                        }}
                        className="form-input"
                        style={{ marginTop: '8px' }}
                      />
                    )}
                  </>
                )}
              </div>
              <div className="form-group">
                <label>Case Shape</label>
                {isBasicInfoReadOnly ? (
                  <div style={{ padding: '0.75rem', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', color: '#333' }}>
                    {displayProduct?.caseShape || '-'}
                  </div>
                ) : (
                  <select
                    name="caseShape"
                    value={formData.caseShape}
                    onChange={handleChange}
                    disabled={isBasicInfoReadOnly}
                    className="form-select"
                  >
                    <option value="">Select Case Shape</option>
                    {CASE_SHAPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label>Case Size</label>
                {isBasicInfoReadOnly ? (
                  <div style={{ padding: '0.75rem', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', color: '#333' }}>
                    {displayProduct?.caseSize || '-'}
                  </div>
                ) : (
                  <input
                    type="text"
                    name="caseSize"
                    value={formData.caseSize}
                    onChange={handleChange}
                    disabled={isBasicInfoReadOnly}
                  />
                )}
              </div>
              <div className="form-group">
                <label>Strap Material</label>
                {isBasicInfoReadOnly ? (
                  <div style={{ padding: '0.75rem', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', color: '#333' }}>
                    {formData.strapMaterial || '-'}
                  </div>
                ) : (
                  <select
                    name="strapMaterial"
                    value={formData.strapMaterial}
                    onChange={handleChange}
                    disabled={isBasicInfoReadOnly}
                    className="form-select"
                  >
                    <option value="">Select Strap Material</option>
                    {STRAP_MATERIAL_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Images</h3>
            {isBasicInfoReadOnly ? (
              <ImageGallery images={formData.images} product={displayProduct} />
            ) : (
              <ImageManager
                images={formData.images || []}
                onChange={handleImagesChange}
                onReorder={handleImageReorder}
                disabled={isBasicInfoReadOnly}
              />
            )}
          </div>

          {canEditSeo && (
            <div className="form-section" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#4a90e2' }}>
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
                SEO & Search Engine Listing
              </h3>

              {/* Google Snippet Search Engine Listing Preview */}
              <div className="seo-google-preview" style={{
                background: '#ffffff',
                border: '1px solid #dadce0',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                fontFamily: 'arial, sans-serif'
              }}>
                <div style={{ fontSize: '12px', color: '#202124', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <img 
                    src="https://i.ibb.co/2XHCWRL/samay-logo.png" 
                    alt="Favicon" 
                    style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'contain' }}
                  />
                  <span>samaywatch.com › products › {formData.brand?.toLowerCase() || 'watch'}-{formData.sku?.toLowerCase() || 'sku'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '20px',
                      color: '#1a0dab',
                      lineHeight: '1.3',
                      marginBottom: '3px',
                      wordBreak: 'break-word',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                    >
                      {formData.seoTitle || formData.title || 'Exquisite Timepiece Title | Samay Watch'}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#4d5156',
                      lineHeight: '1.58',
                      wordBreak: 'break-word'
                    }}>
                      {formData.seoDescription || formData.description || 'Discover our premium watch collection. Hand-crafted precision engineered timepieces.'}
                    </div>
                  </div>
                  {(formData.seoImage || formData.images?.[0]) && (
                    <img 
                      src={formData.seoImage || formData.images[0]} 
                      alt="Google Preview Thumbnail" 
                      style={{
                        width: '92px',
                        height: '92px',
                        borderRadius: '8px',
                        objectFit: 'contain',
                        border: '1px solid #f1f3f4',
                        background: '#f8fafc'
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Input Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontWeight: '600' }}>SEO Page Title</label>
                    <span style={{ fontSize: '11px', color: (formData.seoTitle || '').length > 60 ? '#dc3545' : '#64748b' }}>
                      {(formData.seoTitle || '').length}/60 chars (Recommended)
                    </span>
                  </div>
                  {isViewMode ? (
                    <div style={{ padding: '0.75rem', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', color: '#333' }}>
                      {formData.seoTitle || '-'}
                    </div>
                  ) : (
                    <input
                      type="text"
                      name="seoTitle"
                      placeholder="e.g. Rolex Submariner Luxury Watch | Samay Watch"
                      value={formData.seoTitle}
                      onChange={handleChange}
                      disabled={isViewMode}
                      maxLength="70"
                    />
                  )}
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontWeight: '600' }}>SEO Meta Description</label>
                    <span style={{ fontSize: '11px', color: (formData.seoDescription || '').length > 160 ? '#dc3545' : '#64748b' }}>
                      {(formData.seoDescription || '').length}/160 chars (Recommended)
                    </span>
                  </div>
                  {isViewMode ? (
                    <div style={{ padding: '0.75rem', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', color: '#333', minHeight: '80px', whiteSpace: 'pre-wrap' }}>
                      {formData.seoDescription || '-'}
                    </div>
                  ) : (
                    <textarea
                      name="seoDescription"
                      placeholder="e.g. Shop the elegant Rolex Submariner luxury watch featuring premium deep blue dial, precision automatic movement, and Pan India free delivery."
                      value={formData.seoDescription}
                      onChange={handleChange}
                      disabled={isViewMode}
                      maxLength="200"
                      rows="3"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '0.95rem',
                        outline: 'none',
                        resize: 'vertical'
                      }}
                    />
                  )}
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: '600' }}>SEO Keywords (Comma Separated)</label>
                  {isViewMode ? (
                    <div style={{ padding: '0.75rem', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', color: '#333' }}>
                      {formData.seoKeywords || '-'}
                    </div>
                  ) : (
                    <input
                      type="text"
                      name="seoKeywords"
                      placeholder="e.g. rolex, submariner, luxury watch, blue watch, automatic movement"
                      value={formData.seoKeywords}
                      onChange={handleChange}
                      disabled={isViewMode}
                    />
                  )}
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: '600' }}>SEO Preview Image URL</label>
                  {isViewMode ? (
                    <div style={{ padding: '0.75rem', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', color: '#333', wordBreak: 'break-all' }}>
                      {formData.seoImage || '-'}
                    </div>
                  ) : (
                    <input
                      type="text"
                      name="seoImage"
                      placeholder="e.g. https://domain.com/seo-image.jpg (Defaults to first product image)"
                      value={formData.seoImage}
                      onChange={handleChange}
                      disabled={isViewMode}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              {isViewMode ? 'Close' : 'Cancel'}
            </button>
            {!isViewMode && (
              <button
                type="submit"
                disabled={loading}
                className="btn-save"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProductModal

