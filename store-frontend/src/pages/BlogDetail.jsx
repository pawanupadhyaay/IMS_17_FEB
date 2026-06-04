import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { updatePageSEO } from '../utils/seoHelper';
import blogService from '../services/blogService';
import { motion } from 'framer-motion';
import { Calendar, User, ArrowLeft, Share2 } from 'lucide-react';

const BlogDetail = () => {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const res = await blogService.getBlogBySlug(slug);
        if (res.success) {
          setBlog(res.data);
        } else {
          setError(res.message);
        }
      } catch (err) {
        setError('Blog post not found');
      } finally {
        setLoading(false);
      }
    };
    fetchBlog();
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    if (blog) {
      updatePageSEO({
        title: `${blog.title} | Horological Journal | Samay Watch`,
        description: blog.excerpt || 'Read this fascinating article from the horological experts at Samay Watch.',
        keywords: `${blog.title.toLowerCase().split(' ').slice(0, 5).join(', ')}, watch blogs, Samay Watch news`,
        ogImage: blog.coverImage || 'https://i.ibb.co/2XHCWRL/samay-logo.png',
        ogType: 'article'
      });
    }
  }, [blog]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-serif mb-4">{error || 'Post not found'}</h2>
        <Link to="/all-products" className="text-black underline underline-offset-4 font-medium">
          Back to Shop
        </Link>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-[1200px] mx-auto px-4 py-12"
    >
      {/* Navigation */}
      <Link to="/blog" className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-black transition-colors mb-8 group">
        <ArrowLeft className="size-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Stories
      </Link>

      {/* Header */}
      <header className="max-w-[800px] mx-auto text-center mb-12">
        <motion.span 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="inline-block px-3 py-1 rounded-full bg-neutral-100 text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-6"
        >
          {blog.status === 'Live' ? 'Editorial' : blog.status}
        </motion.span>
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl lg:text-6xl font-serif font-black text-black leading-tight mb-8"
        >
          {blog.title}
        </motion.h1>
        
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-6 text-sm text-neutral-500 font-medium"
        >
          <div className="flex items-center gap-2">
            <User className="size-4" />
            {blog.author || 'Samay Editorial'}
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="size-4" />
            {new Date(blog.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </motion.div>
      </header>

      {/* Hero Image */}
      <motion.div 
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full aspect-[21/9] rounded-[32px] overflow-hidden mb-16 shadow-2xl"
      >
        <img 
          src={blog.coverImage} 
          alt={blog.title} 
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Content */}
      <div className="max-w-[800px] mx-auto">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="prose prose-neutral prose-lg max-w-none prose-headings:font-serif prose-headings:font-black prose-p:text-neutral-600 prose-p:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />

        <hr className="my-16 border-neutral-100" />

        {/* Footer Actions */}
        <div className="flex items-center justify-between pb-12">
          <div className="flex items-center gap-4">
             <button className="flex items-center justify-center size-10 rounded-full border border-neutral-200 hover:bg-black hover:text-white transition-all">
                <Share2 className="size-4" />
             </button>
          </div>
          <Link to="/all-products" className="px-8 py-3 bg-black text-white rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg">
            Discover Collection
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default BlogDetail;
