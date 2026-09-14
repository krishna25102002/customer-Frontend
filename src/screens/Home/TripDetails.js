import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActionBookingById, generateActionTripOtp } from '../../api';
import { C } from '../../theme';

const { width } = Dimensions.get('window');
const OTP_VALIDITY_SEC = 5 * 60;

const TripDetails = ({ navigation, route }) => {
  const { trip: initialTrip } = route.params;
  const bookingId = initialTrip.id || initialTrip.bookingId;

  const [trip, setTrip] = useState(initialTrip);
  const [status, setStatus] = useState(initialTrip.status?.toUpperCase() || 'CONFIRMED');
  const [otp, setOtp] = useState('');
  const [authed, setAuthed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [otpGeneratedAt, setOtpGeneratedAt] = useState(null);

  const pan = useRef(new Animated.ValueXY()).current;

  // ---- Poll the live booking status on an interval ----
  const load = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) setAuthed(true);
      if (!token || !bookingId) return;
      const res = await getActionBookingById(bookingId, token);
      const b = res.booking || {};
      // Refresh state from server
      setTrip((prev) => ({ ...prev, ...b }));
      setStatus(String(b.status || initialTrip.status || 'CONFIRMED').toUpperCase());
    } catch (err) {
      console.log('TRIP DETAILS ERR:', err.message || err);
    }
  }, [bookingId, initialTrip.status]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    const e = setInterval(() => {
      if (trip.startedAt || trip.tripStartedAt) {
        const start = new Date(trip.startedAt || trip.tripStartedAt).getTime();
        setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
      } else {
        setElapsed((prev) => prev + 1);
      }
      setOtpSecondsLeft((prev) => (otpGeneratedAt && prev > 0 ? prev - 1 : prev));
    }, 1000);
    return () => {
      clearInterval(t);
      clearInterval(e);
    };
  }, [load, otpGeneratedAt, trip.startedAt, trip.tripStartedAt]);

  const onTripDate = () => {
    if (!trip.fromDate) return true;
    const d = new Date(trip.fromDate);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const fmtOtpTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleGenerateOtp = async () => {
    if (!authed) {
      Alert.alert('Login', 'Please log in first.');
      return;
    }
    setGenerating(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await generateActionTripOtp(bookingId, token);
      setOtp(String(res.otp));
      const now = Date.now();
      setOtpGeneratedAt(now);
      setOtpSecondsLeft(OTP_VALIDITY_SEC);
    } catch (err) {
      console.log('OTP GEN ERR:', err);
      Alert.alert('Cannot generate OTP', err.message || err.data?.message, [
        { text: 'OK' },
      ]);
    } finally {
      setGenerating(false);
    }
  };

  const isStartable = status === 'CONFIRMED';
  const isOngoing = status === 'ONGOING';
  const isCompleted = status === 'COMPLETED';

  // ---- Swipe-to-pay for completed trips ----
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gesture) => {
        if (gesture.dx > width * 0.6) {
          navigation.navigate('PaymentScreen', { trip });
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const driver = trip.driver && (trip.driver.name || trip.driver.fullName);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.title}>Trip #{trip.bookingNumber || bookingId}</Text>
          <Text style={styles.subtitle}>{trip.pickupAddress || 'Pickup'} → {trip.dropAddress || 'Drop'}</Text>
        </View>
      </View>

      {/* Status banner */}
      <View style={styles.statusBanner}>
        <MaterialIcons
          name={isCompleted ? 'check-circle' : isOngoing ? 'directions-car' : 'event'}
          size={20}
          color={isCompleted ? C.success : C.accent}
        />
        <Text style={[styles.statusText, { color: isCompleted ? C.success : C.accent }]}>
          {isCompleted ? 'Trip Completed' : isOngoing ? 'Trip Ongoing' : 'Confirmed — Awaiting Trip Date'}
        </Text>
      </View>

      {/* Driver card */}
      <View style={styles.driverCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(driver || 'D').substring(0, 2).toUpperCase()}</Text>
        </View>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.name}>{driver || 'Looking for driver…'}</Text>
          <Text style={styles.meta}>
            {trip.startTime ? `${trip.startTime} – ${trip.endTime || '…'}` : ''}
            {trip.fromDate ? ` · ${new Date(trip.fromDate).toDateString()}` : ''}
          </Text>
        </View>
        <MaterialIcons name="call" size={24} color={C.primary} />
      </View>

      {/* OTP section — only for CONFIRMED / ONGOING */}
      {(isStartable || isOngoing) && authed && (
        <View style={styles.otpCard}>
          <View style={styles.otpHeader}>
            <Text style={styles.otpTitle}>
              {isOngoing ? 'End-Trip OTP' : 'Start-Trip OTP'}
            </Text>
            {otpGeneratedAt && otpSecondsLeft > 0 && (
              <Text style={[styles.otpTimer, otpSecondsLeft < 60 && { color: C.danger }]}>
                {fmtOtpTime(otpSecondsLeft)} left
              </Text>
            )}
          </View>

          {otp ? (
            <View style={styles.otpRow}>
              {otp.split('').map((d, i) => (
                <View key={i} style={styles.otpBox}>
                  <Text style={styles.otpDigit}>{d}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.otpHint}>
              {isOngoing
                ? 'Generate the end OTP and read it to the driver to finish the trip.'
                : onTripDate()
                ? 'Generate the start OTP and read it to the driver to begin.'
                : 'Trip is scheduled for a future date. OTP unlocks on the trip date.'}
            </Text>
          )}

          {isStartable && !onTripDate() && !otp ? (
            <Text style={styles.gateNote}>
              <MaterialIcons name="lock" size={14} color={C.warning} /> Starts on {trip.fromDate ? new Date(trip.fromDate).toDateString() : 'trip date'}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[styles.otpBtn, generating && { opacity: 0.6 }]}
            onPress={handleGenerateOtp}
            disabled={generating || (isStartable && !onTripDate())}
          >
            {generating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.otpBtnText}>
                {otp ? 'Regenerate OTP' : `Generate ${isOngoing ? 'End' : 'Start'} OTP`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Live timer for ongoing trips */}
      {isOngoing && (
        <View style={styles.timerCard}>
          <MaterialIcons name="timer" size={18} color={C.accent} />
          <Text style={styles.timerLabel}>Live trip duration</Text>
          <Text style={styles.timerValue}>
            {String(Math.floor(elapsed / 3600)).padStart(2, '0')}:
            {String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')}:
            {String(elapsed % 60).padStart(2, '0')}
          </Text>
        </View>
      )}

      {/* Completed — Swipe to pay */}
      {isCompleted && (
        <View style={styles.payCard}>
          <Text style={styles.payTitle}>Final fare</Text>
          <Text style={styles.payAmount}>
            ₹{Math.round(trip.actualFare ?? trip.amount ?? trip.estimatedFare ?? 0)}
          </Text>
          {trip.fareBreakup && trip.fareBreakup.baseFare != null && (
            <View style={styles.breakupBox}>
              <View style={styles.breakupRow}>
                <Text style={styles.breakupLabel}>Billable time</Text>
                <Text style={styles.breakupValue}>{trip.fareBreakup.billableHours || 0} hrs</Text>
              </View>
              <View style={styles.breakupRow}>
                <Text style={styles.breakupLabel}>Base fare</Text>
                <Text style={styles.breakupValue}>₹{Math.round(trip.fareBreakup.baseFare)}</Text>
              </View>
              <View style={styles.breakupRow}>
                <Text style={styles.breakupLabel}>Platform fee</Text>
                <Text style={styles.breakupValue}>₹{Math.round(trip.fareBreakup.platformFee)}</Text>
              </View>
              <View style={styles.breakupRow}>
                <Text style={styles.breakupLabel}>GST (18%)</Text>
                <Text style={styles.breakupValue}>₹{Math.round(trip.fareBreakup.taxGst)}</Text>
              </View>
            </View>
          )}

          {trip.paymentStatus === 'Paid' ? (
            <View style={styles.paidBadge}>
              <MaterialIcons name="verified" size={16} color={C.success} />
              <Text style={[styles.paidText, { color: C.success }]}>Paid</Text>
            </View>
          ) : (
            <>
              <View style={styles.swipeContainer}>
                <Text style={styles.swipeText}>Swipe to Complete & Pay</Text>
                <Animated.View
                  style={[styles.swipeButton, { transform: [{ translateX: pan.x }] }]}
                  {...panResponder.panHandlers}
                >
                  <MaterialIcons name="arrow-forward" size={20} color={C.accent} />
                </Animated.View>
              </View>
              <TouchableOpacity style={styles.payDirectBtn} onPress={() => navigation.navigate('PaymentScreen', { trip })}>
                <Text style={styles.payDirectText}>Pay ₹{Math.round(trip.actualFare ?? trip.amount ?? 0)}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {!isCompleted && (
        <Text style={styles.pollingNote}>Auto-refreshing status…</Text>
      )}
    </ScrollView>
  );
};

export default TripDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  backBtn: {
    padding: 6,
  },
  title: {
    color: C.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: C.textSub,
    fontSize: 13,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginTop: 18,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
  name: {
    color: C.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  meta: {
    color: C.textSub,
    fontSize: 12,
    marginTop: 2,
  },
  otpCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.accentBorder,
    borderTopWidth: 3,
    borderTopColor: C.accent,
    padding: 22,
    alignItems: 'center',
    marginTop: 18,
  },
  otpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  otpTitle: {
    color: C.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  otpTimer: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  otpHint: {
    color: C.textSub,
    textAlign: 'center',
    marginVertical: 14,
    lineHeight: 20,
  },
  gateNote: {
    color: C.warning,
    fontSize: 12,
    marginVertical: 8,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginVertical: 14,
  },
  otpBox: {
    width: 54,
    height: 58,
    borderRadius: 12,
    backgroundColor: C.accentSoft,
    borderWidth: 1.5,
    borderColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigit: {
    color: C.accent,
    fontSize: 30,
    fontWeight: 'bold',
  },
  otpBtn: {
    backgroundColor: C.accent,
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 30,
    marginTop: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...C.shadow,
    shadowOpacity: 0.25,
  },
  otpBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.accentBorder,
    padding: 14,
    marginTop: 14,
  },
  timerLabel: {
    color: C.textSub,
    marginLeft: 8,
    flex: 1,
  },
  timerValue: {
    color: C.accent,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  payCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginTop: 18,
    alignItems: 'center',
  },
  payTitle: {
    color: C.textSub,
    fontSize: 13,
  },
  payAmount: {
    color: C.accent,
    fontSize: 34,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  breakupBox: {
    width: '100%',
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  breakupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  breakupLabel: {
    color: C.textSub,
    fontSize: 12,
  },
  breakupValue: {
    color: C.text,
    fontSize: 12,
    fontWeight: '600',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.successSoft || '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  paidText: {
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 4,
  },
  payDirectBtn: {
    width: '100%',
    padding: 14,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: C.accent,
    alignItems: 'center',
    marginTop: 10,
  },
  payDirectText: {
    color: C.accent,
    fontWeight: 'bold',
    fontSize: 15,
  },
  swipeContainer: {
    width: '100%',
    backgroundColor: C.accent,
    borderRadius: 30,
    padding: 10,
    justifyContent: 'center',
  },
  swipeText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  swipeButton: {
    position: 'absolute',
    left: 10,
    backgroundColor: '#fff',
    height: 52,
    width: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    ...C.shadow,
  },
  pollingNote: {
    color: C.textMuted,
    textAlign: 'center',
    fontSize: 11,
    marginTop: 16,
  },
});