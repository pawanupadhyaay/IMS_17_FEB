import { useState, useEffect } from 'react';
import storeAdminService from '../../services/storeAdminService';
import './StoreDashboard.css';
import './StoreAdminTables.css';
import { toast } from 'react-hot-toast';

const StoreReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({}); // { reviewId: text }

  const fetchReviews = async () => {
    try {
      const res = await storeAdminService.getReviews();
      if (res.success) setReviews(res.data);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    // Mark reviews as read when the admin opens this tab
    storeAdminService.markReviewsAsRead().catch(err => console.error(err));
  }, []);

  const handleDelete = async (id) => {
    if(window.confirm('Are you sure you want to delete this review?')) {
      try {
        await storeAdminService.deleteReview(id);
        toast.success('Review deleted');
        fetchReviews();
      } catch (err) {
        toast.error('Failed to delete review');
      }
    }
  };

  const handlePin = async (review) => {
    try {
      const res = await storeAdminService.updateReview(review._id, { isPinned: !review.isPinned });
      if (res.success) {
        toast.success(review.isPinned ? 'Review unpinned' : 'Review pinned');
        fetchReviews();
      }
    } catch (err) {
      toast.error('Failed to update review');
    }
  };

  const handleReplyChange = (id, text) => {
    setReplyText(prev => ({ ...prev, [id]: text }));
  };

  const handleSaveReply = async (id) => {
    const text = replyText[id];
    try {
      const res = await storeAdminService.updateReview(id, { reply: text });
      if (res.success) {
        toast.success('Reply saved');
        fetchReviews();
        // Clear active reply state
        setReplyText(prev => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });
      }
    } catch (err) {
      toast.error('Failed to save reply');
    }
  };

  if (loading) return <div className="store-loading">Loading Reviews...</div>;

  return (
    <div className="store-dashboard">
      <div className="store-page-header">
        <div className="page-title-box">
          <p className="page-subtitle">OVERVIEW</p>
          <h1>Reviews</h1>
          <p className="page-desc">Manage products feedback in real time.</p>
        </div>
        <div className="page-actions">
           <button className="btn-outline" onClick={fetchReviews}>Refresh</button>
        </div>
      </div>

      <div className="store-table-container " style={{ padding: '0' }}>
        <div className="store-table-header" style={{ borderBottom: '1px solid #eaeaea', marginBottom: '1rem' }}>
          <div>
            <h3>Customer Reviews</h3>
            <p>Product-wise Reply, pin, delete</p>
          </div>
        </div>
        
        {reviews.length === 0 ? (
          <div className="store-empty">No reviews found.</div>
        ) : (
          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            {reviews.map((review) => (
              <div key={review._id} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '1.1rem' }}>{review.product?.name || 'Unknown Product'}</strong>
                    {review.isPinned && <span style={{ marginLeft: '1rem', background: '#e1f5fe', color: '#0288d1', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem' }}>📍 PINNED</span>}
                  </div>
                </div>
                
                <div style={{ background: '#fafafa', padding: '1.5rem', borderRadius: '12px', border: review.isPinned ? '1px solid #e1f5fe' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {review.user?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{review.user?.name || 'Unknown User'}</span>
                        <div style={{ color: '#f5b041', fontSize: '0.8rem' }}>
                          {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>
                      {new Date(review.createdAt).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                  
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: '#333', lineHeight: '1.5' }}>{review.comment}</p>
                  
                  {review.images && review.images.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      {review.images.map((img, i) => (
                        <img key={i} src={img} alt="review" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #eee' }} />
                      ))}
                    </div>
                  )}

                  {/* Reply Section */}
                  <div style={{ marginTop: '1.5rem', background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px dashed #ddd' }}>
                    <label style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem', display: 'block' }}>Official Store Reply</label>
                    {replyText[review._id] !== undefined ? (
                      <div className="flex flex-col gap-2">
                        <textarea 
                          value={replyText[review._id]} 
                          onChange={(e) => handleReplyChange(review._id, e.target.value)}
                          placeholder="Write your response to this customer..."
                          style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.9rem' }}
                          rows="3"
                        />
                        <div className="flex gap-2">
                           <button className="btn-dark" style={{ fontSize: '0.8rem' }} onClick={() => handleSaveReply(review._id)}>Save Reply</button>
                           <button className="btn-outline" style={{ fontSize: '0.8rem' }} onClick={() => handleReplyChange(review._id, undefined)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {review.reply ? (
                          <div style={{ fontSize: '0.9rem', color: '#555', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                            "{review.reply}"
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: '#999', marginBottom: '0.5rem' }}>No reply yet.</div>
                        )}
                        <button className="action-btn" style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', color: '#0066cc' }} onClick={() => handleReplyChange(review._id, review.reply || '')}>
                           {review.reply ? 'Edit Reply' : 'Reply'}
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                    <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 1rem' }} onClick={() => handlePin(review)}>
                      {review.isPinned ? 'Unpin' : 'Pin Review'}
                    </button>
                    <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 1rem', color: '#e53935', borderColor: '#ffcdd2' }} onClick={() => handleDelete(review._id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreReviews;
