const express = require('express');
const authMiddleware = require('../middleware/auth');
const Incident = require('../models/Incident');

const router = express.Router();

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const minIncidents = Number(req.query.minIncidents || 3);
    const limit = Math.min(Number(req.query.limit || 50), 100);

    const pipeline = [
      { $match: { status: 'active' } },
      {
        $group: {
          _id: {
            lat: { $round: [{ $arrayElemAt: ['$location.coordinates', 1] }, 2] },
            lng: { $round: [{ $arrayElemAt: ['$location.coordinates', 0] }, 2] },
          },
          count: { $sum: 1 },
          incident_types: { $addToSet: '$incidentType' },
          incidents: {
            $push: {
              id: { $toString: '$_id' },
              type: '$incidentType',
              severity: '$severity',
            },
          },
        },
      },
      { $match: { count: { $gte: minIncidents } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ];

    const hotspots = await Incident.aggregate(pipeline);

    return res.json(hotspots.map((hotspot) => ({
      latitude: hotspot._id.lat,
      longitude: hotspot._id.lng,
      count: hotspot.count,
      incidentTypes: hotspot.incident_types,
      incidents: hotspot.incidents,
    })));
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
