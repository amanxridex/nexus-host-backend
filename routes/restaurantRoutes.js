const express = require('express');
const router = express.Router();
const { createRestaurant, getMyRestaurants } = require('../controllers/restaurantController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.post('/', createRestaurant);
router.get('/mine', getMyRestaurants);

module.exports = router;
