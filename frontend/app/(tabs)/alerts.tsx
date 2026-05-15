import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { subscribeToIncidents, updateUserLocation, getNearbyIncidents } from '../../services/api';

const Notifications =
  Platform.OS === 'web' ? null : require('expo-notifications');

interface Incident {
  id: string;
  incidentType?: string;
  incident_type?: string;
  description: string;
  latitude: number;
  longitude: number;
  severity: string;
  createdAt?: any;
  created_at?: any;
}


if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export default function AlertsScreen() {
  const [nearbyIncidents, setNearbyIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationToken, setNotificationToken] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const { location, requestLocation } = useLocation();

  const fetchNearbyIncidents = async (showLoading = true) => {
    if (authLoading || !user || !location) {
      if (showLoading) {
        setLoading(false);
      }
      setNearbyIncidents([]);
      return;
    }

    try {
      if (showLoading) {
        setLoading(true);
      }

      const incidents = await getNearbyIncidents(
        location.coords.latitude,
        location.coords.longitude,
        5,
      );

      if (Array.isArray(incidents)) {
        setNearbyIncidents(incidents);
      }
    } catch (error) {
      console.error('Error loading nearby incidents:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!location || authLoading || !user) {
      setLoading(false);
      return;
    }

    // Subscribe to real-time nearby incidents
    const unsubscribe = subscribeToIncidents(
      location.coords.latitude,
      location.coords.longitude,
      5, // 5km radius
      (incidents: any[]) => {
        setNearbyIncidents(incidents);
        setLoading(false);
      },
      () => {
        setNearbyIncidents([]);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [location, authLoading, user]);

  useEffect(() => {
    if (!Notifications) {
      return;
    }

    const setupNotifications = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.log('Notification permission denied');
          return;
        }

        // Get Expo push token
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        setNotificationToken(token);
        console.log('Expo Push Token:', token);

        // Send token to backend
        if (location && user && !authLoading) {
          await updateUserLocation(
            user.id,
            location.coords.latitude,
            location.coords.longitude,
            token
          );
        }

        // Configure notification channel for Android
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    };

    if (!authLoading && user) {
      setupNotifications();
      fetchNearbyIncidents();
    }

    // Listen for notifications
    const subscription = Notifications.addNotificationReceivedListener((notification: any) => {
      console.log('Notification received:', notification);
      if (user) {
        fetchNearbyIncidents(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [location, user, authLoading]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNearbyIncidents(false);
    setRefreshing(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#D32F2F';
      case 'high':
        return '#F57C00';
      case 'medium':
        return '#FBC02D';
      case 'low':
        return '#388E3C';
      default:
        return '#757575';
    }
  };

  const getIncidentType = (incident: Incident) => {
    return incident.incidentType || incident.incident_type || 'other';
  };

  const getIncidentIcon = (type: string) => {
    switch (type) {
      case 'theft':
        return 'bag-remove';
      case 'fire':
        return 'flame';
      case 'medical':
        return 'medical';
      case 'assault':
        return 'warning';
      case 'accident':
        return 'warning';
      default:
        return 'alert-circle';
    }
  };

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = typeof timestamp?.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Just now';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Proximity Alerts</Text>
          <Text style={styles.headerSubtitle}>
            {nearbyIncidents.length} incidents within 5km
          </Text>
        </View>
        <View style={styles.notificationBadge}>
          <Ionicons
            name={notificationToken ? 'notifications' : 'notifications-off'}
            size={24}
            color={notificationToken ? '#4CAF50' : '#F57C00'}
          />
        </View>
      </View>

      {!location ? (
        <View style={styles.emptyState}>
          <Ionicons name="location-outline" size={64} color="#ccc" />
          <Text style={styles.emptyStateTitle}>Location Required</Text>
          <Text style={styles.emptyStateText}>
            Enable location services to receive proximity alerts
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {nearbyIncidents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
              <Text style={styles.emptyStateTitle}>All Clear</Text>
              <Text style={styles.emptyStateText}>
                No incidents reported in your area recently
              </Text>
            </View>
          ) : (
            nearbyIncidents.map((incident) => (
              <View key={incident.id} style={styles.alertCard}>
                <View
                  style={[
                    styles.alertIconContainer,
                    { backgroundColor: getSeverityColor(incident.severity) },
                  ]}
                >
                  <Ionicons
                    name={getIncidentIcon(getIncidentType(incident)) as any}
                    size={28}
                    color="#fff"
                  />
                </View>
                <View style={styles.alertContent}>
                  <View style={styles.alertHeader}>
                    <Text style={styles.alertType}>
                      {getIncidentType(incident).toUpperCase()}
                    </Text>
                    <Text style={styles.alertTime}>
                      {getTimeAgo(incident.createdAt || incident.created_at)}
                    </Text>
                  </View>
                  <Text style={styles.alertDescription} numberOfLines={2}>
                    {incident.description}
                  </Text>
                  <View style={styles.alertFooter}>
                    <View style={styles.severityTag}>
                      <View
                        style={[
                          styles.severityDot,
                          { backgroundColor: getSeverityColor(incident.severity) },
                        ]}
                      />
                      <Text style={styles.severityText}>{incident.severity}</Text>
                    </View>
                    <View style={styles.locationTag}>
                      <Ionicons name="location" size={14} color="#666" />
                      <Text style={styles.locationText}>Nearby</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  notificationBadge: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  alertIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertType: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  alertTime: {
    fontSize: 12,
    color: '#999',
  },
  alertDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  alertFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  severityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});
