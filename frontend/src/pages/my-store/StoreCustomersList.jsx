import React, { useState, useEffect } from 'react';
import storeAdminService from '../../services/storeAdminService';
import './StoreCustomers.css'; // sharing identical premium container/loading styling class definitions

const StoreCustomersList = () => {
  const [customersList, setCustomersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      const customersRes = await storeAdminService.getCustomers();
      const ordersRes = await storeAdminService.getOrders();

      if (customersRes.success) {
        const custs = customersRes.data || [];
        const ords = ordersRes.success ? (ordersRes.data || []) : [];

        // Map orders details dynamically to aggregate values per customer
        const mapped = custs.map(customer => {
          const customerOrders = ords.filter(o => 
            o.user?._id === customer._id || 
            o.shippingAddress?.email?.toLowerCase() === customer.email?.toLowerCase()
          );

          const totalSpent = customerOrders.reduce((acc, o) => {
            if (o.paymentStatus?.toLowerCase() === 'paid') {
              return acc + (o.total || o.totalAmount || 0);
            }
            return acc;
          }, 0);

          // Locate primary address from shipping profiles of orders
          const addressWithDetails = customerOrders.find(o => o.shippingAddress?.address);
          const primaryAddress = addressWithDetails ? addressWithDetails.shippingAddress : null;

          return {
            ...customer,
            ordersCount: customerOrders.length,
            totalSpent,
            primaryAddress
          };
        });

        setCustomersList(mapped);
      }
    } catch (err) {
      console.error('Failed to load customers directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, []);

  // Filter customers based on search query
  const filtered = customersList.filter(c => {
    const term = searchTerm.toLowerCase();
    const matchesName = (c.name || '').toLowerCase().includes(term);
    const matchesEmail = (c.email || '').toLowerCase().includes(term);
    const matchesPhone = (c.mobile || '').toLowerCase().includes(term);
    const matchesCity = (c.primaryAddress?.city || '').toLowerCase().includes(term);
    const matchesState = (c.primaryAddress?.state || '').toLowerCase().includes(term);
    
    return matchesName || matchesEmail || matchesPhone || matchesCity || matchesState;
  });

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) return <div className="store-loading">Loading Customers Directory...</div>;

  return (
    <div className="store-dashboard customer-list-container" style={{ background: '#f6f6f7', minHeight: '85vh', padding: '1.5rem' }}>
      
      {/* Header */}
      <div className="store-page-header" style={{ marginBottom: '1.5rem', background: 'transparent', padding: 0 }}>
        <div className="page-title-box">
          <p className="page-subtitle" style={{ letterSpacing: '0.05em', color: '#6d7175' }}>DIRECTORY</p>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#202223', margin: '4px 0' }}>Customers</h1>
          <p className="page-desc" style={{ color: '#6d7175' }}>Access accounts, profiles, registration timestamps, order volumes, and shipping profiles.</p>
        </div>
        <div className="page-actions">
          <button className="btn-dark" onClick={fetchCustomerData} style={{ padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>Refresh Directory</button>
        </div>
      </div>

      {/* Directory Search Filters */}
      <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e1e3e5', padding: '12px 16px', marginBottom: '1.5rem', display: 'flex', gap: '10px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input 
            type="text"
            placeholder="Search customers by name, email, phone, city, or state..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #babfc3',
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#6d7175',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Customers List Box */}
      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e1e3e5', overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6d7175', fontSize: '14px' }}>
            No customer accounts found matching your query.
          </div>
        ) : (
          <>
            {!isMobile ? (
              // Desktop View Grid
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e1e3e5' }}>
                    <th style={{ padding: '12px 16px', color: '#202223', fontWeight: 600, width: '40px' }}></th>
                    <th style={{ padding: '12px 16px', color: '#202223', fontWeight: 600 }}>Customer Profile</th>
                    <th style={{ padding: '12px 16px', color: '#202223', fontWeight: 600 }}>Contact Info</th>
                    <th style={{ padding: '12px 16px', color: '#202223', fontWeight: 600 }}>Primary Address</th>
                    <th style={{ padding: '12px 16px', color: '#202223', fontWeight: 600, textAlign: 'center' }}>Total Orders</th>
                    <th style={{ padding: '12px 16px', color: '#202223', fontWeight: 600, textAlign: 'right' }}>Total Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const isExpanded = expandedId === c._id;
                    const initials = c.name ? c.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'C';
                    
                    return (
                      <React.Fragment key={c._id}>
                        <tr 
                          onClick={() => toggleExpand(c._id)}
                          style={{ 
                            borderBottom: '1px solid #e1e3e5', 
                            cursor: 'pointer',
                            background: isExpanded ? '#f4f6f8' : 'transparent',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <svg 
                              width="12" 
                              height="12" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="3" 
                              style={{ 
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease'
                              }}
                            >
                              <path d="m6 9 6 6 6-6"/>
                            </svg>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ 
                                width: '36px', 
                                height: '36px', 
                                borderRadius: '50%', 
                                background: '#e3f1df', 
                                color: '#108043', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontWeight: 'bold', 
                                fontSize: '13px'
                              }}>
                                {initials}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <strong style={{ color: '#202223', fontSize: '13.5px' }}>{c.name || 'Anonymous Customer'}</strong>
                                <span style={{ fontSize: '11px', color: '#6d7175' }}>Registered {new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ color: '#202223' }}>{c.email}</span>
                              <span style={{ color: '#6d7175', fontSize: '12px' }}>{c.mobile || 'No contact number'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px', color: '#6d7175', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.primaryAddress ? (
                              <span>{c.primaryAddress.city}, {c.primaryAddress.state}</span>
                            ) : (
                              <em style={{ color: '#919eab' }}>No shipping profile yet</em>
                            )}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: '#202223' }}>
                            {c.ordersCount}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: '#108043', fontSize: '14px' }}>
                            ₹{c.totalSpent.toLocaleString('en-IN')}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e1e3e5' }}>
                            <td colSpan="6" style={{ padding: '20px 24px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                                
                                {/* User Core Profile Box */}
                                <div style={{ background: 'white', border: '1px solid #e1e3e5', padding: '16px', borderRadius: '6px' }}>
                                  <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', textTransform: 'uppercase', color: '#6d7175', letterSpacing: '0.05em' }}>Profile Info</h4>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                    <p style={{ margin: 0 }}><strong>ID:</strong> <code style={{ fontSize: '11px', color: '#6d7175' }}>{c._id}</code></p>
                                    <p style={{ margin: 0 }}><strong>Name:</strong> {c.name || 'N/A'}</p>
                                    <p style={{ margin: 0 }}><strong>Email:</strong> {c.email}</p>
                                    <p style={{ margin: 0 }}><strong>Phone:</strong> {c.mobile || 'N/A'}</p>
                                  </div>
                                </div>

                                {/* Addresses & Logistics Box */}
                                <div style={{ background: 'white', border: '1px solid #e1e3e5', padding: '16px', borderRadius: '6px' }}>
                                  <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', textTransform: 'uppercase', color: '#6d7175', letterSpacing: '0.05em' }}>Primary Shipping Profile</h4>
                                  {c.primaryAddress ? (
                                    <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                                      <p style={{ margin: '0 0 4px 0', fontWeight: 600 }}>{c.primaryAddress.name}</p>
                                      <p style={{ margin: '0 0 4px 0', color: '#202223' }}>{c.primaryAddress.address}</p>
                                      {c.primaryAddress.addressLine2 && <p style={{ margin: '0 0 4px 0', color: '#202223' }}>{c.primaryAddress.addressLine2}</p>}
                                      <p style={{ margin: 0, color: '#6d7175' }}>{c.primaryAddress.city}, {c.primaryAddress.state} - <strong>{c.primaryAddress.pincode}</strong></p>
                                      {c.primaryAddress.phone && <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6d7175' }}><strong>Shipping Phone:</strong> {c.primaryAddress.phone}</p>}
                                    </div>
                                  ) : (
                                    <div style={{ color: '#6d7175', padding: '10px 0', fontSize: '13px' }}>
                                      This user has not completed any shipping checkouts yet. Address details will sync automatically when they place an order.
                                    </div>
                                  )}
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              // Mobile View Card List
              <div style={{ background: '#f4f6f8', padding: '10px' }}>
                {filtered.map(c => {
                  const isExpanded = expandedId === c._id;
                  const initials = c.name ? c.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'C';

                  return (
                    <div 
                      key={c._id} 
                      style={{ 
                        background: 'white', 
                        border: '1px solid #e1e3e5', 
                        borderRadius: '8px', 
                        padding: '16px', 
                        marginBottom: '10px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                      onClick={() => toggleExpand(c._id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '50%', 
                            background: '#e3f1df', 
                            color: '#108043', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontWeight: 'bold', 
                            fontSize: '12px'
                          }}>
                            {initials}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ color: '#202223', fontSize: '13.5px' }}>{c.name || 'Anonymous Customer'}</strong>
                            <span style={{ fontSize: '10px', color: '#6d7175' }}>Orders: {c.ordersCount}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <strong style={{ color: '#108043', fontSize: '14px' }}>₹{c.totalSpent.toLocaleString('en-IN')}</strong>
                          <span style={{ display: 'block', fontSize: '9px', color: '#6d7175' }}>total spent</span>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f2f4', fontSize: '12.5px', color: '#202223' }}>
                          <div style={{ marginBottom: '10px' }}>
                            <p style={{ margin: '0 0 2px 0', color: '#6d7175', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>Contact Info</p>
                            <p style={{ margin: '0 0 2px 0' }}><strong>Email:</strong> {c.email}</p>
                            <p style={{ margin: 0 }}><strong>Phone:</strong> {c.mobile || 'N/A'}</p>
                          </div>
                          
                          <div>
                            <p style={{ margin: '0 0 4px 0', color: '#6d7175', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>Primary Shipping Profile</p>
                            {c.primaryAddress ? (
                              <div style={{ background: '#f9fafb', padding: '10px', borderRadius: '4px', border: '1px solid #f1f2f4' }}>
                                <p style={{ margin: '0 0 2px 0', fontWeight: 600 }}>{c.primaryAddress.name}</p>
                                <p style={{ margin: '0 0 2px 0' }}>{c.primaryAddress.address}</p>
                                {c.primaryAddress.addressLine2 && <p style={{ margin: '0 0 2px 0' }}>{c.primaryAddress.addressLine2}</p>}
                                <p style={{ margin: 0, color: '#6d7175' }}>{c.primaryAddress.city}, {c.primaryAddress.state} - {c.primaryAddress.pincode}</p>
                              </div>
                            ) : (
                              <p style={{ margin: 0, color: '#919eab', fontStyle: 'italic' }}>No addresses recorded</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6d7175" strokeWidth="3">
                            <path d="m6 9 6 6 6-6"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
};

export default StoreCustomersList;
