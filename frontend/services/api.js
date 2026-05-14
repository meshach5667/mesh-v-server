import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:4000/api').replace(/\/$/, '');

const buildUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

const getToken = async () => AsyncStorage.getItem('authToken');

const apiRequest = async (path, { method = 'GET', body, auth = true } = {}) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = await getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = response.status;
    throw error;
  }

  return data;
};

/**
 * Register user.
 */
const registerUser = async ({ email, password, display_name }) => {
  try {
    const result = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        email,
        password,
        displayName: display_name,
      },
      auth: false,
    });

    return { ok: true, ...result };
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
};

/**
 * Login user
 */
const loginUser = async (email, password) => {
  try {
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });

    return { ok: true, ...result };
  } catch (error) {
    console.error('Error logging in user:', error);
    throw error;
  }
};

const getCurrentUser = async () => {
  return apiRequest('/auth/me');
};

/**
 * Update user location and FCM token
 */
const updateUserLocation = async (userId, latitude, longitude, fcmToken = null) => {
  try {
    const result = await apiRequest('/user/location', {
      method: 'POST',
      body: {
        latitude,
        longitude,
        ...(fcmToken ? { expoPushToken: fcmToken } : {}),
      },
    });

    return { ok: true, ...result };
  } catch (error) {
    console.error('Error updating location:', error);
    throw error;
  }
};

/**
 * Create incident
 */
const createIncident = async (userId, incidentData) => {
  try {
    const result = await apiRequest('/incidents', {
      method: 'POST',
      body: {
        incident_type: incidentData.incident_type,
        description: incidentData.description,
        latitude: incidentData.latitude,
        longitude: incidentData.longitude,
        severity: incidentData.severity || 'medium',
      },
    });

    return { ok: true, ...result };
  } catch (error) {
    console.error('Error creating incident:', error);
    throw error;
  }
};

/**
 * Create emergency incident (SOS)
 * @param {string} userId
 * @param {number} latitude
 * @param {number} longitude
 * @param {string|null} [description=null]
 */
const createEmergencyIncident = async (userId, latitude, longitude, description = null) => {
  try {
    const result = await apiRequest('/incidents/emergency', {
      method: 'POST',
      body: {
        latitude,
        longitude,
        ...(description ? { description } : {}),
      },
    });

    return { ok: true, ...result };
  } catch (error) {
    console.error('Error creating emergency incident:', error);
    throw error;
  }
};

/**
 * Get incidents - optionally filtered by proximity
 * @param {number|null} latitude
 * @param {number|null} longitude
 * @param {number|null} radiusKm
 * @param {string} status
 * @param {number} maxResults
 * @returns {Promise<any[]>}
 */
const getIncidents = async (
  latitude = null,
  longitude = null,
  radiusKm = null,
  status = 'active',
  maxResults = 100
) => {
  try {
    const params = new URLSearchParams();
    if (status) {
      params.append('status', status);
    }
    if (latitude != null && longitude != null) {
      params.append('latitude', String(latitude));
      params.append('longitude', String(longitude));
    }
    if (radiusKm != null) {
      params.append('radiusKm', String(radiusKm));
    }
    if (maxResults != null) {
      params.append('limit', String(maxResults));
    }

    return await apiRequest(`/incidents?${params.toString()}`);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    throw error;
  }
};

/**
 * Get incidents near a specific location
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} [radiusKm=5]
 * @returns {Promise<any[]>}
 */
const getNearbyIncidents = async (latitude, longitude, radiusKm = 5) => {
  return getIncidents(latitude, longitude, radiusKm);
};

/**
 * Subscribe to incidents via polling so the UI stays updated without a real-time database listener
 * @param {number|null} latitude
 * @param {number|null} longitude
 * @param {number|null} radiusKm
 * @param {Function} onSnapshot_callback
 * @param {Function|null} [onError=null]
 */
const subscribeToIncidents = (
  latitude = null,
  longitude = null,
  radiusKm = null,
  onSnapshot_callback,
  onError = null
) => {
  try {
    let isActive = true;
    let pollTimer = null;
    let socket = null;

    const fetchIncidents = async () => {
      try {
        const incidents = await getIncidents(latitude, longitude, radiusKm);
        if (isActive) {
          onSnapshot_callback(incidents);
        }
      } catch (error) {
        console.error('Error subscribing to incidents:', error);
        if (onError) {
          onError(error);
        }
      }
    };

    const startPolling = () => {
      if (pollTimer) {
        return;
      }
      pollTimer = setInterval(fetchIncidents, 15000);
    };

    fetchIncidents();

    const wsUrl = API_BASE_URL.replace(/^http/, 'ws').replace(/\/$/, '').replace(/\/api$/, '') + '/api/ws';
    try {
      socket = new WebSocket(wsUrl);
      socket.onmessage = () => fetchIncidents();
      socket.onerror = () => startPolling();
      socket.onclose = () => startPolling();
    } catch (error) {
      startPolling();
    }

    return () => {
      isActive = false;
      if (socket) {
        socket.close();
      }
      if (pollTimer) {
        clearInterval(pollTimer);
      }
    };
  } catch (error) {
    console.error('Error subscribing to incidents:', error);
    throw error;
  }
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (toRad(lat2) - toRad(lat1)) / 2;
  const dLon = (toRad(lon2) - toRad(lon1)) / 2;
  const a = Math.sin(dLat) * Math.sin(dLat) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon) * Math.sin(dLon);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg) => (deg * Math.PI) / 180;

// Deprecated - kept for backward compatibility
const post = async (endpoint, token, data) => {
  return apiRequest(endpoint, {
    method: 'POST',
    body: data,
    auth: Boolean(token),
  });
};

const get = async (endpoint, token) => {
  return apiRequest(endpoint, {
    method: 'GET',
    auth: Boolean(token),
  });
};

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
});

const reportEmergencyIncident = async (token, data) => {
  return apiRequest('/incidents/emergency', {
    method: 'POST',
    body: data,
    auth: Boolean(token),
  });
};

export {
  registerUser,
  loginUser,
  getCurrentUser,
  updateUserLocation,
  createIncident,
  createEmergencyIncident,
  getIncidents,
  getNearbyIncidents,
  subscribeToIncidents,
  calculateDistance,
  // Deprecated exports for backward compatibility
  post,
  get,
  authHeaders,
  reportEmergencyIncident,
};
