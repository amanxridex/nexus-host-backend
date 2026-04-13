const express = require('express');
const router = express.Router();
const { createRestaurant, getMyRestaurants, updateRestaurant, toggleRestaurantStatus } = require('../controllers/restaurantController');
const { verifyHostSession } = require('../middleware/authMiddleware');

router.use(verifyHostSession);

router.post('/', createRestaurant);
router.get('/mine', getMyRestaurants);
router.put('/:id', updateRestaurant);
router.patch('/:id/status', toggleRestaurantStatus);

module.exports = router;
