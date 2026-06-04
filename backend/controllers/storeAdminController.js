const Order = require('../models/Order');
const { Product } = require('../models/Product');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const Blog = require('../models/Blog');
const Review = require('../models/Review');
const StoreQuery = require('../models/StoreQuery');

// --- DASHBOARD ---
exports.getDashboardStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const activeProductsCount = await Product.countDocuments({ isPublished: true });
    const liveUsers = await User.countDocuments(); 
    
    // Calculate total revenue from all orders
    const orders = await Order.find();
    const totalRevenue = orders.reduce((acc, order) => acc + (order.total || 0), 0);

    const lowStockCount = await Product.countDocuments({ inventory: { $lt: 10 } });

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        activeProductsCount,
        liveUsers,
        totalRevenue,
        lowStockCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// --- ORDERS ---
exports.getOrders = async (req, res) => {
  try {
    // Populate user to get customer details
    const orders = await Order.find()
      .populate('user', 'name email mobile')
      .populate('items.product', 'title slug')
      .sort('-createdAt');
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- COUPONS ---
exports.getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort('-createdAt');
    res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- BLOGS ---
exports.getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort('-createdAt');
    res.status(200).json({ success: true, data: blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBlog = async (req, res) => {
  try {
    const blog = await Blog.create(req.body);
    res.status(201).json({ success: true, data: blog });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteBlog = async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
    res.status(200).json({ success: true, data: blog });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- REVIEWS ---
exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('user', 'name email')
      .populate('product', 'name price')
      .sort('-createdAt');
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    res.status(200).json({ success: true, data: review });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getCustomers = async (req, res) => {
  try {
    // Exclude owners/admins if necessary. For now fetch standard users.
    const customers = await User.find({ role: 'User' }).select('-password').sort('-createdAt');
    res.status(200).json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- NOTIFICATIONS ---
exports.getNotificationCounts = async (req, res) => {
  try {
    const ordersCount = await Order.countDocuments({ isRead: { $ne: true } });
    const queriesCount = await StoreQuery.countDocuments({ isRead: { $ne: true } });
    const reviewsCount = await Review.countDocuments({ isRead: { $ne: true } });

    res.status(200).json({
      success: true,
      data: {
        orders: ordersCount,
        queries: queriesCount,
        reviews: reviewsCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markReviewsAsRead = async (req, res) => {
  try {
    await Review.updateMany({ isRead: { $ne: true } }, { isRead: true });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markOrdersAsRead = async (req, res) => {
  try {
    await Order.updateMany({ isRead: { $ne: true } }, { isRead: true });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markQueriesAsRead = async (req, res) => {
  try {
    await StoreQuery.updateMany({ isRead: { $ne: true } }, { isRead: true });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- STAFF MANAGEMENT ---
exports.getStaffs = async (req, res) => {
  try {
    // Owner role can see ALL staff members, admin sees only their own created staff
    const query = req.user.role === 'Owner'
      ? { role: { $in: ['staff', 'Staff'] } }
      : { parentId: req.user.id, role: { $in: ['staff', 'Staff'] } };
    const staffs = await User.find(query).select('-password').sort('-createdAt');
    res.status(200).json({ success: true, data: staffs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createStaff = async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      password,
      allowedBrands = [],
      canEditProducts = true,
      canViewStats = true,
      canEditBasicInfo = true,
      canEditSeo = true,
      canAccessFilters = true
    } = req.body;
    
    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: "User already exists with this email" });
    }

    const staff = await User.create({
      name,
      email,
      mobile,
      password,
      role: 'staff',
      parentId: req.user.id,
      hasSeoAccess: !!canEditSeo, // backwards compatible fallback
      allowedBrands,
      canEditProducts: !!canEditProducts,
      canViewStats: !!canViewStats,
      canEditBasicInfo: !!canEditBasicInfo,
      canEditSeo: !!canEditSeo,
      canAccessFilters: !!canAccessFilters
    });

    res.status(201).json({ success: true, data: staff });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      password,
      allowedBrands,
      canEditProducts,
      canViewStats,
      canEditBasicInfo,
      canEditSeo,
      canAccessFilters
    } = req.body;
    const staff = await User.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }

    // Security check: Owner role can update any staff, admin can only update their own created staff
    if (req.user.role !== 'Owner' && staff.parentId?.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized to update this staff member" });
    }

    staff.name = name || staff.name;
    staff.email = email || staff.email;
    staff.mobile = mobile || staff.mobile;
    
    if (allowedBrands !== undefined) {
      staff.allowedBrands = allowedBrands;
    }
    if (canEditProducts !== undefined) {
      staff.canEditProducts = !!canEditProducts;
    }
    if (canViewStats !== undefined) {
      staff.canViewStats = !!canViewStats;
    }
    if (canEditBasicInfo !== undefined) {
      staff.canEditBasicInfo = !!canEditBasicInfo;
    }
    if (canEditSeo !== undefined) {
      staff.canEditSeo = !!canEditSeo;
      staff.hasSeoAccess = !!canEditSeo; // backwards compatible fallback
    }
    if (canAccessFilters !== undefined) {
      staff.canAccessFilters = !!canAccessFilters;
    }
    
    if (password) {
      staff.password = password;
    }

    await staff.save();
    res.status(200).json({ success: true, data: staff });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const staff = await User.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }

    // Security check: Owner role can delete any staff, admin can only delete their own created staff
    if (req.user.role !== 'Owner' && staff.parentId?.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this staff member" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Staff member deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
