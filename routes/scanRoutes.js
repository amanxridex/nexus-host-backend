const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');
const { verifyToken } = require('../middleware/authMiddleware');

// All routes need host authentication
router.use(verifyToken);

router.post('/verify', scanController.verifyTicket);
router.get('/fest-stats/:festId', scanController.getFestStats);
router.get('/recent-scans/:festId', scanController.getRecentScans);
// Add to scanRoutes.js
router.post('/log-denied', scanController.logDenied);

module.exports = router;