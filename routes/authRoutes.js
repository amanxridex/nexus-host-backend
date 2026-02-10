const express = require('express');
const router = express.Router();
const authenticateHost = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');

router.get('/check', authenticateHost, authController.checkHost);
router.post('/signup', authenticateHost, authController.createHost);
router.post('/login', authenticateHost, authController.loginHost);
router.put('/profile', authenticateHost, authController.updateProfile);

module.exports = router;