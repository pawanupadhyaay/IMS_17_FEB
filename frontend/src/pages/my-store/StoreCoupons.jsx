import { useState, useEffect } from 'react';
import storeAdminService from '../../services/storeAdminService';
import CouponModal from '../../components/my-store/CouponModal';
import './StoreDashboard.css';
import './StoreAdminTables.css';
import { toast } from 'react-hot-toast';

const StoreCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);

  const fetchCoupons = async () => {
    try {
      const res = await storeAdminService.getCoupons();
      if (res.success) setCoupons(res.data);
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleDelete = async (id) => {
    if(window.confirm('Are you sure you want to delete this coupon?')) {
      try {
        await storeAdminService.deleteCoupon(id);
        toast.success('Coupon deleted');
        fetchCoupons();
      } catch (err) {
        toast.error('Failed to delete coupon');
      }
    }
  };

  const handleEdit = (coupon) => {
    setSelectedCoupon(coupon);
    setShowModal(true);
  };

  const handleCreateNew = () => {
    setSelectedCoupon(null);
    setShowModal(true);
  };

  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(c => c.isActive).length;
  const expiredCoupons = coupons.filter(c => new Date(c.validUntil) < new Date()).length;

  if (loading) return <div className="store-loading">Loading Coupons...</div>;

  return (
    <div className="store-dashboard">
      <div className="store-page-header">
        <div className="page-title-box">
          <p className="page-subtitle">OVERVIEW</p>
          <h1>Discounts & Coupons</h1>
          <p className="page-desc">Manage discounts and seasonal offers.</p>
        </div>
        <div className="page-actions">
          <button className="btn-outline">Export</button>
          <button className="btn-dark" onClick={handleCreateNew}>
             <svg style={{width: '16px', height: '16px', marginRight: '6px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
             New Coupon
          </button>
        </div>
      </div>

      <div className="store-metrics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="metric-card">
          <div className="metric-card-header">
            <p className="metric-label">TOTAL</p>
            <div className="metric-icon-box blue">
              <svg style={{width: '24px'}} fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" /><path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
            </div>
          </div>
          <h2>{totalCoupons}</h2>
        </div>
        <div className="metric-card" style={{background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', color: 'white', borderColor: '#059669'}}>
          <div className="metric-card-header">
            <p className="metric-label" style={{color: '#d1fae5'}}>ACTIVE</p>
             <div className="metric-icon-box" style={{background: 'rgba(255,255,255,0.2)', color: 'white'}}>
              <svg style={{width: '24px'}} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            </div>
          </div>
          <h2 style={{color: 'white'}}>{activeCoupons}</h2>
        </div>
        <div className="metric-card">
          <div className="metric-card-header">
             <p className="metric-label">EXPIRED</p>
             <div className="metric-icon-box red">
              <svg style={{width: '24px'}} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            </div>
          </div>
          <h2>{expiredCoupons}</h2>
        </div>
      </div>

      <div className="store-table-container">
        <div className="store-table-header">
          <div>
            <h3>Active Coupons</h3>
            <p>Create and manage coupon codes for your store</p>
          </div>
          <div className="page-actions">
            <button className="btn-outline" onClick={fetchCoupons}>
              <svg style={{width: '14px', height: '14px', marginRight: '6px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              Refresh
            </button>
            <button className="btn-dark" onClick={handleCreateNew}>Add coupon</button>
          </div>
        </div>
        
        {coupons.length === 0 ? (
          <div className="store-empty">No coupons found.</div>
        ) : (
          <div className="table-responsive">
            <table className="store-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Value</th>
                  <th>Type</th>
                  <th>Min Order</th>
                  <th>Uses</th>
                  <th>Valid Until</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon._id} className="store-table-row">
                    <td><span className="code-badge">{coupon.code}</span></td>
                    <td style={{fontWeight: '800', color: '#10b981'}}>{coupon.discountPercentage}%</td>
                    <td style={{color: '#64748b'}}>Percentage</td>
                    <td style={{fontWeight: '600'}}>₹{coupon.minOrderAmount}</td>
                    <td><span style={{fontWeight: '700'}}>{coupon.uses || 0}</span> <span style={{fontSize: '11px', color: '#94a3b8'}}>uses</span></td>
                    <td style={{color: '#64748b'}}>{new Date(coupon.validUntil).toLocaleDateString('en-GB')}</td>
                    <td>
                      <span className={`live-badge ${!coupon.isActive && 'inactive'}`}>
                        <div className={`pulse-dot ${!coupon.isActive && 'inactive'}`}></div>
                        {coupon.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions-group">
                         <button className="action-icon-btn" onClick={() => handleEdit(coupon)} title="Edit">
                           <svg style={{width: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                         </button>
                         <button className="action-icon-btn delete" onClick={() => handleDelete(coupon._id)} title="Delete">
                           <svg style={{width: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                         </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="store-page-header" style={{ marginTop: '0', background: '#0f172a', color: 'white' }}>
        <div className="page-title-box">
          <p className="page-subtitle" style={{color: '#94a3b8'}}>
            <svg style={{width: '14px', marginRight: '6px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M4 15h16a1 1 0 001-1V8a1 1 0 00-1-1H4a1 1 0 00-1 1v6a1 1 0 001 1z"></path></svg>
            API ENDPOINT
          </p>
          <p style={{ margin: '0.5rem 0 0 0', color: '#34d399', fontFamily: 'monospace', fontSize: '14px' }}>{`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store-admin/coupons`}</p>
        </div>
        <button className="btn-outline dark-mode-btn" onClick={() => {
          navigator.clipboard.writeText(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/store-admin/coupons`);
          toast.success('Copied to clipboard');
        }}>
          <svg style={{width: '14px', marginRight: '6px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
          Copy URL
        </button>
      </div>

      {showModal && (
        <CouponModal
          coupon={selectedCoupon}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            fetchCoupons();
            setShowModal(false);
            toast.success(selectedCoupon ? 'Coupon updated' : 'Coupon created');
          }}
        />
      )}
    </div>
  );
};

export default StoreCoupons;
