const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');

// ✅ FIXED: Import verifyHostSession properly
const { verifyHostSession } = require('../middleware/authMiddleware');

// ✅ FIXED: Use verifyHostSession in all routes
router.post('/verify', verifyHostSession, scanController.verifyTicket);
router.get('/fest-stats/:festId', verifyHostSession, scanController.getFestStats);
router.get('/recent-scans/:festId', verifyHostSession, scanController.getRecentScans);
router.post('/log-denied', verifyHostSession, scanController.logDenied);

module.exports = router;