const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const collegeController = require('../controllers/collegeController');

// Public routes
router.get('/', collegeController.getColleges);
router.get('/locations', collegeController.getLocations);

// Protected routes
router.post('/suggest', verifyToken, collegeController.suggestCollege);

module.exports = router;