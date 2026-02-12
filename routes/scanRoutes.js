const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');

// Auth middleware import check karo
const authMiddleware = require('../middleware/authMiddleware');

// If authMiddleware exports verifyToken directly:
router.use(authMiddleware.verifyToken || authMiddleware);

// Routes
router.post('/verify', scanController.verifyTicket);
router.get('/fest-stats/:festId', scanController.getFestStats);
router.get('/recent-scans/:festId', scanController.getRecentScans);
router.post('/log-denied', scanController.logDenied);

module.exports = router;