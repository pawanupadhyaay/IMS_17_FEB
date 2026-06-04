import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { updatePageSEO } from '../utils/seoHelper';
import blogService from '../services/blogService';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const BlogList = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    updatePageSEO({
      title: 'Horological Journal & News | Samay Watch',
      description: 'Read the latest watch stories, insights, collection releases, and luxury watch care guides from the editors at Samay Watch.',
      keywords: 'watch blog, luxury watch news, horology journal, watch guides, Samay Watch blogs',
      ogImage: 'https://i.ibb.co/2XHCWRL/samay-logo.png'
    });
  }, []);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await blogService.getBlogs();
        if (res.success) {
          setBlogs(res.data);
        } else {
          setError(res.message || 'Unable to fetch articles.');
        }
      } catch (err) {
        console.error('Blog fetch error:', err);
        setError('Failed to connect to the store database.');
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div></div>;

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <div className="size-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-2xl font-serif text-black mb-2">Connection Issue</h2>
        <p className="text-neutral-500 max-w-md mb-8">{error}</p>
        <button onClick={() => window.location.reload()} className="px-8 py-3 bg-black text-white rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg">
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-12 md:py-20">
      {blogs.length === 0 ? (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
          <p className="text-2xl font-serif text-neutral-400 italic mb-4">"Silence in the studio... we're currently composing something special."</p>
          <p className="text-sm text-neutral-500 font-medium">Check back soon for new articles and insights.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {blogs.map((blog, idx) => (
          <motion.div 
            key={blog._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group cursor-pointer"
          >
            <Link to={`/blog/${blog.slug}`}>
              <div className="aspect-[4/5] rounded-[24px] overflow-hidden mb-6 relative">
                 <img 
                    src={blog.coverImage} 
                    alt={blog.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                 />
                 <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
              </div>
              <span className="inline-block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">
                 {new Date(blog.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <h3 className="text-2xl font-serif font-black text-black group-hover:underline decoration-2 underline-offset-4 mb-3">
                 {blog.title}
              </h3>
              <p className="text-neutral-500 line-clamp-2 text-sm font-medium leading-relaxed mb-4">
                 {blog.excerpt}
              </p>
              <div className="flex items-center text-xs font-black uppercase tracking-wider group-hover:gap-3 transition-all">
                 Read Story <ArrowRight className="size-3 ml-2" />
              </div>
            </Link>
          </motion.div>
        ))}
        </div>
      )}
    </div>
  );
};

export default BlogList;
