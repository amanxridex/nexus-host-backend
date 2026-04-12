const express = require('express');
const router = express.Router();
const { createRestaurant, getMyRestaurants } = require('../controllers/restaurantController');
const { verifyHostSession } = require('../middleware/authMiddleware');

router.use(verifyHostSession);

router.post('/', createRestaurant);
router.get('/mine', getMyRestaurants);

module.exports = router;
