const express = require('express');
const router = express.Router();

const { verifyHostSession } = require('../middleware/authMiddleware');
const propertyController = require('../controllers/propertyController');

router.post('/', verifyHostSession, propertyController.createProperty);
router.get('/mine', verifyHostSession, propertyController.getMyProperties);

module.exports = router;
