const express = require('express');
const router = express.Router();
const { recordPageView, getRealtimeStats } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

// Public route for storefront to log visits
router.post('/pageview', recordPageView);

// Protected route for IMS admin panel to fetch stats
router.get('/realtime', protect, getRealtimeStats);

module.exports = router;
