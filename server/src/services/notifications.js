const { Expo } = require('expo-server-sdk');
const env = require('../config/env');

const expo = new Expo(env.expoAccessToken ? { accessToken: env.expoAccessToken } : undefined);

const formatTitle = (incidentType, severity) => {
  const emoji = {
    low: 'ℹ️',
    medium: '⚠️',
    high: '🚨',
    critical: '🔴',
  };

  return `${emoji[severity] || '⚠️'} ${String(incidentType).toUpperCase()} Alert Nearby`;
};

const sendProximityAlerts = async (incident, users) => {
  const tokens = users
    .map((user) => user.expoPushToken)
    .filter((token) => Expo.isExpoPushToken(token));

  if (tokens.length === 0) {
    return;
  }

  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title: formatTitle(incident.incidentType, incident.severity),
    body: `${incident.description.slice(0, 100)}... - Check your map for details`,
    data: {
      incident_type: incident.incidentType,
      severity: incident.severity,
      latitude: String(incident.latitude),
      longitude: String(incident.longitude),
    },
  }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (error) {
      // Ignore notification errors so they do not break incident creation.
    }
  }
};

module.exports = { sendProximityAlerts };
