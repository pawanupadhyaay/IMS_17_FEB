import { useState, useEffect } from 'react';
import storeAdminService from '../../services/storeAdminService';
import './StoreDashboard.css';
import './StoreAdminTables.css';

// Simple SVG Icons to replace lucide-react
const Icons = {
  ChevronDown: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
  ),
  ChevronUp: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
  ),
  MapPin: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
  ),
  Mail: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
  ),
  Phone: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.27-2.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
  ),
  CreditCard: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
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

  const [fulfillmentForm, setFulfillmentForm] = useState({
    orderStatus: '',
    awbCode: '',
    courierName: '',
    trackingUrl: ''
  });
  const [updatingFulfillment, setUpdatingFulfillment] = useState(false);
  const [processingRefund, setProcessingRefund] = useState(false);
  const [refundConfirmOrderId, setRefundConfirmOrderId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

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
    const isExpanding = expandedOrderId !== id;
    setExpandedOrderId(isExpanding ? id : null);
    if (isExpanding) {
      const order = orders.find(o => o._id === id);
      if (order) {
        setFulfillmentForm({
          orderStatus: order.orderStatus || 'confirmed',
          awbCode: order.awbCode || '',
          courierName: order.courierName || '',
          trackingUrl: order.trackingUrl || ''
        });
      }
    }
  };

  const handleUpdateFulfillment = async (orderId) => {
    try {
      setUpdatingFulfillment(true);
      const res = await storeAdminService.updateOrderShipment(orderId, fulfillmentForm);
      if (res.success) {
        await fetchOrders();
        setExpandedOrderId(orderId);
        showToast('Shipment details updated successfully!', 'success');
      } else {
        showToast(res.message || 'Failed to update shipment details', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating shipment details', 'error');
    } finally {
      setUpdatingFulfillment(false);
    }
  };

  const handleRefund = (orderId) => {
    setRefundConfirmOrderId(orderId);
  };

  const executeRefund = async () => {
    if (!refundConfirmOrderId) return;
    const orderId = refundConfirmOrderId;
    setRefundConfirmOrderId(null);

    try {
      setProcessingRefund(true);
      const res = await storeAdminService.updateOrderShipment(orderId, { paymentStatus: 'refunded' });
      if (res.success) {
        await fetchOrders();
        showToast('Order amount refunded successfully!', 'success');
      } else {
        showToast(res.message || 'Failed to refund order', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Error processing refund', 'error');
    } finally {
      setProcessingRefund(false);
    }
  };

  // Filter Logic
  const filteredOrders = orders.filter(order => {
    // 1. Tab Filter
    if (activeTab === 'Pending' && (order.orderStatus !== 'pending' || order.paymentStatus?.toLowerCase() !== 'paid')) return false;
    if (activeTab === 'Paid' && order.paymentStatus?.toLowerCase() !== 'paid') return false;
    if (activeTab === 'Abandoned' && order.paymentStatus?.toLowerCase() === 'paid') return false;

    // 2. Search Filter (Order ID or Customer Name)
    const rawSearch = searchTerm.toLowerCase();
    const searchClean = rawSearch.replace('#ord-', '').replace('#', '').trim();

    const matchesId = order._id.toLowerCase().includes(searchClean) ||
      (order.orderId || '').toLowerCase().includes(searchClean) ||
      (order.razorpayOrderId || '').toLowerCase().includes(searchClean) ||
      (order.shiprocketOrderId || '').toLowerCase().includes(searchClean) ||
      (order.awbCode || '').toLowerCase().includes(searchClean);

    const matchesName = (order.shippingAddress?.name || order.user?.name || '').toLowerCase().includes(rawSearch);

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
      <style>{`
        @keyframes slideInUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
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
          <h2 style={{ color: '#f5b041' }}>{stats.pending}</h2>
        </div>
        <div className="metric-card">
          <p className="metric-label">TOTAL REVENUE</p>
          <h2 className="revenue-text">₹{stats.revenue.toLocaleString('en-IN')}</h2>
        </div>
        <div className="metric-card">
          <p className="metric-label">PAID ORDERS</p>
          <h2 style={{ color: '#008060' }}>{stats.paid}</h2>
        </div>
      </div>

      <div className="store-table-container">
        {/* Shopify Styling Tabs */}
        <div className="store-table-tabs">
          {['All', 'Pending', 'Paid', 'Abandoned'].map(tab => (
            <div
              key={tab}
              className={`table-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'Abandoned' ? 'Abandoned Checkouts' : tab}
            </div>
          ))}
        </div>

        {/* Search Bar */}
        <div className="store-table-filters">
          <div className="search-wrapper">
            <span className="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
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
                <th className="col-total" style={{ textAlign: 'right' }}>Total</th>
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
                      {expandedOrderId === order._id ? <Icons.ChevronUp size={14} /> : <Icons.ChevronDown size={14} />}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                        <span className="order-id" style={{ display: 'block', fontWeight: 600 }}>#ORD-{order._id.slice(-6).toUpperCase()}</span>
                        {order.razorpayOrderId && (
                          <span style={{ display: 'block', fontSize: '10px', color: '#6d7175', lineHeight: '1.2' }}>
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
                    <span className={`badge ${['confirmed', 'processing', 'delivered'].includes(order.orderStatus) ? 'green' : 'gray'
                      }`}>
                      {order.orderStatus === 'confirmed' ? 'Confirmed' :
                        order.orderStatus === 'delivered' ? 'Fulfilled' :
                          order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                    </span>
                  </td>
                  <td className="desktop-only col-total" style={{ textAlign: 'right' }}>
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

                          <div className="payment-timeline-card sidebar-card" style={{ marginTop: '0' }}>
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

                              {order.paymentStatus?.toLowerCase() === 'paid' && (
                                <div className="mt-3 pt-3 border-t border-neutral-100">
                                  <button
                                    type="button"
                                    onClick={() => handleRefund(order._id)}
                                    disabled={processingRefund}
                                    style={{
                                      width: '100%',
                                      background: '#fff5f5',
                                      border: '1px solid #feb2b2',
                                      borderRadius: '6px',
                                      color: '#e53e3e',
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      padding: '8px 12px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 15v-6a4 4 0 00-4-4H4m0 0l4-4m-4 4l4 4m3 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {processingRefund ? 'Refunding...' : 'Refund Order Amount'}
                                  </button>
                                </div>
                              )}

                              {order.paymentStatus?.toLowerCase() === 'refunded' && (
                                <div className="mt-3 pt-3 border-t border-neutral-100">
                                  <div style={{
                                    width: '100%',
                                    background: '#f4f4f5',
                                    border: '1px solid #e4e4e7',
                                    borderRadius: '6px',
                                    color: '#71717a',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    padding: '8px',
                                    textAlign: 'center',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                  }}>
                                    Amount Refunded
                                  </div>
                                </div>
                              )}
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

                          <div className="sidebar-card">
                            <h4>Fulfillment & Tracking</h4>
                            {order.shiprocketOrderId && (
                              <div className="space-y-1 text-xs mb-3 p-3 rounded bg-neutral-50 border border-neutral-100 animate-fadeIn" style={{ fontSize: '11px', lineHeight: '1.4' }}>
                                <p className="text-neutral-600 font-bold">Shiprocket Order Registered</p>
                                <p><strong>ID:</strong> {order.shiprocketOrderId}</p>
                                {order.awbCode && <p><strong>Shiprocket AWB:</strong> {order.awbCode}</p>}
                                <p className="text-[10px] text-neutral-400 mt-1">If this order is not being dispatched through Shiprocket, you can override it by entering manual details below:</p>
                              </div>
                            )}
                            <div className="space-y-3" style={{ marginTop: '10px' }}>
                              <div className="form-group flex flex-col gap-1" style={{ marginBottom: '8px' }}>
                                <label className="text-[10px] font-black uppercase text-neutral-400">Fulfillment Status</label>
                                <select
                                  className="p-2 border border-neutral-200 rounded text-xs outline-none focus:border-black w-full"
                                  value={fulfillmentForm.orderStatus}
                                  onChange={(e) => setFulfillmentForm({ ...fulfillmentForm, orderStatus: e.target.value })}
                                  style={{ background: 'white', padding: '6px' }}
                                >
                                  <option value="confirmed">Confirmed</option>
                                  <option value="processing">Processing</option>
                                  <option value="shipped">Shipped</option>
                                  <option value="out_for_delivery">Out for Delivery</option>
                                  <option value="delivered">Delivered (Fulfilled)</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </div>
                              <div className="form-group flex flex-col gap-1" style={{ marginBottom: '8px' }}>
                                <label className="text-[10px] font-black uppercase text-neutral-400">Courier Partner</label>
                                <input
                                  type="text"
                                  className="p-2 border border-neutral-200 rounded text-xs outline-none focus:border-black w-full"
                                  placeholder="e.g. DTDC, Delhivery"
                                  value={fulfillmentForm.courierName}
                                  onChange={(e) => setFulfillmentForm({ ...fulfillmentForm, courierName: e.target.value })}
                                  style={{ padding: '6px' }}
                                />
                              </div>
                              <div className="form-group flex flex-col gap-1" style={{ marginBottom: '8px' }}>
                                <label className="text-[10px] font-black uppercase text-neutral-400">AWB / Tracking Number</label>
                                <input
                                  type="text"
                                  className="p-2 border border-neutral-200 rounded text-xs outline-none focus:border-black w-full"
                                  placeholder="e.g. 123456789"
                                  value={fulfillmentForm.awbCode}
                                  onChange={(e) => setFulfillmentForm({ ...fulfillmentForm, awbCode: e.target.value })}
                                  style={{ padding: '6px' }}
                                />
                              </div>
                              <div className="form-group flex flex-col gap-1" style={{ marginBottom: '12px' }}>
                                <label className="text-[10px] font-black uppercase text-neutral-400">Tracking Link / URL</label>
                                <input
                                  type="text"
                                  className="p-2 border border-neutral-200 rounded text-xs outline-none focus:border-black w-full"
                                  placeholder="e.g. https://www.dtdc.in/track/..."
                                  value={fulfillmentForm.trackingUrl}
                                  onChange={(e) => setFulfillmentForm({ ...fulfillmentForm, trackingUrl: e.target.value })}
                                  style={{ padding: '6px' }}
                                />
                              </div>
                              <button
                                type="button"
                                className="w-full btn-dark py-2 text-xs font-bold uppercase tracking-wider"
                                onClick={() => handleUpdateFulfillment(order._id)}
                                disabled={updatingFulfillment}
                                style={{ padding: '8px', cursor: 'pointer' }}
                              >
                                {updatingFulfillment ? 'Saving...' : 'Save Shipment Details'}
                              </button>
                            </div>
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
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
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
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* Custom refund confirmation modal */}
      {refundConfirmOrderId && (
        <div className="store-modal-overlay" style={{ display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2100, alignItems: 'center', justifyContent: 'center' }}>
          <div className="store-modal-card" style={{ width: '90%', maxWidth: '380px', background: 'white', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', overflow: 'hidden', animation: 'scaleUp 0.15s ease-out' }}>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ margin: '0 auto 12px auto', width: '48px', height: '48px', background: '#fff5f5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e53e3e' }}>
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 15v-6a4 4 0 00-4-4H4m0 0l4-4m-4 4l4 4m3 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#202223', margin: '0 0 8px 0' }}>Refund Order Amount?</h3>
              <p style={{ fontSize: '13px', color: '#6d7175', margin: 0, lineHeight: '1.5' }}>
                Are you sure you want to refund this order amount? This will update the payment status to REFUNDED.
              </p>
            </div>
            <div style={{ padding: '1rem 1.5rem', background: '#f9fafb', borderTop: '1px solid #e1e3e5', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRefundConfirmOrderId(null)}
                style={{ background: 'white', border: '1px solid #babfc3', borderRadius: '4px', fontSize: '13px', fontWeight: 600, color: '#202223', padding: '8px 16px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={executeRefund}
                style={{ background: '#e53e3e', border: '1px solid transparent', borderRadius: '4px', fontSize: '13px', fontWeight: 600, color: 'white', padding: '8px 16px', cursor: 'pointer' }}
              >
                Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Premium Toast Message */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toast.type === 'success' ? '#108043' : '#bf1d08',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: '600',
          fontSize: '13px',
          animation: 'slideInUp 0.2s ease-out'
        }}>
          {toast.type === 'success' ? (
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default StoreOrders;
