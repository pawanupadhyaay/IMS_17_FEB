const express = require('express');
const router = express.Router();
const { getBlogs, getBlogBySlug } = require('../controllers/blogController');

router.get('/', getBlogs);
router.get('/:slug', getBlogBySlug);

module.exports = router;
