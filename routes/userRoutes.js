const express = require('express');
const auth = require('../middlewares/auth');
const User = require('../models/User');

const router = express.Router();

router.get('/tokens', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('tokens');
    res.json({
      success: true,
      tokens: user.tokens
    });
  } catch (error) {
    console.error('Get tokens error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tokens.'
    });
  }
});

router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        tokens: user.tokens,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile.'
    });
  }
});

module.exports = router;
