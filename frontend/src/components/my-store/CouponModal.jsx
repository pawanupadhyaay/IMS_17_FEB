import { useState, useEffect } from 'react';
import storeAdminService from '../../services/storeAdminService';
import { getProducts } from '../../services/productService';
import './CouponModal.css';

const CouponModal = ({ coupon, onClose, onSuccess, initialDiscountType, initialAppliesTo }) => {
  const [formData, setFormData] = useState({
    code: '',
    discountPercentage: '',
    discountType: 'percentage',
    discountValue: '',
    appliesTo: 'all',
    collectionName: '',
    productName: '',
    minOrderAmount: '0',
    validUntil: '',
    isActive: true,
    method: 'code',
    buyXProduct: '',
    buyXQty: '1',
    getYProduct: '',
    getYQty: '1',
    getYDiscount: '100',
    eligibility: 'all'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (coupon) {
      setFormData({
        code: coupon.code || '',
        discountPercentage: coupon.discountPercentage || '',
        discountType: coupon.discountType || 'percentage',
        discountValue: coupon.discountValue || coupon.discountPercentage || '',
        appliesTo: coupon.appliesTo || 'all',
        collectionName: coupon.collectionName || '',
        productName: coupon.productName || '',
        minOrderAmount: coupon.minOrderAmount || '0',
        validUntil: coupon.validUntil ? coupon.validUntil.split('T')[0] : '',
        isActive: coupon.isActive !== undefined ? coupon.isActive : true,
        method: coupon.method || 'code',
        buyXProduct: coupon.buyXProduct || '',
        buyXQty: coupon.buyXQty || '1',
        getYProduct: coupon.getYProduct || '',
        getYQty: coupon.getYQty || '1',
        getYDiscount: coupon.getYDiscount || '100',
        eligibility: coupon.eligibility || 'all'
      });
    } else {
      setFormData(prev => ({
        ...prev,
        discountType: initialDiscountType || 'percentage',
        appliesTo: initialAppliesTo || 'all'
      }));
    }
  }, [coupon, initialDiscountType, initialAppliesTo]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'text' && name === 'code' ? value.toUpperCase() : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        ...formData,
        discountPercentage: formData.discountType === 'percentage' ? Number(formData.discountValue) : 0,
        discountValue: formData.discountType === 'shipping' ? 0 : (Number(formData.discountValue) || 0),
        minOrderAmount: Number(formData.minOrderAmount) || 0,
        buyXQty: Number(formData.buyXQty) || 1,
        getYQty: Number(formData.getYQty) || 1,
        getYDiscount: Number(formData.getYDiscount) || 100
      };

      let res;
      if (coupon) {
        res = await storeAdminService.updateCoupon(coupon._id, payload);
      } else {
        res = await storeAdminService.createCoupon(payload);
      }

      if (res.success) {
        onSuccess(res.data);
      } else {
        setError(res.message || 'Failed to save discount');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save discount. Check parameters or unique code.');
    } finally {
      setLoading(false);
    }
  };

  // Autocomplete suggestions state & logic
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState(''); // 'productName', 'buyXProduct', 'getYProduct'

  useEffect(() => {
    if (!activeSearchField) {
      setSuggestions([]);
      return;
    }
    const queryVal = formData[activeSearchField];
    if (!queryVal || queryVal.trim().length < 1) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        setFetchingSuggestions(true);
        const res = await getProducts({ search: queryVal, limit: 10 });
        if (res && res.success && Array.isArray(res.data)) {
          setSuggestions(res.data);
        }
      } catch (err) {
        console.error("Error fetching product suggestions:", err);
      } finally {
        setFetchingSuggestions(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(delayDebounce);
  }, [formData.productName, formData.buyXProduct, formData.getYProduct, activeSearchField]);

  const handleSelectProduct = (productTitle) => {
    setFormData(prev => ({ ...prev, [activeSearchField]: productTitle }));
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Get tomorrow's date for minimum validUntil
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const typeLabels = {
    percentage: 'Amount off products (Percentage)',
    fixed: 'Amount off order (Fixed)',
    shipping: 'Free shipping',
    buy_x_get_y: 'Buy X get Y'
  };

  const renderSuggestions = () => {
    if (!showSuggestions || (suggestions.length === 0 && !fetchingSuggestions)) return null;
    return (
      <div style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        background: 'white',
        border: '1px solid #babfc3',
        borderRadius: '4px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 2000,
        maxHeight: '160px',
        overflowY: 'auto',
        marginTop: '4px'
      }}>
        {fetchingSuggestions ? (
          <div style={{ padding: '8px 12px', color: '#909399', fontSize: '12px' }}>Searching...</div>
        ) : (
          suggestions.map((p) => {
            const displayTitle = p.title || p.name || `${p.brand} ${p.sku}`;
            return (
              <div
                key={p._id}
                onClick={() => handleSelectProduct(displayTitle)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f2f6fc',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f5f7fa'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {p.images?.[0] && (
                  <img 
                    src={p.images[0]} 
                    alt="" 
                    style={{ width: '24px', height: '24px', objectFit: 'cover', borderRadius: '4px' }} 
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                  <span style={{ fontWeight: '600', color: '#303133', fontSize: '12px', lineHeight: '1.2' }}>{displayTitle}</span>
                  <span style={{ fontSize: '10px', color: '#909399', marginTop: '2px' }}>
                    SKU: {p.sku} • ₹{p.price?.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="store-modal-overlay">
      <div className="store-modal-content" style={{ maxWidth: '600px', animation: 'modalFadeIn 0.3s ease-out' }}>
        <div className="store-modal-header">
          <h2>{coupon ? 'Edit Discount' : 'Create Discount'}</h2>
          <span style={{ fontSize: '13px', background: '#e0e7ff', color: '#4f46e5', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
            {typeLabels[formData.discountType] || 'Discount'}
          </span>
          <button className="close-btn" onClick={onClose} disabled={loading}>&times;</button>
        </div>

        {error && <div className="store-error-banner" style={{ margin: '1rem', padding: '10px', background: '#fef2f2', color: '#b91c1c', borderRadius: '4px', fontSize: '13px' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="store-modal-form" style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
          
          {/* Method: Code vs Automatic */}
          <div className="form-group" style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>Method</label>
            <div style={{ display: 'flex', gap: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', color: '#202223', fontWeight: '500' }}>
                <input
                  type="radio"
                  name="method"
                  value="code"
                  checked={formData.method === 'code'}
                  onChange={handleChange}
                />
                Discount Code
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', color: '#202223', fontWeight: '500' }}>
                <input
                  type="radio"
                  name="method"
                  value="automatic"
                  checked={formData.method === 'automatic'}
                  onChange={handleChange}
                />
                Automatic Discount
              </label>
            </div>
            <small style={{ display: 'block', marginTop: '6px', color: '#6d7175', fontSize: '11px' }}>
              {formData.method === 'automatic'
                ? "Applied automatically at checkout when eligibility criteria are met."
                : "Customers must enter a code to apply this discount."}
            </small>
          </div>

          {/* Discount Code or Title */}
          <div className="form-group">
            <label htmlFor="code">
              {formData.method === 'automatic' ? 'Discount Title (Automatic) *' : 'Discount Code *'}
            </label>
            <input
              type="text"
              id="code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder={formData.method === 'automatic' ? 'e.g. Free shipping on Tissot' : 'e.g. SUMMER20'}
              required
              maxLength={40}
              autoComplete="off"
            />
            <small>{formData.method === 'automatic' ? 'Describe the offer for staff records.' : 'Must be unique, uppercase letters and numbers only.'}</small>
          </div>

          {/* Conditional inputs for different types */}
          {formData.discountType !== 'shipping' && formData.discountType !== 'buy_x_get_y' && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="discountType">Discount Type</label>
                <select
                  id="discountType"
                  name="discountType"
                  value={formData.discountType}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px', border: '1px solid #dcdfe6', borderRadius: '4px' }}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="discountValue">
                  {formData.discountType === 'percentage' ? 'Discount (%) *' : 'Discount Value (₹) *'}
                </label>
                <input
                  type="number"
                  id="discountValue"
                  name="discountValue"
                  value={formData.discountValue}
                  onChange={handleChange}
                  placeholder={formData.discountType === 'percentage' ? 'e.g. 15' : 'e.g. 500'}
                  min="1"
                  max={formData.discountType === 'percentage' ? "100" : undefined}
                  required
                />
              </div>
            </div>
          )}

          {/* Applies To & Min Order amount for standard discounts */}
          {formData.discountType !== 'buy_x_get_y' && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="appliesTo">Applies To</label>
                <select
                  id="appliesTo"
                  name="appliesTo"
                  value={formData.appliesTo}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px', border: '1px solid #dcdfe6', borderRadius: '4px' }}
                >
                  <option value="all">All Products</option>
                  <option value="collection">Specific Brand (Collection)</option>
                  <option value="product">Specific Product</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="minOrderAmount">Min Order Amount (₹) *</label>
                <input
                  type="number"
                  id="minOrderAmount"
                  name="minOrderAmount"
                  value={formData.minOrderAmount}
                  onChange={handleChange}
                  placeholder="e.g. 500"
                  min="0"
                  required
                />
              </div>
            </div>
          )}

          {/* Specific Collection Brand */}
          {formData.discountType !== 'buy_x_get_y' && formData.appliesTo === 'collection' && (
            <div className="form-group" style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <label htmlFor="collectionName">Brand / Collection Name *</label>
              <input
                type="text"
                id="collectionName"
                name="collectionName"
                value={formData.collectionName}
                onChange={handleChange}
                placeholder="e.g. TISSOT"
                required
              />
              <small>Case-insensitive match. E.g. TISSOT, SEIKO, RADO</small>
            </div>
          )}

          {/* Specific Product Autocomplete */}
          {formData.discountType !== 'buy_x_get_y' && formData.appliesTo === 'product' && (
            <div className="form-group" style={{ animation: 'fadeIn 0.3s ease-out', position: 'relative' }}>
              <label htmlFor="productName">Product Name or ID *</label>
              <input
                type="text"
                id="productName"
                name="productName"
                value={formData.productName}
                onChange={handleChange}
                onFocus={() => {
                  setActiveSearchField('productName');
                  setShowSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                placeholder="e.g. Tissot PRX"
                required
                autoComplete="off"
              />
              <small>Matches product titles containing this name (case-insensitive).</small>
              {activeSearchField === 'productName' && renderSuggestions()}
            </div>
          )}

          {/* Buy X Get Y layout */}
          {formData.discountType === 'buy_x_get_y' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '6px', margin: '0.5rem 0 1rem 0' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#475569', margin: '0 0 0.5rem 0' }}>Buy X Get Y Rules</h3>
              
              {/* Customer Buys X */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="buyXQty">Customer buys quantity *</label>
                  <input
                    type="number"
                    id="buyXQty"
                    name="buyXQty"
                    value={formData.buyXQty}
                    onChange={handleChange}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label htmlFor="buyXProduct">Product X (Watch Title) *</label>
                  <input
                    type="text"
                    id="buyXProduct"
                    name="buyXProduct"
                    value={formData.buyXProduct}
                    onChange={handleChange}
                    onFocus={() => {
                      setActiveSearchField('buyXProduct');
                      setShowSuggestions(true);
                    }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                    placeholder="e.g. Alba Mechanical"
                    required
                    autoComplete="off"
                  />
                  {activeSearchField === 'buyXProduct' && renderSuggestions()}
                </div>
              </div>

              {/* Customer Gets Y */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="getYQty">Customer gets quantity *</label>
                  <input
                    type="number"
                    id="getYQty"
                    name="getYQty"
                    value={formData.getYQty}
                    onChange={handleChange}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label htmlFor="getYProduct">Product Y (Watch Title) *</label>
                  <input
                    type="text"
                    id="getYProduct"
                    name="getYProduct"
                    value={formData.getYProduct}
                    onChange={handleChange}
                    onFocus={() => {
                      setActiveSearchField('getYProduct');
                      setShowSuggestions(true);
                    }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                    placeholder="e.g. Seiko 5"
                    required
                    autoComplete="off"
                  />
                  {activeSearchField === 'getYProduct' && renderSuggestions()}
                </div>
              </div>

              {/* Discount on Y */}
              <div className="form-group">
                <label htmlFor="getYDiscount">Discount percentage on Y (%) *</label>
                <input
                  type="number"
                  id="getYDiscount"
                  name="getYDiscount"
                  value={formData.getYDiscount}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  required
                />
                <small>Enter 100 for FREE, or less for a partial percentage discount.</small>
              </div>
            </div>
          )}


          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label htmlFor="validUntil">Valid Until (Expiration Date) *</label>
            <input
              type="date"
              id="validUntil"
              name="validUntil"
              value={formData.validUntil}
              onChange={handleChange}
              min={coupon ? undefined : minDate}
              required
            />
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '1rem', marginBottom: '1.5rem' }}>
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0 }}
            />
            <label htmlFor="isActive" style={{ cursor: 'pointer', margin: 0, fontSize: '14px', fontWeight: '500', color: '#202223', userSelect: 'none' }}>
              Is Active (Available for customers instantly)
            </label>
          </div>

          <div className="store-modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-ims" disabled={loading}>
              {loading ? 'Saving...' : coupon ? 'Update Discount' : 'Create Discount'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CouponModal;
