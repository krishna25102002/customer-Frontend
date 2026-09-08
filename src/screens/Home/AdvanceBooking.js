import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBooking, getAppConfig } from '../../api';
import { C } from '../../theme';

const AdvanceBooking = ({ route, navigation }) => {
  const { driver } = route.params;
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [loading, setLoading] = useState(false);
  const [perHourRate, setPerHourRate] = useState(210);
  const [durationHours, setDurationHours] = useState(6);

  // Fetch the admin-configurable per-hour acting-driver rate.
  useEffect(() => {
    (async () => {
      try {
        const data = await getAppConfig();
        if (data.config && data.config.actingDriverPerHourRate) {
          setPerHourRate(data.config.actingDriverPerHourRate);
        }
      } catch (e) {
        console.log('GET CONFIG ERR:', e);
      }
    })();
  }, []);

  const estimatedFare = Math.round(durationHours * perHourRate);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        setLoading(false);
        return;
      }

      const payload = {
        driverId: driver.id,
        registrationNumber: '',
        pickup: 'Koramangala 5th Block',
        drop: 'Whitefield, ITPL Main Rd',
        tripType: 'Outstation',
        tripDate: new Date().toISOString().split('T')[0],
        tripTime: '7:00 AM',
        estimatedDistance: 28,
        estimatedDuration: durationHours * 60,
        estimatedFare,
        advanceAmount: Math.round(estimatedFare * 0.2),
      };

      console.log('📤 Create booking:', payload);
      const data = await createBooking(payload, token);

      Alert.alert('Success', data.message || 'Booking created!');
      navigation.replace('WaitingScreen', {
        driver,
        booking: data.booking,
      });
    } catch (err) {
      console.log('❌ Booking error:', err);
      Alert.alert('Error', err.message || 'Could not create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <Text style={styles.title}>Confirm Booking</Text>
      <Text style={styles.subtitle}>
        Pay advance to confirm your trip
      </Text>

      {/* DRIVER CARD */}
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(driver.name || 'D').substring(0, 2).toUpperCase()}
            </Text>
          </View>

          <View>
            <Text style={styles.name}>{driver.name}</Text>
            <Text style={styles.car}>4.9 ★ · Swift Dzire</Text>
          </View>
        </View>

        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: C.success }]} />
          <Text style={styles.routeText}>Koramangala 5th Block</Text>
        </View>
        <View style={[styles.routeRow, styles.routeRowLast]}>
          <View style={[styles.dot, { backgroundColor: C.danger }]} />
          <Text style={styles.routeText}>Whitefield, ITPL Main Rd</Text>
        </View>

        <Text style={styles.time}>Tomorrow, 7:00 AM · Outstation</Text>
      </View>

      {/* DURATION SELECTOR */}
      <View style={styles.card}>
        <Text style={styles.label}>Booking Duration</Text>
        <View style={styles.durationRow}>
          {[4, 6, 8, 10, 12].map((h) => (
            <TouchableOpacity
              key={h}
              style={[styles.durationBtn, durationHours === h && styles.activeDuration]}
              onPress={() => setDurationHours(h)}
            >
              <Text style={[styles.durationText, durationHours === h && styles.activeDurationText]}>
                {h}h
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.rateInfo}>Rate: ₹{perHourRate}/hour (set by admin)</Text>
      </View>

      {/* FARE DETAILS */}
      <View style={styles.fareCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Hours × Rate</Text>
          <Text style={styles.value}>{durationHours} × ₹{perHourRate}</Text>
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.label}>Estimated fare</Text>
          <Text style={styles.value}>₹{estimatedFare.toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.rowBetween}>
          <Text style={styles.advance}>Advance (20%)</Text>
          <Text style={styles.advanceAmount}>₹{Math.round(estimatedFare * 0.2).toLocaleString('en-IN')}</Text>
        </View>

        <Text style={styles.remaining}>
          Remaining ₹{(estimatedFare - Math.round(estimatedFare * 0.2)).toLocaleString('en-IN')} paid after trip
        </Text>
      </View>

      {/* PAYMENT MODE */}
      <Text style={styles.label}>Pay via</Text>
      <View style={styles.paymentRow}>
        <TouchableOpacity
          style={[styles.payBtn, paymentMode === 'UPI' && styles.activePay]}
          onPress={() => setPaymentMode('UPI')}
        >
          <Text style={[styles.payText, paymentMode === 'UPI' && styles.activePayText]}>UPI</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.payBtn, paymentMode === 'Card' && styles.activePay]}
          onPress={() => setPaymentMode('Card')}
        >
          <Text style={[styles.payText, paymentMode === 'Card' && styles.activePayText]}>Card</Text>
        </TouchableOpacity>
      </View>

      {/* CONFIRM PAYMENT */}
      <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.confirmText}>
            Pay ₹{Math.round(estimatedFare * 0.2).toLocaleString('en-IN')} & Confirm Ride
          </Text>
        )}
      </TouchableOpacity>

    </View>
  );
};

export default AdvanceBooking;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    color: C.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },

  subtitle: {
    color: C.textSub,
    marginBottom: 20,
  },

  card: {
    backgroundColor: C.surface,
    padding: 16,
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  avatar: {
    backgroundColor: C.primary,
    height: 50,
    width: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    ...C.shadow,
    shadowOpacity: 0.25,
  },

  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  name: {
    color: C.text,
    fontWeight: 'bold',
    fontSize: 16,
  },

  car: {
    color: C.textSub,
  },

  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  routeRowLast: {
    marginTop: 8,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },

  routeText: {
    color: C.text,
  },

  time: {
    color: C.textMuted,
    marginTop: 10,
  },

  label: {
    color: C.textSub,
    fontWeight: '600',
  },

  value: {
    color: C.accent,
    fontWeight: '600',
  },

  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 8,
  },

  fareCard: {
    backgroundColor: C.accentSoft,
    padding: 16,
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.accentBorder,
  },

  advance: {
    color: C.primaryDark,
    fontWeight: 'bold',
  },

  advanceAmount: {
    color: C.accent,
    fontSize: 18,
    fontWeight: 'bold',
  },

  remaining: {
    color: C.textSub,
    marginTop: 5,
    fontSize: 12,
  },

  // Duration selector
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 8,
  },

  durationBtn: {
    flex: 1,
    marginRight: 8,
    padding: 10,
    backgroundColor: C.inputBg,
    borderRadius: 10,
    alignItems: 'center',
  },

  activeDuration: {
    backgroundColor: C.accent,
  },

  durationText: {
    color: C.textSub,
    fontWeight: '600',
  },

  activeDurationText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  rateInfo: {
    color: C.textMuted,
    fontSize: 12,
    marginTop: 4,
  },

  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  payBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: C.surface,
    marginRight: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
  },

  activePay: {
    borderColor: C.accent,
    backgroundColor: C.accentSoft,
  },

  payText: {
    color: C.textSub,
    fontWeight: '600',
  },

  activePayText: {
    color: C.accent,
    fontWeight: 'bold',
  },

  confirmBtn: {
    backgroundColor: C.accent,
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
    ...C.shadow,
    shadowOpacity: 0.28,
  },

  confirmText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});