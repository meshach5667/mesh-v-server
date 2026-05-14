import React, { createContext, useState, useEffect, useContext } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

interface LocationContextType {
  location: Location.LocationObject | null;
  error: string | null;
  loading: boolean;
  requestLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestLocation = async () => {
    try {
      setLoading(true);
      setError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setError('Location permission denied');
        Alert.alert(
          'Permission Required',
          'Location permission is required to report incidents and receive proximity alerts.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation(currentLocation);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      console.error('Error getting location:', err);
    }
  };

  useEffect(() => {
    requestLocation();
  }, []);

  return (
    <LocationContext.Provider
      value={{
        location,
        error,
        loading,
        requestLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
