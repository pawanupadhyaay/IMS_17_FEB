import React, { useState, useEffect } from 'react';
import storeAdminService from '../../services/storeAdminService';
import './StoreDashboard.css';
import './StoreAdminTables.css';
import { toast } from 'react-hot-toast';

// Simple SVG Icons
const Icons = {
  Mail: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
  ),
  Phone: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.27-2.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
  ),
  Trash: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
  ),
  CheckCircle: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  ),
  MessageSquare: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  )
};

const StoreQueries = ({ type = 'query' }) => {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('New');
  const [expandedQueryId, setExpandedQueryId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fetchQueries = async () => {
    try {
      setLoading(true);
      const res = await storeAdminService.getQueries(type);
      if (res.success) setQueries(res.data);
    } catch (error) {
      console.error('Failed to fetch queries:', error);
      toast.error(type === 'ticket' ? 'Failed to load support tickets' : 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueries();
    storeAdminService.markQueriesAsRead(type).catch(err => console.error(err));
  }, [type]);

  const handleStatusUpdate = async (id, status) => {
    try {
      const res = await storeAdminService.updateQueryStatus(id, status);
      if (res.success) {
        setQueries(queries.map(q => q._id === id ? { ...q, status } : q));
        toast.success(`Status updated to ${status}`);
      }
    } catch (error) {
      toast.error('Update failed');
    }
  };

  const handleSendReply = async (id) => {
    if (!replyText.trim()) {
      toast.error('Reply message cannot be empty');
      return;
    }
    try {
      setSendingReply(true);
      const res = await storeAdminService.replyToQuery(id, replyText);
      if (res.success) {
        setQueries(queries.map(q => q._id === id ? { ...q, status: 'responded', response: replyText } : q));
        setReplyText('');
        toast.success('Reply sent and customer notified!');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this inquiry?')) return;
    try {
      const res = await storeAdminService.deleteQuery(id);
      if (res.success) {
        setQueries(queries.filter(q => q._id !== id));
        toast.success('Inquiry deleted');
      }
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const filteredQueries = queries.filter(query => {
    // 1. Tab Filter
    if (activeTab === 'New' && query.status !== 'new') return false;
    if (activeTab === 'Read' && query.status !== 'read') return false;
    if (activeTab === 'Responded' && query.status !== 'responded') return false;

    // 2. Search Filter
    const searchLow = searchTerm.toLowerCase();
    return (
      query.firstName.toLowerCase().includes(searchLow) ||
      (query.lastName && query.lastName.toLowerCase().includes(searchLow)) ||
      query.email.toLowerCase().includes(searchLow) ||
      query.mobile.toLowerCase().includes(searchLow)
    );
  });

  const stats = {
    total: queries.length,
    new: queries.filter(q => q.status === 'new').length,
    responded: queries.filter(q => q.status === 'responded').length
  };

  if (loading) return <div className="store-loading">{type === 'ticket' ? 'Loading Tickets...' : 'Loading Inquiries...'}</div>;

  const isTicket = type === 'ticket';

  return (
    <div className="store-dashboard">
      <div className="store-page-header">
        <div className="page-title-box">
          <p className="page-subtitle">OVERVIEW</p>
          <h1>{isTicket ? 'Support Tickets' : 'Customer Inquiries'}</h1>
          <p className="page-desc">
            {isTicket 
              ? 'Track and manage customer support tickets and send live email replies.' 
              : 'Track and manage queries sent via the Contact Us form.'}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn-dark" onClick={fetchQueries}>Refresh List</button>
        </div>
      </div>

      <div className="store-metrics-grid">
        <div className="metric-card">
          <p className="metric-label">{isTicket ? 'TOTAL TICKETS' : 'TOTAL INQUIRIES'}</p>
          <h2>{stats.total}</h2>
        </div>
        <div className="metric-card">
          <p className="metric-label">{isTicket ? 'NEW TICKETS' : 'NEW INQUIRIES'}</p>
          <h2 style={{color: '#f5b041'}}>{stats.new}</h2>
        </div>
        <div className="metric-card">
          <p className="metric-label">{isTicket ? 'RESOLVED' : 'RESPONDED'}</p>
          <h2 style={{color: '#008060'}}>{stats.responded}</h2>
        </div>
      </div>

      <div className="store-table-container">
        <div className="store-table-tabs">
          {['All', 'New', 'Read', 'Responded'].map(tab => (
            <div 
              key={tab} 
              className={`table-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </div>
          ))}
        </div>

        <div className="store-table-filters">
          <div className="search-wrapper">
            <span className="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search by name, email or mobile..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredQueries.length === 0 ? (
          <div className="store-empty">No {isTicket ? 'tickets' : 'inquiries'} matching your criteria.</div>
        ) : (
          <table className="store-table">
            <thead>
              <tr>
                <th className="col-customer">Customer</th>
                <th className="col-contact">Contact Details</th>
                <th className="col-message">Message</th>
                <th className="col-date">Date</th>
                <th className="col-status">Status</th>
                <th className="col-actions" style={{textAlign: 'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueries.map((query) => (
                <React.Fragment key={query._id}>
                  <tr 
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      const isExpanding = expandedQueryId !== query._id;
                      setExpandedQueryId(isExpanding ? query._id : null);
                      setReplyText('');
                      if (isExpanding && query.status === 'new') {
                        handleStatusUpdate(query._id, 'read');
                      }
                    }}
                    onMouseEnter={() => query.status === 'new' && handleStatusUpdate(query._id, 'read')}
                  >
                    <td className="col-customer">
                      <strong>{query.firstName} {query.lastName || ''}</strong>
                    </td>
                    <td className="col-contact">
                      <div className="flex flex-col gap-1">
                        <a href={`mailto:${query.email}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 text-xs text-blue-600 hover:underline">
                          <Icons.Mail size={12}/> {query.email}
                        </a>
                        <a href={`tel:${query.mobile}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 text-xs text-neutral-500 hover:underline">
                          <Icons.Phone size={12}/> {query.mobile}
                        </a>
                      </div>
                    </td>
                    <td className="col-message">
                      <div className="message-preview" title={query.message}>
                        {query.message.length > 60 ? query.message.substring(0, 60) + '...' : query.message}
                      </div>
                    </td>
                    <td className="col-date">
                      {new Date(query.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="col-status">
                      <span className={`badge ${query.status === 'new' ? 'yellow' : query.status === 'responded' ? 'green' : 'gray'}`}>
                        {query.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="col-actions" style={{textAlign: 'right'}}>
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                         {query.status !== 'responded' && (
                           <button 
                             className="action-icon-btn text-green-600" 
                             onClick={() => handleStatusUpdate(query._id, 'responded')}
                             title="Mark as Responded"
                           >
                             <Icons.CheckCircle size={16}/>
                           </button>
                         )}
                         <button 
                           className="action-icon-btn delete text-red-600" 
                           onClick={() => handleDelete(query._id)}
                           title="Delete Inquiry"
                         >
                           <Icons.Trash size={16}/>
                         </button>
                      </div>
                    </td>
                  </tr>
                  {expandedQueryId === query._id && (
                    <tr className="order-details-expanded">
                      <td colSpan="6" style={{ padding: 0 }}>
                        <div className="query-expanded-container" style={{ padding: '20px', background: '#fafafa', display: 'flex', gap: '25px', flexWrap: 'wrap' }}>
                           <div className="query-expanded-message" style={{ flex: '2 1 300px' }}>
                             <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>Full Message</h4>
                             <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #eee', color: '#222', whiteSpace: 'pre-wrap' }}>
                               {query.message}
                             </p>
                             {query.response && (
                               <div style={{ marginTop: '15px' }}>
                                 <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#008060', letterSpacing: '0.5px' }}>Previous Reply Sent</h4>
                                 <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', background: '#f4fdf9', padding: '15px', borderRadius: '8px', border: '1px solid #d1f2e5', color: '#111', fontWeight: '500', whiteSpace: 'pre-wrap' }}>
                                   {query.response}
                                 </p>
                               </div>
                             )}
                           </div>
                           <div className="query-expanded-actions" style={{ flex: '1.5 1 250px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                             <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>Concierge Reply (SMTP Email)</h4>
                             <textarea
                               className="reply-textarea"
                               placeholder="Type your official reply here. The customer will receive this immediately via email..."
                               value={replyText}
                               onChange={(e) => setReplyText(e.target.value)}
                               rows={5}
                               style={{ width: '100%', padding: '10px', fontSize: '12.5px', border: '1px solid #ddd', borderRadius: '6px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                             />
                             <div className="flex gap-2 mt-2" style={{ display: 'flex', gap: '8px' }}>
                               <button 
                                 className="btn-dark"
                                 onClick={() => handleSendReply(query._id)}
                                 disabled={sendingReply || !replyText.trim()}
                                 style={{ padding: '8px 16px', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px', cursor: 'pointer' }}
                               >
                                 {sendingReply ? 'Sending...' : 'Send Reply'}
                               </button>
                               <a 
                                 href={`mailto:${query.email}?subject=Re: Your Inquiry`} 
                                 className="btn-reply-email"
                                 onClick={(e) => e.stopPropagation()}
                                 style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', background: '#eee', color: '#333', border: '1px solid #ddd', borderRadius: '6px', textDecoration: 'none' }}
                               >
                                 <Icons.Mail size={12}/> Mailto Link
                               </a>
                             </div>
                           </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default StoreQueries;
