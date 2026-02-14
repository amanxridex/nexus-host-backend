const express = require('express');
const router = express.Router();
const { verifyHostSession } = require('../middleware/authMiddleware');
const collegeController = require('../controllers/collegeController');

// Public routes (NO AUTH - for user portal)
router.get('/', collegeController.getColleges);
router.get('/locations', collegeController.getLocations);
router.get('/public/all', collegeController.getAllCollegesPublic); // NEW: Public endpoint for user portal

// Protected routes (for host portal)
router.post('/suggest', authenticateHost, collegeController.suggestCollege);

module.exports = router;