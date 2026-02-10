const express = require('express');
const router = express.Router();
const authenticateHost = require('../middleware/authMiddleware');
const hostController = require('../controllers/hostController'); // FIXED: was authController

// Host profile routes
router.get('/profile', authenticateHost, hostController.getProfile);
router.get('/stats', authenticateHost, hostController.getStats);
router.get('/activity', authenticateHost, hostController.getActivity);

module.exports = router;