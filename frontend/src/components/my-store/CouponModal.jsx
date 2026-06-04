import { useState, useEffect } from 'react';
import storeAdminService from '../../services/storeAdminService';
import './CouponModal.css';

const CouponModal = ({ coupon, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    code: '',
    discountPercentage: '',
    minOrderAmount: '0',
    validUntil: '',
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (coupon) {
      setFormData({
        code: coupon.code || '',
        discountPercentage: coupon.discountPercentage || '',
        minOrderAmount: coupon.minOrderAmount || '0',
        validUntil: coupon.validUntil ? coupon.validUntil.split('T')[0] : '',
        isActive: coupon.isActive !== undefined ? coupon.isActive : true
      });
    }
  }, [coupon]);

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
      let res;
      if (coupon) {
        res = await storeAdminService.updateCoupon(coupon._id, formData);
      } else {
        res = await storeAdminService.createCoupon(formData);
      }

      if (res.success) {
        onSuccess(res.data);
      } else {
        setError(res.message || 'Failed to save coupon');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save coupon. Code might already exist.');
    } finally {
      setLoading(false);
    }
  };

  // Get tomorrow's date for minimum validUntil
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="store-modal-overlay" onClick={onClose}>
      <div className="store-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="store-modal-header">
          <h2>{coupon ? 'Edit Coupon' : 'Create New Coupon'}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="store-modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="store-modal-form">
          <div className="form-group">
            <label htmlFor="code">Coupon Code *</label>
            <input
              type="text"
              id="code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="e.g. SUMMER20"
              required
              maxLength={20}
              autoComplete="off"
            />
            <small>Must be unique, uppercase letters and numbers only.</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="discountPercentage">Discount (%) *</label>
              <input
                type="number"
                id="discountPercentage"
                name="discountPercentage"
                value={formData.discountPercentage}
                onChange={handleChange}
                placeholder="e.g. 15"
                min="1"
                max="100"
                required
              />
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

          <div className="form-group">
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

          <div className="form-group toggle-group">
            <label className="toggle-label">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
              />
              <span className="toggle-slider"></span>
              Is Active (Available for customers instantly)
            </label>
          </div>

          <div className="store-modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-ims" disabled={loading}>
              {loading ? 'Saving...' : coupon ? 'Update Coupon' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CouponModal;
