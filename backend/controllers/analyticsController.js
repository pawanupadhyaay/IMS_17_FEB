const PageView = require('../models/PageView');

// @desc    Record a storefront pageview
// @route   POST /api/analytics/pageview
// @access  Public
exports.recordPageView = async (req, res) => {
  try {
    const { url, country, sessionId } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required' });
    }

    const pageView = await PageView.create({
      url,
      ip,
      country: country || 'India',
      userAgent,
      sessionId: sessionId || ip // Fallback to IP if no sessionId
    });

    res.status(201).json({ success: true, data: pageView });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get real-time traffic statistics
// @route   GET /api/analytics/realtime
// @access  Private (Admin)
exports.getRealtimeStats = async (req, res) => {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Active Users (unique sessions in the last 30 minutes)
    const activeSessions = await PageView.distinct('sessionId', {
      createdAt: { $gte: thirtyMinutesAgo }
    });
    const activeUsersCount = activeSessions.length;

    // 2. Country Breakdown (last 24 hours)
    const countryStats = await PageView.aggregate([
      { $match: { createdAt: { $gte: oneDayAgo } } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const countries = countryStats.map(c => ({
      country: c._id,
      count: c.count
    }));

    // 3. Top Pages (last 24 hours)
    const pageStats = await PageView.aggregate([
      { $match: { createdAt: { $gte: oneDayAgo } } },
      { $group: { _id: '$url', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const topPages = pageStats.map(p => ({
      url: p._id,
      count: p.count
    }));

    // 4. Traffic Over Time (hourly pageviews for the last 24 hours)
    const trafficOverTime = await PageView.aggregate([
      { $match: { createdAt: { $gte: oneDayAgo } } },
      {
        $group: {
          _id: {
            hour: { $hour: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          time: { $first: '$createdAt' }
        }
      },
      { $sort: { '_id.day': 1, '_id.hour': 1 } }
    ]);

    const trafficData = trafficOverTime.map(t => ({
      hour: new Date(t.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      count: t.count
    }));

    res.status(200).json({
      success: true,
      data: {
        activeUsers: activeUsersCount,
        countries,
        topPages,
        trafficData
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
