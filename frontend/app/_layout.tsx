import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { LocationProvider } from '../contexts/LocationContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <LocationProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </LocationProvider>
    </AuthProvider>
  );
}
