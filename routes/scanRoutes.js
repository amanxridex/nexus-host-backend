const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');

// Temporary - without auth for testing
// const { verifyToken } = require('../middleware/authMiddleware');
// router.use(verifyToken);

router.post('/verify', scanController.verifyTicket);
router.get('/fest-stats/:festId', scanController.getFestStats);
router.get('/recent-scans/:festId', scanController.getRecentScans);
router.post('/log-denied', scanController.logDenied);

module.exports = router;