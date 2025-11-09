const tokenCheck = async (req, res, next) => {
  try {
    if (req.user.tokens <= 0) {
      return res.status(403).json({
        success: false,
        message: "You've run out of tokens! Please contact support to get more tokens.",
        tokensRemaining: 0
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during token validation.'
    });
  }
};

module.exports = tokenCheck;
