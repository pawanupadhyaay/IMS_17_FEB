import { useState, useEffect } from 'react';
import storeAdminService from '../../services/storeAdminService';
import './BlogModal.css'; 
import { toast } from 'react-hot-toast';

const BlogModal = ({ blog, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    coverImage: '',
    status: 'Draft',
    author: 'Samay Watch Team'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Prevent background page from scrolling while the modal is open
  useEffect(() => {
    const originalOverflow = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    if (blog) {
      setFormData({
        title: blog.title || '',
        slug: blog.slug || '',
        content: blog.content || '',
        excerpt: blog.excerpt || '',
        coverImage: blog.coverImage || '',
        status: blog.status || 'Draft',
        author: blog.author || 'Samay Watch Team'
      });
    }
  }, [blog]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    if (name === 'title' && !blog) {
      newFormData.slug = value
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
    }

    setFormData(newFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let res;
      if (blog) {
        res = await storeAdminService.updateBlog(blog._id, formData);
      } else {
        res = await storeAdminService.createBlog(formData);
      }

      if (res.success) {
        onSuccess(res.data);
      } else {
        setError(res.message || 'Action failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Slugs must be unique.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="store-modal-overlay" onClick={onClose}>
      <div className="store-modal-content blog-form-container" onClick={(e) => e.stopPropagation()}>
        <div className="blog-modal-header">
          <h2>{blog ? 'Refine Article' : 'Compose New Article'}</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">&times;</button>
        </div>

        {error && <div className="store-modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="blog-modal-full-form">
          <div className="blog-form-body-scrollable">
            {/* Real-time Cover Image Preview */}
            <div className="blog-preview-section">
             <div className="image-preview-box">
               {formData.coverImage ? (
                 <img src={formData.coverImage} alt="Cover Preview" onError={(e) => e.target.style.opacity = 0} />
               ) : (
                 <div className="placeholder">
                   <span style={{ fontSize: '2rem' }}>🖼️</span>
                   <span>Image Preview</span>
                 </div>
               )}
             </div>
             <p style={{ fontSize: '0.75rem', color: '#888', margin: 0 }}>
               Preview updates instantly when you enter a valid URL below.
             </p>
          </div>

          <div className="form-grid-2">
            <div className="blog-field-group">
              <label htmlFor="title">Article Title</label>
              <input
                className="blog-input"
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Navigating the World of Horology"
                required
              />
            </div>

            <div className="blog-field-group">
              <label htmlFor="slug">URL Slug</label>
              <input
                className="blog-input"
                type="text"
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                placeholder="e.g. world-of-horology"
                required
              />
              <small className="blog-helper-text">samaywatch.in/blog/<code>{formData.slug || '...'}</code></small>
            </div>
          </div>

          <div className="blog-field-group">
            <label htmlFor="coverImage">Cover Image URL</label>
            <input
              className="blog-input"
              type="text"
              id="coverImage"
              name="coverImage"
              value={formData.coverImage}
              onChange={handleChange}
              placeholder="Paste image URL here..."
              required
            />
          </div>

          <div className="blog-field-group">
            <label htmlFor="excerpt">Excerpt / Meta Description</label>
            <textarea
              className="blog-textarea"
              id="excerpt"
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              placeholder="Summarize your article for visitors and SEO..."
              required
              rows="2"
              maxLength="300"
            />
          </div>

          <div className="blog-field-group">
            <label htmlFor="content">Full Article Content (HTML Support)</label>
            <textarea
              className="blog-textarea content-area"
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="Write your masterpieces here. You can use standard HTML tags for formatting..."
              required
            />
          </div>

          <div className="form-grid-2">
            <div className="blog-field-group">
              <label htmlFor="status">Publish Status</label>
              <select className="blog-select" name="status" id="status" value={formData.status} onChange={handleChange}>
                <option value="Draft">Draft - Visible only in IMS</option>
                <option value="Live">Live - Published to Storefront</option>
                <option value="Archived">Archived - Hidden from all</option>
              </select>
            </div>
            <div className="blog-field-group">
              <label htmlFor="author">Published By</label>
              <input
                className="blog-input"
                type="text"
                id="author"
                name="author"
                value={formData.author}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
          
          <div className="blog-modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Processing...' : blog ? 'Update Article' : 'Publish to Store'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BlogModal;
