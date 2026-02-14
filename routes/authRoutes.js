const express = require('express');
const router = express.Router();
const { verifyHostSession, authenticateHost } = require('../middleware/authMiddleware'); // ✅ Updated import
const authController = require('../controllers/authController');

// ✅ NEW: Create host session (login)
router.post('/session', authController.createHostSession);

// ✅ NEW: Logout host
router.post('/logout', verifyHostSession, authController.logoutHost);

// Protected routes (now use verifyHostSession)
router.get('/check', verifyHostSession, authController.checkHost);
router.post('/signup', verifyHostSession, authController.createHost);
router.post('/login', verifyHostSession, authController.loginHost);
router.put('/profile', verifyHostSession, authController.updateProfile);

module.exports = router;