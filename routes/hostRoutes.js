const express = require('express');
const router = express.Router();

// ✅ FIXED: Destructure from object
const { verifyHostSession } = require('../middleware/authMiddleware');

const hostController = require('../controllers/hostController');

// ✅ Use verifyHostSession instead of authenticateHost
router.get('/profile', verifyHostSession, hostController.getProfile);
router.get('/stats', verifyHostSession, hostController.getStats);
router.get('/activity', verifyHostSession, hostController.getActivity);

module.exports = router;