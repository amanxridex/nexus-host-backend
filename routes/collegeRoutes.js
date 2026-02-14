const express = require('express');
const router = express.Router();

// ✅ FIXED: Use verifyHostSession (not authenticateHost)
const { verifyHostSession } = require('../middleware/authMiddleware');

const collegeController = require('../controllers/collegeController');

// Public routes (NO AUTH - for user portal)
router.get('/', collegeController.getColleges);
router.get('/locations', collegeController.getLocations);
router.get('/public/all', collegeController.getAllCollegesPublic);

// Protected routes (for host portal)
// ✅ FIXED: Use verifyHostSession
router.post('/suggest', verifyHostSession, collegeController.suggestCollege);

module.exports = router;