const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Missing authorization token' });
    }

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub).lean();

    if (!user) {
      return res.status(401).json({ message: 'Invalid authentication token' });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName || null,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid authentication token' });
  }
};

module.exports = authMiddleware;
