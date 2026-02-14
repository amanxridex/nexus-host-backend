const express = require('express');
const router = express.Router();

// ✅ FIXED: Use verifyHostSession
const { verifyHostSession } = require('../middleware/authMiddleware');

const { upload, handleUploadError } = require('../middleware/uploadMiddleware');
const uploadController = require('../controllers/uploadController');

// Upload ID card
router.post(
  '/id-card',
  verifyHostSession,  // ✅ FIXED: Changed from authenticateHost
  upload.single('file'),
  handleUploadError,
  uploadController.uploadIdCard
);

// Upload avatar
router.post(
  '/avatar',
  verifyHostSession,  // ✅ FIXED: Changed from authenticateHost
  upload.single('file'),
  handleUploadError,
  uploadController.uploadAvatar
);

module.exports = router;