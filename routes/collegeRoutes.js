const express = require('express');
const router = express.Router();
const authenticateHost = require('../middleware/authMiddleware');  // ✅ Fixed
const collegeController = require('../controllers/collegeController');

// Public routes
router.get('/', collegeController.getColleges);
router.get('/locations', collegeController.getLocations);

// Protected routes
router.post('/suggest', authenticateHost, collegeController.suggestCollege);  // ✅ Fixed

module.exports = router;