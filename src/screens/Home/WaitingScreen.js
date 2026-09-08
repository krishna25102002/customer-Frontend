import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBookingStatus } from '../../api';
import { C } from '../../theme';

const WaitingScreen = ({ route, navigation }) => {
  const { booking } = route.params;
  const [status, setStatus] = useState(booking?.status || 'Pending');
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    const bookingId = booking?._id;
    if (!bookingId) {
      setPolling(false);
      return;
    }

    const poll = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const data = await getBookingStatus(bookingId, token);
          const s = data.booking?.status;
          if (s) {
            setStatus(s);
            if (s === 'Completed' || s === 'Cancelled') {
              setPolling(false);
            }
          }
        }
      } catch (err) {
        console.log('STATUS POLL ERR:', err);
      }
    };

    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [booking]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="schedule" size={30} color="#fff" />
        <Text style={styles.title}>Waiting for Drivers</Text>
        <Text style={styles.subtitle}>
          {polling ? 'Looking for nearby drivers…' : 'Status: ' + status}
        </Text>
        {polling && <ActivityIndicator color="#fff" style={{ marginTop: 12 }} />}
      </View>

      {/* BOOKING STATUS CARD */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Booking Status</Text>
          <Text style={styles.driverName}>{status}</Text>
        </View>
        <Text style={styles.accept}>
          {status === 'Completed'
            ? 'Completed ✓'
            : status === 'Cancelled'
              ? 'Cancelled'
              : 'Waiting for a driver to accept…'}
        </Text>
      </View>

      {/* LOCATIONS */}
      <View style={styles.card}>
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: C.success }]} />
          <Text style={styles.routeText}>{booking?.pickup || 'Pickup location'}</Text>
        </View>
        <View style={[styles.routeRow, styles.routeRowLast]}>
          <View style={[styles.dot, { backgroundColor: C.danger }]} />
          <Text style={styles.routeText}>{booking?.drop || 'Drop location'}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
};

export default WaitingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 20,
    justifyContent: 'center',
  },

  header: {
    backgroundColor: C.primary,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    ...C.shadow,
    shadowOpacity: 0.25,
  },

  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 8,
  },

  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },

  card: {
    backgroundColor: C.surface,
    padding: 16,
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  label: {
    color: C.textMuted,
  },

  driverName: {
    color: C.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },

  accept: {
    color: C.textSub,
    marginTop: 6,
  },

  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  routeRowLast: {
    marginTop: 10,
  },

  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 10,
  },

  routeText: {
    color: C.text,
  },

  button: {
    backgroundColor: C.accent,
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    ...C.shadow,
    shadowOpacity: 0.25,
  },

  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});