const express = require('express');
const router = express.Router();
const { recordPageView, getRealtimeStats } = require('../controllers/analyticsController');
const { protect, imsOnly } = require('../middleware/auth');

// Public route for storefront to log visits
router.post('/pageview', recordPageView);

// Protected route for IMS admin panel to fetch stats
router.get('/realtime', protect, imsOnly, getRealtimeStats);

module.exports = router;
