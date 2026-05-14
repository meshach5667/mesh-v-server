const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      default: null,
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
      },
    },
    expoPushToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

UserSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', UserSchema);
