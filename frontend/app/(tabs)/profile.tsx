import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { useRouter } from 'expo-router';
import { getIncidents } from '../../services/api';

interface Hotspot {
  latitude: number;
  longitude: number;
  count: number;
  incidentTypes: string[];
}

export default function ProfileScreen() {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, logout } = useAuth();
  const { location } = useLocation();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      loadHotspots();
    }
  }, [user]);

  const loadHotspots = async () => {
    try {
      setLoading(true);

      const incidents = await getIncidents();
      const groupedHotspots = new Map<string, Hotspot>();

      incidents.forEach((incident: any) => {
        const latitude = Number(incident.latitude);
        const longitude = Number(incident.longitude);

        if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
          return;
        }

        const roundedLatitude = Number(latitude.toFixed(2));
        const roundedLongitude = Number(longitude.toFixed(2));
        const key = `${roundedLatitude}:${roundedLongitude}`;

        const incidentType = incident.incidentType || incident.incident_type || 'other';
        const existing = groupedHotspots.get(key);
        if (existing) {
          existing.count += 1;
          existing.incidentTypes = Array.from(new Set([...existing.incidentTypes, incidentType]));
          return;
        }

        groupedHotspots.set(key, {
          latitude: roundedLatitude,
          longitude: roundedLongitude,
          count: 1,
          incidentTypes: [incidentType],
        });
      });

      setHotspots(Array.from(groupedHotspots.values()).filter((hotspot) => hotspot.count >= 3));
    } catch (error) {
      console.error('Error loading hotspots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#fff" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.displayName || user?.email?.split('@')[0]}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Status</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.cardIcon}>
                <Ionicons
                  name={location ? 'location' : 'location-outline'}
                  size={24}
                  color={location ? '#4CAF50' : '#F57C00'}
                />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>
                  {location ? 'Location Enabled' : 'Location Disabled'}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {location
                    ? `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`
                    : 'Enable location to receive proximity alerts'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Incident Hotspots</Text>
            <TouchableOpacity onPress={loadHotspots}>
              <Ionicons name="refresh" size={20} color="#4A90E2" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#4A90E2" style={{ marginTop: 16 }} />
          ) : hotspots.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="shield-checkmark" size={48} color="#4CAF50" />
              <Text style={styles.emptyStateText}>No hotspots detected</Text>
            </View>
          ) : (
            hotspots.slice(0, 5).map((hotspot, index) => (
              <View key={index} style={styles.card}>
                <View style={styles.hotspotHeader}>
                  <View style={styles.hotspotBadge}>
                    <Ionicons name="warning" size={20} color="#F57C00" />
                    <Text style={styles.hotspotCount}>{hotspot.count} incidents</Text>
                  </View>
                </View>
                <View style={styles.hotspotLocation}>
                  <Ionicons name="location" size={16} color="#666" />
                  <Text style={styles.hotspotCoords}>
                    {hotspot.latitude.toFixed(4)}, {hotspot.longitude.toFixed(4)}
                  </Text>
                </View>
                <View style={styles.hotspotTypes}>
                  {hotspot.incidentTypes.map((type, idx) => (
                    <View key={idx} style={styles.typeTag}>
                      <Text style={styles.typeTagText}>{type}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About ShieldNet</Text>
          <View style={styles.card}>
            <Text style={styles.aboutText}>
              ShieldNet is a community-driven safety platform that helps you stay informed about
              incidents in your area and contribute to community safety.
            </Text>
            <View style={styles.statsContainer}>
              <View style={styles.stat}>
                <Ionicons name="shield-checkmark" size={24} color="#4A90E2" />
                <Text style={styles.statLabel}>Community Safety</Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="people" size={24} color="#4A90E2" />
                <Text style={styles.statLabel}>Real-time Alerts</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#D32F2F" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4A90E2',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2C6EAA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  userEmail: {
    fontSize: 14,
    color: '#E3F2FD',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  card: {
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
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  hotspotHeader: {
    marginBottom: 8,
  },
  hotspotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hotspotCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  hotspotLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  hotspotCoords: {
    fontSize: 12,
    color: '#666',
  },
  hotspotTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeTagText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#D32F2F',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D32F2F',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});
