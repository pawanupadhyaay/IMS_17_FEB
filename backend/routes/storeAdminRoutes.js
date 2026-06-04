const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getDashboardStats,
  getOrders,
  getCoupons,
  createCoupon,
  deleteCoupon,
  getBlogs,
  createBlog,
  deleteBlog,
  getReviews,
  deleteReview,
  getCustomers,
  getStaffs,
  createStaff,
  updateStaff,
  deleteStaff,
  updateBlog,
  updateCoupon,
  updateReview,
  getNotificationCounts,
  markReviewsAsRead,
  markOrdersAsRead,
  markQueriesAsRead
} = require('../controllers/storeAdminController');

const {
  getStoreQueries,
  updateQueryStatus,
  deleteStoreQuery
} = require('../controllers/storeQueryController');

// All routes are strictly protected and restricted to 'Owner'
router.use(protect);
router.use(authorize('Owner', 'admin')); // Including 'admin' for flexibility as per user user context

// Dashboard
router.route('/dashboard').get(getDashboardStats);

// Notifications
router.route('/notifications/counts').get(getNotificationCounts);
router.route('/reviews/mark-read').post(markReviewsAsRead);
router.route('/orders/mark-read').post(markOrdersAsRead);
router.route('/queries/mark-read').post(markQueriesAsRead);

// Orders
router.route('/orders').get(getOrders);

// Inquiries (Queries)
router.route('/queries').get(getStoreQueries);
router.route('/queries/:id')
  .put(updateQueryStatus)
  .delete(deleteStoreQuery);

// Coupons
router.route('/coupons')
  .get(getCoupons)
  .post(createCoupon);
router.route('/coupons/:id')
  .put(updateCoupon)
  .delete(deleteCoupon);

// Blogs
router.route('/blogs')
  .get(getBlogs)
  .post(createBlog);
router.route('/blogs/:id')
  .put(updateBlog)
  .delete(deleteBlog);

// Reviews
router.route('/reviews').get(getReviews);
router.route('/reviews/:id')
  .put(updateReview)
  .delete(deleteReview);

// Customers
router.route('/customers').get(getCustomers);

// Staffs
router.route('/staffs')
  .get(getStaffs)
  .post(createStaff);

router.route('/staffs/:id')
  .put(updateStaff)
  .delete(deleteStaff);

module.exports = router;
