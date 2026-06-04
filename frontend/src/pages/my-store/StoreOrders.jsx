import { useState, useEffect } from 'react';
import storeAdminService from '../../services/storeAdminService';
import './StoreDashboard.css';
import './StoreAdminTables.css';

// Simple SVG Icons to replace lucide-react
const Icons = {
  ChevronDown: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
  ),
  ChevronUp: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
  ),
  MapPin: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
  ),
  Mail: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
  ),
  Phone: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.27-2.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
  ),
  CreditCard: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
  )
};

const StoreOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchOrders = async () => {
    try {
      const res = await storeAdminService.getOrders();
      if (res.success) setOrders(res.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    storeAdminService.markOrdersAsRead().catch(err => console.error(err));
  }, []);

  // Reset back to first page when filtering tab or search queries
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const toggleExpand = (id) => {
    setExpandedOrderId(expandedOrderId === id ? null : id);
  };

  // Filter Logic
  const filteredOrders = orders.filter(order => {
    // 1. Tab Filter
    if (activeTab === 'Pending' && order.orderStatus !== 'pending') return false;
    if (activeTab === 'Paid' && order.paymentStatus?.toLowerCase() !== 'paid') return false;
    if (activeTab === 'Refunded' && order.paymentStatus?.toLowerCase() === 'refunded') return true; // example
    
    // 2. Search Filter (Order ID or Customer Name)
    const searchLow = searchTerm.toLowerCase();
    const matchesId = order._id.toLowerCase().includes(searchLow);
    const matchesName = (order.shippingAddress?.name || order.user?.name || '').toLowerCase().includes(searchLow);
    
    return matchesId || matchesName;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.orderStatus === 'pending').length,
    revenue: orders.reduce((acc, o) => acc + (o.total || o.totalAmount || 0), 0),
    paid: orders.filter(o => o.paymentStatus?.toLowerCase() === 'paid').length
  };

  if (loading) return <div className="store-loading">Loading Orders...</div>;

  return (
    <div className="store-dashboard">
      <div className="store-page-header">
        <div className="page-title-box">
          <p className="page-subtitle">OVERVIEW</p>
          <h1>Orders</h1>
          <p className="page-desc">Manage products, orders, inventory, and customers in real time.</p>
        </div>
        <div className="page-actions">
          <button className="btn-outline">Export</button>
          <button className="btn-dark" onClick={fetchOrders}>Refresh List</button>
        </div>
      </div>

      <div className="store-metrics-grid">
        <div className="metric-card">
          <p className="metric-label">TOTAL ORDERS</p>
          <h2>{stats.total}</h2>
        </div>
        <div className="metric-card">
          <p className="metric-label">PENDING ORDERS</p>
          <h2 style={{color: '#f5b041'}}>{stats.pending}</h2>
        </div>
        <div className="metric-card">
          <p className="metric-label">TOTAL REVENUE</p>
          <h2 className="revenue-text">₹{stats.revenue.toLocaleString('en-IN')}</h2>
        </div>
        <div className="metric-card">
          <p className="metric-label">PAID ORDERS</p>
          <h2 style={{color: '#008060'}}>{stats.paid}</h2>
        </div>
      </div>

      <div className="store-table-container">
        {/* Shopify Styling Tabs */}
        <div className="store-table-tabs">
          {['All', 'Pending', 'Paid'].map(tab => (
            <div 
              key={tab} 
              className={`table-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </div>
          ))}
        </div>

        {/* Search Bar */}
        <div className="store-table-filters">
          <div className="search-wrapper">
            <span className="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Filter orders by ID or customer..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {filteredOrders.length === 0 ? (
          <div className="store-empty">No orders matching your filters.</div>
        ) : (
          <table className="store-table">
            <thead className="desktop-only">
              <tr>
                <th className="col-order">Order</th>
                <th className="col-date">Date</th>
                <th className="col-customer">Customer</th>
                <th className="col-payment">Payment</th>
                <th className="col-fulfillment">Fulfillment</th>
                <th className="col-total" style={{textAlign: 'right'}}>Total</th>
              </tr>
            </thead>
            {paginatedOrders.map((order) => (
              <tbody key={order._id}>
                {/* Row */}
                <tr 
                  onClick={() => toggleExpand(order._id)}
                  className={`clickable-row ${expandedOrderId === order._id ? 'expanded' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Desktop Cells */}
                  <td className="desktop-only col-order">
                    <div className="flex items-center gap-2">
                      {expandedOrderId === order._id ? <Icons.ChevronUp size={14}/> : <Icons.ChevronDown size={14}/>}
                      <div className="flex flex-col">
                        <span className="order-id">#ORD-{order._id.slice(-6).toUpperCase()}</span>
                        {order.razorpayOrderId && (
                          <span className="text-[9px] text-neutral-500 font-medium tracking-tight">
                            {order.razorpayOrderId}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="desktop-only col-date">
                    {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="desktop-only col-customer">
                    <div className="customer-info-cell">
                      <strong>{order.shippingAddress?.name || order.user?.name || 'Guest'}</strong>
                    </div>
                  </td>
                  <td className="desktop-only col-payment">
                    <span className={`badge ${order.paymentStatus?.toLowerCase() === 'paid' ? 'green' : 'yellow'}`}>
                      {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                  <td className="desktop-only col-fulfillment">
                    <span className={`badge ${
                      ['confirmed', 'processing', 'delivered'].includes(order.orderStatus) ? 'green' : 'gray'
                    }`}>
                      {order.orderStatus === 'confirmed' ? 'Confirmed' : 
                       order.orderStatus === 'delivered' ? 'Fulfilled' : 
                       order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                    </span>
                  </td>
                  <td className="desktop-only col-total" style={{textAlign: 'right'}}>
                    <strong>₹{(order.total || order.totalAmount || 0).toLocaleString('en-IN')}</strong>
                  </td>

                  {/* Mobile Card Layout */}
                  <td className="mobile-only">
                    <div className="mobile-order-header">
                      <span className="order-id">#ORD-{order._id.slice(-6).toUpperCase()}</span>
                      <strong>₹{(order.total || order.totalAmount || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="mobile-meta">
                       <span>{new Date(order.createdAt).toLocaleDateString('en-GB')}</span>
                       <span>•</span>
                       <span>{order.shippingAddress?.name || order.user?.name || 'Guest'}</span>
                    </div>
                    <div className="mobile-total-status">
                       <span className={`badge ${order.paymentStatus?.toLowerCase() === 'paid' ? 'green' : 'yellow'}`}>
                         {order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                       </span>
                       <span className={`badge ${['confirmed', 'delivered'].includes(order.orderStatus) ? 'green' : 'gray'}`}>
                         {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                       </span>
                    </div>
                  </td>
                </tr>

                {/* Expanded Detail Panel */}
                {expandedOrderId === order._id && (
                  <tr className="order-details-expanded">
                    <td colSpan="6">
                      <div className="details-wrapper">
                        <div className="details-main">
                          <div className="items-card">
                            <h4>Items</h4>
                            {order.items?.map((item, idx) => (
                              <div key={idx} className="order-item-row">
                                <img 
                                  src={item.image || (item.product?.images?.[0]) || '/placeholder.png'} 
                                  alt="" 
                                  className="item-img"
                                  onError={(e) => e.target.src = 'https://placehold.co/48x48?text=Watch'}
                                />
                                <div className="item-info">
                                  <div className="flex items-center gap-2">
                                    <p className="item-name">{item.name || item.product?.title}</p>
                                    {item.product?.slug && (
                                      <a 
                                        href={`http://localhost:5173/products/${item.product.slug}`} 
                                        target="_blank" 
                                        className="text-primary hover:underline"
                                        style={{ fontSize: '10px', fontWeight: 'bold', color: '#0066cc' }}
                                      >
                                        VIEW
                                      </a>
                                    )}
                                  </div>
                                  <p className="item-meta">Qty: {item.quantity} • ₹{item.price?.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="item-total">
                                  <strong>₹{(item.price * item.quantity).toLocaleString('en-IN')}</strong>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="payment-timeline-card sidebar-card" style={{marginTop: '0'}}>
                             <h4>Transaction Info</h4>
                             <div className="space-y-1 mt-2">
                               <p className="flex justify-between"><strong>Status:</strong> <span className="text-green-600 font-bold">{order.paymentStatus?.toUpperCase()}</span></p>
                               <p className="flex justify-between"><strong>Method:</strong> <span className="text-neutral-600">{order.paymentMethod?.toUpperCase() || 'RAZORPAY'}</span></p>
                               {order.paymentVpa && <p className="flex justify-between"><strong>VPA:</strong> <span className="text-neutral-600">{order.paymentVpa}</span></p>}
                               <div className="mt-3 pt-3 border-t border-neutral-100 space-y-1">
                                 <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">Razorpay IDs</p>
                                 <p className="text-[11px]"><strong>Order:</strong> {order.razorpayOrderId}</p>
                                 {order.razorpayPaymentId && <p className="text-[11px]"><strong>Payment:</strong> {order.razorpayPaymentId}</p>}
                                 {order.razorpaySignature && (
                                   <p className="text-[9px] text-neutral-400 break-all leading-tight mt-1">
                                     <strong>Signature:</strong> {order.razorpaySignature}
                                   </p>
                                 )}
                               </div>
                             </div>
                          </div>
                        </div>

                        <div className="details-sidebar">
                          <div className="sidebar-card">
                            <h4>Customer</h4>
                            <p><strong>{order.shippingAddress?.name || order.user?.name}</strong></p>
                            <p className="sub-text">{order.shippingAddress?.email || ''}</p>
                            <p className="sub-text">{order.shippingAddress?.phone || order.user?.mobile || 'No phone'}</p>
                          </div>

                          <div className="sidebar-card">
                            <h4>Shipping Address</h4>
                            <p>{order.shippingAddress?.address}</p>
                            {order.shippingAddress?.addressLine2 && <p>{order.shippingAddress?.addressLine2}</p>}
                            <p>{order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            ))}
          </table>
        )}

        {/* Premium Boutique Pagination Controls */}
        {totalPages > 1 && (
          <div className="store-pagination-container">
            <button 
              className="pagination-arrow-btn" 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              <span>Prev</span>
            </button>
            
            <div className="pagination-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <button 
                  key={pageNum}
                  className={`pagination-number-btn ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button 
              className="pagination-arrow-btn" 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <span>Next</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreOrders;
