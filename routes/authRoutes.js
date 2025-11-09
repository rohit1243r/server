const express = require('express');
const { signup, login, getProfile } = require('../controllers/authController');
const auth = require('../middlewares/auth');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/profile', auth, getProfile);

module.exports = router;
