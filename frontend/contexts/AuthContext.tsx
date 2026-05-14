import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser, loginUser, registerUser } from '../services/api';

interface AuthUser {
  id: string;
  email: string;
  displayName?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('authToken');
        if (!storedToken) {
          setLoading(false);
          return;
        }

        setToken(storedToken);
        const result = await getCurrentUser();
        setUser(result.user);
      } catch (error) {
        await AsyncStorage.removeItem('authToken');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeSession();
  }, []);

  const setSession = async (authToken: string, userData: AuthUser) => {
    setToken(authToken);
    setUser(userData);
    await AsyncStorage.setItem('authToken', authToken);
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
  ) => {
    try {
      const result = await registerUser({
        email,
        password,
        display_name: displayName,
      });

      if (!result.token || !result.user) {
        throw new Error('Registration failed');
      }

      await setSession(result.token, result.user);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await loginUser(email, password);

      if (!result.token || !result.user) {
        throw new Error('Login failed');
      }

      await setSession(result.token, result.user);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      setToken(null);
      await AsyncStorage.removeItem('authToken');
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    return token || (await AsyncStorage.getItem('authToken'));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        logout,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
