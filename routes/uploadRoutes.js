const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { upload, handleUploadError } = require('../middleware/uploadMiddleware');
const uploadController = require('../controllers/uploadController');

// Upload ID card
router.post(
  '/id-card',
  verifyToken,
  upload.single('file'),
  handleUploadError,
  uploadController.uploadIdCard
);

// Upload avatar
router.post(
  '/avatar',
  verifyToken,
  upload.single('file'),
  handleUploadError,
  uploadController.uploadAvatar
);

module.exports = router;