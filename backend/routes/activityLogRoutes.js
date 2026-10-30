const express = require('express')
const router = express.Router()
const { protect, imsOnly } = require('../middleware/auth')
const {
  createActivityLog,
  getActivityLogs,
  getAdmins,
} = require('../controllers/activityLogController')

// All routes require authentication
router.use(protect, imsOnly)

router.post('/', createActivityLog)
router.get('/', getActivityLogs)
router.get('/admins', getAdmins)

module.exports = router

