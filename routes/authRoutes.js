const express = require('express');
const router = express.Router();
const authenticateHost = require('../middleware/authMiddleware'); // Changed from verifyToken
const authController = require('../controllers/authController');

// Public routes (need token but no profile)
router.get('/check', authenticateHost, authController.checkHost);

// Protected routes
router.post('/signup', authenticateHost, authController.createHost);
router.post('/login', authenticateHost, authController.loginHost);
router.put('/profile', authenticateHost, authController.updateProfile);

module.exports = router;