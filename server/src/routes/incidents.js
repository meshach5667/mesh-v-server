const express = require('express');
const { z } = require('zod');
const authMiddleware = require('../middleware/auth');
const Incident = require('../models/Incident');
const User = require('../models/User');
const { broadcast } = require('../services/websocket');
const { sendProximityAlerts } = require('../services/notifications');

const router = express.Router();

const incidentSchema = z.object({
  incident_type: z.string().min(2),
  description: z.string().min(5),
  latitude: z.number(),
  longitude: z.number(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

const emergencySchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  description: z.string().optional().nullable(),
});

const toResponse = (incident) => ({
  id: incident._id.toString(),
  user_id: incident.userId.toString(),
  incident_type: incident.incidentType,
  description: incident.description,
  latitude: incident.location.coordinates[1],
  longitude: incident.location.coordinates[0],
  severity: incident.severity,
  status: incident.status,
  created_at: incident.createdAt,
  updated_at: incident.updatedAt,
});

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const payload = incidentSchema.parse(req.body);

    const incident = await Incident.create({
      userId: req.user.id,
      incidentType: payload.incident_type,
      description: payload.description,
      location: {
        type: 'Point',
        coordinates: [payload.longitude, payload.latitude],
      },
      severity: payload.severity || 'medium',
      status: 'active',
    });

    const responsePayload = {
      ...toResponse(incident),
      created_at: incident.createdAt.toISOString(),
      updated_at: incident.updatedAt.toISOString(),
    };

    broadcast({
      type: 'new_incident',
      data: responsePayload,
    });

    const nearbyUsers = await User.find({
      _id: { $ne: req.user.id },
      expoPushToken: { $ne: null },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [payload.longitude, payload.latitude],
          },
          $maxDistance: 5000,
        },
      },
    }).lean();

    if (nearbyUsers.length) {
      await sendProximityAlerts({
        incidentType: payload.incident_type,
        description: payload.description,
        severity: payload.severity || 'medium',
        latitude: payload.latitude,
        longitude: payload.longitude,
      }, nearbyUsers);
    }

    return res.status(201).json({
      ok: true,
      incidentId: incident._id.toString(),
      message: 'Incident reported successfully',
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/emergency', authMiddleware, async (req, res, next) => {
  try {
    const payload = emergencySchema.parse(req.body);
    const description = (payload.description || 'Emergency SOS triggered').trim();

    await User.updateOne(
      { _id: req.user.id },
      {
        $set: {
          location: {
            type: 'Point',
            coordinates: [payload.longitude, payload.latitude],
          },
          updatedAt: new Date(),
        },
      }
    );

    const incident = await Incident.create({
      userId: req.user.id,
      incidentType: 'sos',
      description,
      location: {
        type: 'Point',
        coordinates: [payload.longitude, payload.latitude],
      },
      severity: 'critical',
      status: 'active',
    });

    const responsePayload = {
      ...toResponse(incident),
      created_at: incident.createdAt.toISOString(),
      updated_at: incident.updatedAt.toISOString(),
    };

    broadcast({
      type: 'new_incident',
      data: responsePayload,
    });

    const nearbyUsers = await User.find({
      _id: { $ne: req.user.id },
      expoPushToken: { $ne: null },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [payload.longitude, payload.latitude],
          },
          $maxDistance: 5000,
        },
      },
    }).lean();

    if (nearbyUsers.length) {
      await sendProximityAlerts({
        incidentType: 'sos',
        description,
        severity: 'critical',
        latitude: payload.latitude,
        longitude: payload.longitude,
      }, nearbyUsers);
    }

    return res.status(201).json({
      ok: true,
      incidentId: incident._id.toString(),
      message: 'Emergency incident reported successfully',
    });
  } catch (error) {
    return next(error);
  }
});

const listIncidents = async (req, res, next) => {
  try {
    const latitude = req.query.latitude ? Number(req.query.latitude) : null;
    const longitude = req.query.longitude ? Number(req.query.longitude) : null;
    const radiusKm = req.query.radiusKm ? Number(req.query.radiusKm) : null;
    const radius = req.query.radius ? Number(req.query.radius) : null;
    const status = req.query.status || 'active';
    const limit = Math.min(Number(req.query.limit || 100), 200);

    const query = { status };

    if (latitude !== null && longitude !== null) {
      const maxDistance = radius !== null
        ? radius
        : radiusKm !== null
          ? radiusKm * 1000
          : null;

      if (maxDistance !== null) {
        query.location = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: maxDistance,
          },
        };
      }
    }

    const incidents = await Incident.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json(incidents.map((incident) => ({
      id: incident._id.toString(),
      user_id: incident.userId.toString(),
      incident_type: incident.incidentType,
      description: incident.description,
      latitude: incident.location.coordinates[1],
      longitude: incident.location.coordinates[0],
      severity: incident.severity,
      status: incident.status,
      created_at: incident.createdAt,
      updated_at: incident.updatedAt,
    })));
  } catch (error) {
    return next(error);
  }
};

router.get('/', authMiddleware, listIncidents);

router.get('/nearby', authMiddleware, (req, res, next) => {
  req.query.radiusKm = req.query.radiusKm || '5';
  return listIncidents(req, res, next);
});

module.exports = router;
