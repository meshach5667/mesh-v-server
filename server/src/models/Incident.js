const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    incidentType: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      default: 'active',
      trim: true,
    },
  },
  { timestamps: true }
);

IncidentSchema.index({ location: '2dsphere' });
IncidentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Incident', IncidentSchema);
