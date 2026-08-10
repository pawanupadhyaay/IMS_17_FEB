import { useState, useEffect } from 'react';
import storeAdminService from '../../services/storeAdminService';
import BlogModal from '../../components/my-store/BlogModal';
import './StoreDashboard.css';
import './StoreAdminTables.css';
import { toast } from 'react-hot-toast';

// Lightweight custom inline SVGs for premium watch boutique visual styles
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ExportIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const StoreBlogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState(null);

  const fetchBlogs = async () => {
    try {
      const res = await storeAdminService.getBlogs();
      if (res.success) setBlogs(res.data);
    } catch (error) {
      console.error('Failed to fetch blogs:', error);
      toast.error('Failed to load blogs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this blog post?')) {
      try {
        await storeAdminService.deleteBlog(id);
        toast.success('Blog deleted');
        fetchBlogs();
      } catch (err) {
        toast.error('Failed to delete blog');
      }
    }
  };

  const handleCreateNew = () => {
    setSelectedBlog(null);
    setShowModal(true);
  };

  const handleEdit = (blog) => {
    setSelectedBlog(blog);
    setShowModal(true);
  };

  const totalBlogs = blogs.length;
  const liveBlogs = blogs.filter(b => b.status === 'Live').length;
  const archivedBlogs = blogs.filter(b => b.status === 'Archived').length;

  if (loading) return <div className="store-loading">Loading Blogs...</div>;

  return (
    <div className="store-dashboard">
      <div className="store-page-header">
        <div className="page-title-box">
          <p className="page-subtitle">OVERVIEW</p>
          <h1>Blogs</h1>
          <p className="page-desc">Manage articles, guides, and SEO content.</p>
        </div>
        <div className="page-actions">
          <button className="btn-outline"><ExportIcon /> Export</button>
          <button className="btn-dark" onClick={handleCreateNew}><PlusIcon /> New Post</button>
        </div>
      </div>

      <div className="store-metrics-grid">
        <div className="metric-card">
          <div className="metric-card-header">
            <p className="metric-label">TOTAL POSTS</p>
            <div className="metric-icon-box blue">📝</div>
          </div>
          <h2>{totalBlogs}</h2>
        </div>
        <div className="metric-card">
          <div className="metric-card-header">
            <p className="metric-label">LIVE ARTICLES</p>
            <div className="metric-icon-box green">✅</div>
          </div>
          <h2 style={{ color: '#00b86b' }}>{liveBlogs}</h2>
        </div>
        <div className="metric-card">
          <div className="metric-card-header">
            <p className="metric-label">ARCHIVED</p>
            <div className="metric-icon-box orange">📁</div>
          </div>
          <h2>{archivedBlogs}</h2>
        </div>
      </div>

      <div className="store-table-container">
        <div className="store-table-header">
          <div>
            <h3>Article Library</h3>
            <p>View and manage all your published content</p>
          </div>
          <div className="page-actions">
            <button className="btn-outline" onClick={fetchBlogs}><RefreshIcon /> Refresh List</button>
          </div>
        </div>

        {blogs.length === 0 ? (
          <div className="store-empty">
            <div className="empty-icon">📝</div>
            <h3>No articles found</h3>
            <p>Ready to share your insights? Create your very first blog post to engage your customers.</p>
            <button className="btn-dark" onClick={handleCreateNew} style={{ marginTop: '0.5rem' }}>
              <PlusIcon /> Create First Article
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="desktop-only store-table-wrapper">
              <table className="store-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Preview</th>
                    <th>Content Details</th>
                    <th>Public URL</th>
                    <th>Visibility</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blogs.map((blog) => (
                    <tr key={blog._id}>
                      <td>
                        <div style={{ position: 'relative', width: '60px', height: '45px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
                          <img
                            src={blog.coverImage || 'https://via.placeholder.com/60x45'}
                            alt="Cover"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      </td>
                      <td style={{ maxWidth: '300px' }}>
                        <div className="blog-title-cell">
                          <span style={{ fontWeight: '600', color: '#1a1a1a', fontSize: '0.95rem' }}>{blog.title}</span>
                          <span className="blog-excerpt">{blog.excerpt || 'No excerpt provided...'}</span>
                          <div className="flex gap-2 mt-1">
                            <span style={{ fontSize: '0.65rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              By {blog.author || 'Store Owner'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <a
                          href={`http://localhost:5173/blog/${blog.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <span style={{ opacity: 0.6 }}>/blog/</span>{blog.slug}
                        </a>
                      </td>
                      <td>
                        <span className={`badge ${blog.status === 'Live' ? 'green' : (blog.status === 'Draft' ? 'gray' : 'blue')}`}>
                          {blog.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex items-center justify-end gap-1">
                          <button className="action-btn" onClick={() => window.open(`http://localhost:5173/blog/${blog.slug}`, '_blank')} title="View Live"><EyeIcon /></button>
                          <button className="action-btn" onClick={() => handleEdit(blog)} title="Edit Content"><EditIcon /></button>
                          <button className="action-btn delete" onClick={() => handleDelete(blog._id)} title="Remove"><TrashIcon /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="store-blogs-card-list">
              {blogs.map((blog) => (
                <div className="store-blog-mobile-card" key={blog._id}>
                  <div className="blog-card-header">
                    <div className="blog-card-img">
                      <img
                        src={blog.coverImage || 'https://via.placeholder.com/60x45'}
                        alt="Cover"
                      />
                    </div>
                    <div className="blog-card-info">
                      <h4 className="blog-card-title">{blog.title}</h4>
                      <span className="blog-card-author">By {blog.author || 'Store Owner'}</span>
                    </div>
                    <span className={`badge ${blog.status === 'Live' ? 'green' : (blog.status === 'Draft' ? 'gray' : 'blue')}`}>
                      {blog.status}
                    </span>
                  </div>

                  <div className="blog-card-body">
                    <p className="blog-card-excerpt">{blog.excerpt || 'No excerpt provided...'}</p>
                    <a
                      href={`http://localhost:5173/blog/${blog.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="blog-card-url"
                    >
                      <span>/blog/</span>{blog.slug}
                    </a>
                  </div>

                  <div className="blog-card-actions">
                    <button className="action-btn-pill" onClick={() => window.open(`http://localhost:5173/blog/${blog.slug}`, '_blank')}>
                      <EyeIcon /> View
                    </button>
                    <button className="action-btn-pill" onClick={() => handleEdit(blog)}>
                      <EditIcon /> Edit
                    </button>
                    <button className="action-btn-pill delete" onClick={() => handleDelete(blog._id)}>
                      <TrashIcon /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <BlogModal
          blog={selectedBlog}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            toast.success(selectedBlog ? 'Blog updated' : 'Blog published');
            fetchBlogs();
          }}
        />
      )}
    </div>
  );
};

export default StoreBlogs;
