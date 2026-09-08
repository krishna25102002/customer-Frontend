import React, { createContext, useState, useCallback, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCustomerProfile } from '../api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load the logged-in customer from storage on start.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('customer');
        if (raw) {
          setCustomer(JSON.parse(raw));
        }
      } catch (e) {
        console.log('AUTH CONTEXT LOAD ERR:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Re-fetch the customer from the backend (source of truth).
  const refreshProfile = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return null;
      const data = await getCustomerProfile(token);
      if (data.customer) {
        setCustomer(data.customer);
        await AsyncStorage.setItem('customer', JSON.stringify(data.customer));
      }
      return data.customer;
    } catch (e) {
      console.log('REFRESH PROFILE ERR:', e);
      return null;
    }
  }, []);

  // Update local + storage with a fresh customer object.
  const updateCustomer = useCallback(async (updated) => {
    setCustomer(updated);
    await AsyncStorage.setItem('customer', JSON.stringify(updated));
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('customer');
    setCustomer(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ customer, loading, refreshProfile, updateCustomer, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;