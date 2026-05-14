const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const env = require('../config/env');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1).max(80).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signToken = (userId) => {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
};

router.post('/register', async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);
    const email = payload.email.toLowerCase();

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await User.create({
      email,
      passwordHash,
      displayName: payload.displayName || null,
    });

    const token = signToken(user._id.toString());

    return res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const email = payload.email.toLowerCase();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user._id.toString());

    return res.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;
