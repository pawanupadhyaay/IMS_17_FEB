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
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  
  // Choice states for new coupons
  const [chosenType, setChosenType] = useState('percentage');
  const [chosenAppliesTo, setChosenAppliesTo] = useState('all');

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

  // Lock background page scroll when any modal is open
  useEffect(() => {
    if (showTypeSelector || showModal || deleteTargetId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showTypeSelector, showModal, deleteTargetId]);

  const handleDelete = (id) => {
    setDeleteTargetId(id);
  };

  const executeDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await storeAdminService.deleteCoupon(deleteTargetId);
      toast.success('Discount deleted');
      fetchCoupons();
    } catch (err) {
      toast.error('Failed to delete discount');
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleEdit = (coupon) => {
    setSelectedCoupon(coupon);
    setChosenType(coupon.discountType || 'percentage');
    setChosenAppliesTo(coupon.appliesTo || 'all');
    setShowModal(true);
  };

  const handleOpenTypeSelector = () => {
    setSelectedCoupon(null);
    setShowTypeSelector(true);
  };

  const handleSelectType = (type, appliesTo) => {
    setChosenType(type);
    setChosenAppliesTo(appliesTo);
    setShowTypeSelector(false);
    setShowModal(true);
  };

  // Filter coupons based on search
  const filteredCoupons = coupons.filter(c => {
    const query = searchQuery.toLowerCase();
    return (
      (c.code || '').toLowerCase().includes(query) ||
      (c.discountType || '').toLowerCase().includes(query) ||
      (c.collectionName || '').toLowerCase().includes(query) ||
      (c.productName || '').toLowerCase().includes(query)
    );
  });

  const getSummary = (c) => {
    if (c.discountType === 'shipping') {
      return 'Free shipping on entire order';
    }
    if (c.discountType === 'buy_x_get_y') {
      return `Buy ${c.buyXQty} of ${c.buyXProduct || 'X'}, get ${c.getYQty} of ${c.getYProduct || 'Y'} (${c.getYDiscount}% off)`;
    }
    const valStr = c.discountType === 'percentage' ? `${c.discountPercentage}%` : `₹${c.discountValue}`;
    let scope = 'entire order';
    if (c.appliesTo === 'collection' && c.collectionName) scope = `${c.collectionName} brand`;
    if (c.appliesTo === 'product' && c.productName) scope = `specific products`;
    return `${valStr} off ${scope}`;
  };

  const getStatusBadge = (c) => {
    const isExpired = new Date(c.validUntil) < new Date();
    if (!c.isActive) return <span style={{ background: '#f4f4f5', color: '#71717a', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Inactive</span>;
    if (isExpired) return <span style={{ background: '#f4f4f5', color: '#71717a', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Expired</span>;
    return <span style={{ background: '#e6f4ea', color: '#108043', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Active</span>;
  };

  const getTypeLabel = (c) => {
    if (c.discountType === 'shipping') return 'Free shipping';
    if (c.discountType === 'buy_x_get_y') return 'Buy X get Y';
    if (c.appliesTo === 'product' || c.appliesTo === 'collection') return 'Amount off products';
    return 'Amount off order';
  };

  const baseApi = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const couponsApiUrl = baseApi.endsWith('/api') ? `${baseApi}/store-admin/coupons` : `${baseApi}/api/store-admin/coupons`;

  if (loading) return <div className="store-loading">Loading Discounts...</div>;

  return (
    <div className="store-dashboard store-coupons-container" style={{ background: '#f6f6f7', minHeight: '85vh' }}>
      <style>{`
        .store-coupons-container {
          padding: 2rem;
        }
        .store-coupons-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .store-coupons-table th {
          padding: 12px 16px;
          color: #202223;
          font-weight: 600;
          font-size: 13px;
          background: #f9fafb;
          border-bottom: 1px solid #e1e3e5;
        }
        .store-coupons-table td {
          padding: 16px;
          color: #202223;
          font-size: 13px;
          border-bottom: 1px solid #e1e3e5;
          vertical-align: middle;
        }
        .store-coupons-row {
          transition: background 0.1s ease;
        }
        .store-coupons-row:hover {
          background: #fbfbfc;
        }
        
        /* Desktop vs Mobile display mapping */
        .desktop-only-table {
          display: block;
        }
        .mobile-only-cards {
          display: none;
        }

        @media (max-width: 768px) {
          .desktop-only-table {
            display: none !important;
          }
          .mobile-only-cards {
            display: flex !important;
            flex-direction: column;
            gap: 12px;
            padding: 12px;
            background: #f6f6f7;
          }
          .store-coupons-container {
            padding: 1rem !important;
          }
          .store-page-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .store-page-header .page-actions {
            width: 100% !important;
            display: flex !important;
            gap: 10px !important;
          }
          .store-page-header .page-actions button {
            flex: 1 !important;
            text-align: center !important;
            justify-content: center !important;
          }
        }
      `}</style>
      
      {/* Header */}
      <div className="store-page-header" style={{ marginBottom: '1.5rem', background: 'transparent', padding: 0 }}>
        <div className="page-title-box">
          <p className="page-subtitle" style={{ letterSpacing: '0.05em', color: '#6d7175' }}>OVERVIEW</p>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#202223', margin: '4px 0' }}>Discounts</h1>
          <p className="page-desc" style={{ color: '#6d7175' }}>Manage discounts and seasonal offers.</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-outline" style={{ background: 'white' }}>Export</button>
          <button className="btn-dark" style={{ background: '#202223', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 600, padding: '8px 16px' }} onClick={handleOpenTypeSelector}>
             Create discount
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="store-table-container" style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e1e3e5', padding: '0' }}>
        
        {/* Table Filter Bar (Shopify search style) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '1rem', borderBottom: '1px solid #e1e3e5' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', color: '#8c9196' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input
              type="text"
              placeholder="Search and filter"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                border: '1px solid #babfc3',
                borderRadius: '4px',
                fontSize: '14px',
                outline: 'none',
                background: '#f9fafb'
              }}
            />
          </div>
        </div>

        {filteredCoupons.length === 0 ? (
          <div className="store-empty" style={{ padding: '3rem', textAlign: 'center', color: '#6d7175' }}>No discounts found matching search filters.</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="desktop-only-table">
              <div className="table-responsive">
                <table className="store-coupons-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e1e3e5' }}>
                      <th style={{ padding: '12px 16px', width: '40px' }}>
                        <input type="checkbox" style={{ cursor: 'pointer' }} readOnly />
                      </th>
                      <th style={{ padding: '12px 16px', color: '#202223', fontWeight: 600, fontSize: '13px' }}>Title</th>
                      <th style={{ padding: '12px 16px', color: '#202223', fontWeight: 600, fontSize: '13px' }}>Status</th>
                      <th style={{ padding: '12px 16px', color: '#202223', fontWeight: 600, fontSize: '13px' }}>Method</th>
                      <th style={{ padding: '12px 16px', color: '#202223', fontWeight: 600, fontSize: '13px' }}>Eligibility</th>
                      <th style={{ padding: '12px 16px', color: '#202223', fontWeight: 600, fontSize: '13px' }}>Type</th>
                      <th style={{ padding: '12px 16px', color: '#202223', fontWeight: 600, fontSize: '13px' }}>Used</th>
                      <th style={{ padding: '12px 16px', width: '100px', textAlign: 'right', color: '#202223', fontWeight: 600, fontSize: '13px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCoupons.map((coupon) => (
                      <tr key={coupon._id} className="store-coupons-row" style={{ borderBottom: '1px solid #e1e3e5' }}>
                        <td style={{ padding: '16px' }}>
                          <input type="checkbox" style={{ cursor: 'pointer' }} readOnly />
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '600', color: '#202223', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {coupon.code}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(coupon.code);
                                  toast.success(`Copied "${coupon.code}"`);
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'inline-flex', color: '#8c9196', transition: 'color 0.1s' }}
                                title="Copy Code"
                                onMouseEnter={(e) => e.currentTarget.style.color = '#202223'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#8c9196'}
                              >
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                </svg>
                              </button>
                            </span>
                            <span style={{ color: '#6d7175', fontSize: '12px', marginTop: '2px' }}>{getSummary(coupon)}</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>{getStatusBadge(coupon)}</td>
                        <td style={{ padding: '16px', color: '#202223', fontSize: '13px' }}>
                          {coupon.method === 'automatic' ? 'Automatic' : '1 code'}
                        </td>
                        <td style={{ padding: '16px', color: '#202223', fontSize: '13px' }}>
                          {coupon.eligibility === 'customer' ? 'Specific customers' : 'All customers'}
                        </td>
                        <td style={{ padding: '16px', color: '#202223', fontSize: '13px' }}>
                          {getTypeLabel(coupon)}
                        </td>
                        <td style={{ padding: '16px', color: '#202223', fontSize: '13px', fontWeight: 500 }}>
                          {coupon.uses || 0}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div className="table-actions-group" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                             <button className="action-icon-btn" onClick={() => handleEdit(coupon)} title="Edit" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: '#5c5f62' }}>
                               <svg style={{width: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                             </button>
                             <button className="action-icon-btn delete" onClick={() => handleDelete(coupon._id)} title="Delete" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: '#bf1d08' }}>
                               <svg style={{width: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                             </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card List View */}
            <div className="mobile-only-cards">
              {filteredCoupons.map((coupon) => (
                <div key={coupon._id} className="mobile-coupon-card" style={{
                  background: 'white',
                  border: '1px solid #e1e3e5',
                  borderRadius: '8px',
                  padding: '16px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: '700', color: '#202223', fontSize: '15px' }}>{coupon.code}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(coupon.code);
                          toast.success(`Copied "${coupon.code}"`);
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'inline-flex', color: '#8c9196' }}
                        title="Copy Code"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                      </button>
                    </div>
                    {getStatusBadge(coupon)}
                  </div>
                  <div style={{ color: '#202223', fontSize: '13px', fontWeight: '500', marginBottom: '12px' }}>
                    {getSummary(coupon)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f2f4', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', color: '#6d7175', fontSize: '11px' }}>
                      <span style={{ background: '#f1f2f4', padding: '2px 6px', borderRadius: '4px' }}>{coupon.method === 'automatic' ? 'Automatic' : '1 code'}</span>
                      <span style={{ background: '#f1f2f4', padding: '2px 6px', borderRadius: '4px' }}>{getTypeLabel(coupon)}</span>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{coupon.uses || 0} uses</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleEdit(coupon)} 
                        style={{ background: '#f4f4f5', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '4px', color: '#5c5f62', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Edit"
                      >
                        <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                      </button>
                      <button 
                        onClick={() => handleDelete(coupon._id)} 
                        style={{ background: '#fef2f2', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '4px', color: '#bf1d08', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Delete"
                      >
                        <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Copy Endpoint Bar */}
      <div className="store-page-header" style={{ marginTop: '1.5rem', background: '#0f172a', color: 'white', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-title-box">
          <p className="page-subtitle" style={{color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', fontSize: '11px', fontWeight: 600}}>
            <svg style={{width: '14px', marginRight: '6px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M4 15h16a1 1 0 001-1V8a1 1 0 00-1-1H4a1 1 0 00-1 1v6a1 1 0 001 1z"></path></svg>
            API ENDPOINT
          </p>
          <p style={{ margin: '0.25rem 0 0 0', color: '#34d399', fontFamily: 'monospace', fontSize: '13px' }}>{couponsApiUrl}</p>
        </div>
        <button className="btn-outline" style={{ background: '#1e293b', border: '1px solid #475569', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }} onClick={() => {
          navigator.clipboard.writeText(couponsApiUrl);
          toast.success('Copied to clipboard');
        }}>
          <svg style={{width: '14px', marginRight: '6px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
          Copy URL
        </button>
      </div>

      {/* Main Create/Edit Modal */}
      {showModal && (
        <CouponModal
          coupon={selectedCoupon}
          initialDiscountType={chosenType}
          initialAppliesTo={chosenAppliesTo}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchCoupons();
          }}
        />
      )}

      {/* Shopify Selection Modal popup */}
      {showTypeSelector && (
        <div className="store-modal-overlay" style={{ display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, alignItems: 'center', justifyContent: 'center' }}>
          <div className="store-modal-card" style={{ width: '92%', maxWidth: '520px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', overflow: 'hidden', animation: 'scaleUp 0.2s ease-out' }}>
            
            <div className="store-modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e1e3e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#202223', margin: 0 }}>Select discount type</h2>
              <button style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#5c5f62' }} onClick={() => setShowTypeSelector(false)}>&times;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem 0' }}>
              
              {/* Amount off products */}
              <div 
                onClick={() => handleSelectType('percentage', 'product')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 24px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f2f4'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f6f6f7'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ color: '#5c5f62', marginTop: '3px' }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#202223' }}>Amount off products</span>
                  <span style={{ fontSize: '12px', color: '#6d7175', marginTop: '2px' }}>Discount specific products or collections of products</span>
                </div>
                <div style={{ color: '#8c9196', marginTop: '4px' }}>&rsaquo;</div>
              </div>

              {/* Buy X get Y */}
              <div 
                onClick={() => handleSelectType('buy_x_get_y', 'all')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 24px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f2f4'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f6f6f7'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ color: '#5c5f62', marginTop: '3px' }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 3h2zm-9 4h18M5 12a2 2 0 110-4h14a2 2 0 110 4"></path>
                  </svg>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#202223' }}>Buy X get Y</span>
                  <span style={{ fontSize: '12px', color: '#6d7175', marginTop: '2px' }}>Discount specific products or collections of products</span>
                </div>
                <div style={{ color: '#8c9196', marginTop: '4px' }}>&rsaquo;</div>
              </div>

              {/* Amount off order */}
              <div 
                onClick={() => handleSelectType('fixed', 'all')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 24px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f2f4'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f6f6f7'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ color: '#5c5f62', marginTop: '3px' }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                  </svg>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#202223' }}>Amount off order</span>
                  <span style={{ fontSize: '12px', color: '#6d7175', marginTop: '2px' }}>Discount the total order amount</span>
                </div>
                <div style={{ color: '#8c9196', marginTop: '4px' }}>&rsaquo;</div>
              </div>

              {/* Free shipping */}
              <div 
                onClick={() => handleSelectType('shipping', 'all')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 24px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f2f4'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f6f6f7'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ color: '#5c5f62', marginTop: '3px' }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zm-2 1v-4h2v4m-5-8h5v5h-5V9z"></path>
                  </svg>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#202223' }}>Free shipping</span>
                  <span style={{ fontSize: '12px', color: '#6d7175', marginTop: '2px' }}>Offer free shipping on an order</span>
                </div>
                <div style={{ color: '#8c9196', marginTop: '4px' }}>&rsaquo;</div>
              </div>

            </div>

            <div style={{ padding: '1rem 1.5rem', background: '#f9fafb', borderTop: '1px solid #e1e3e5', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowTypeSelector(false)}
                style={{
                  background: 'white',
                  border: '1px solid #babfc3',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#202223',
                  padding: '6px 12px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Custom delete confirmation modal */}
      {deleteTargetId && (
        <div className="store-modal-overlay" style={{ display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2100, alignItems: 'center', justifyContent: 'center' }}>
          <div className="store-modal-card" style={{ width: '90%', maxWidth: '380px', background: 'white', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', overflow: 'hidden', animation: 'scaleUp 0.15s ease-out' }}>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ margin: '0 auto 12px auto', width: '48px', height: '48px', background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d32f2f' }}>
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#202223', margin: '0 0 8px 0' }}>Delete Discount?</h3>
              <p style={{ fontSize: '13px', color: '#6d7175', margin: 0, lineHeight: '1.5' }}>
                Are you sure you want to delete this discount? This action cannot be undone.
              </p>
            </div>
            <div style={{ padding: '1rem 1.5rem', background: '#f9fafb', borderTop: '1px solid #e1e3e5', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setDeleteTargetId(null)}
                style={{ background: 'white', border: '1px solid #babfc3', borderRadius: '4px', fontSize: '13px', fontWeight: 600, color: '#202223', padding: '8px 16px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={executeDelete}
                style={{ background: '#bf1d08', border: '1px solid transparent', borderRadius: '4px', fontSize: '13px', fontWeight: 600, color: 'white', padding: '8px 16px', cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StoreCoupons;
