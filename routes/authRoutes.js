const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');

// Public routes (need token but no profile)
router.get('/check', verifyToken, authController.checkHost);

// Protected routes
router.post('/signup', verifyToken, authController.createHost);
router.post('/login', verifyToken, authController.loginHost);
router.put('/profile', verifyToken, authController.updateProfile);

module.exports = router;