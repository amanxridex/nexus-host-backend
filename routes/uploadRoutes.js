const express = require('express');
const router = express.Router();
const { verifyHostSession } = require('../middleware/authMiddleware');
const { upload, handleUploadError } = require('../middleware/uploadMiddleware');
const uploadController = require('../controllers/uploadController');

// Upload ID card
router.post(
  '/id-card',
  authenticateHost,  // ✅ Changed from verifyToken
  upload.single('file'),
  handleUploadError,
  uploadController.uploadIdCard
);

// Upload avatar
router.post(
  '/avatar',
  authenticateHost,  // ✅ Changed from verifyToken
  upload.single('file'),
  handleUploadError,
  uploadController.uploadAvatar
);

module.exports = router;