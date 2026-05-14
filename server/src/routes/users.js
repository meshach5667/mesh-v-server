const express = require('express');
const { z } = require('zod');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

const locationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  expoPushToken: z.string().optional().nullable(),
});

router.post('/location', authMiddleware, async (req, res, next) => {
  try {
    const payload = locationSchema.parse(req.body);

    const update = {
      location: {
        type: 'Point',
        coordinates: [payload.longitude, payload.latitude],
      },
      updatedAt: new Date(),
    };

    if (payload.expoPushToken) {
      update.expoPushToken = payload.expoPushToken;
    }

    await User.updateOne({ _id: req.user.id }, { $set: update });

    return res.json({ message: 'Location updated successfully' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
