const express = require('express');
const router = express.Router();

const { verifyHostSession } = require('../middleware/authMiddleware');
const gymController = require('../controllers/gymController');

router.post('/', verifyHostSession, gymController.createGym);
router.get('/mine', verifyHostSession, gymController.getMyGyms);

module.exports = router;
