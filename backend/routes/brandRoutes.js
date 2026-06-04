const express = require('express')
const router = express.Router()
const { getMostLovedBrands, getAllBrands } = require('../controllers/brandController')

router.get('/most-loved', getMostLovedBrands)
router.get('/', getAllBrands)

module.exports = router
