import React, { useEffect, useRef, useState } from 'react';
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
  Modal,
  TextInput,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getActionBookingById,
  generateActionTripOtp,
  previewActionCancellation,
  cancelActionBooking,
  rateActionBooking,
} from '../../api';
import { useAlert } from '../../components/AlertProvider';
import { C } from '../../theme';

const { width } = Dimensions.get('window');

const OTP_VALIDITY_SEC = 5 * 60;

const CANCEL_REASONS = 
[
  { key: 'CUSTOMER_CHANGED_MIND', label: 'Customer changed mind' },
  { key: 'CUSTOMER_NO_SHOW', label: 'Customer not available' },
  { key: 'WRONG_PICKUP', label: 'Wrong pickup address' },
  { key: 'WRONG_DROP', label: 'Wrong drop address' },
  { key: 'LONG_WAIT', label: 'Driver taking too long' },
  { key: 'OTHER', label: 'Other' },
];

const formatPrice = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const timeLeft = (endMs) =>
  Math.max(0, Math.ceil((endMs - Date.now()) / 1000));

const formatElapsed = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
};

  const TripDetails = ({ navigation, route }) => {
  const initialTrip = route.params?.trip || {};
  const bookingId = initialTrip.id || initialTrip.bookingId;
  const alert = useAlert();

  const [trip, setTrip] = useState(initialTrip);
  const [status, setStatus] = useState((initialTrip.status || 'CONFIRMED').toUpperCase());
  const [otpCode, setOtpCode] = useState('');
  const [authed, setAuthed] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState(null);
  const [cancelDesc, setCancelDesc] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);

  const [rating, setRating] = useState(initialTrip.rating || null);
  const [rated, setRated] = useState(!!initialTrip.rating);
  const [rateModal, setRateModal] = useState(false);
  const [rateStars, setRateStars] = useState(0);
  const [rateComment, setRateComment] = useState('');
  const [rateBusy, setRateBusy] = useState(false);
  const ratingShownFor = useRef('');

  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [otpGeneratedAt, setOtpGeneratedAt] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const animY = useRef(new Animated.Value(0)).current;

  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef(null);

  useEffect(() => {
    startedAtRef.current = trip?.startedAt || null;
  }, [trip?.startedAt]);

  useEffect(() => {
    if (status !== 'ONGOING' || !startedAtRef.current) return undefined;
    const tick = () => {
      const base = startedAtRef.current;
      if (base) {
        setElapsed(
          Math.max(0, Math.floor((Date.now() - new Date(base).getTime()) / 1000))
        );
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [status]);

  const applyBooking = (b) => {
    if (!b?.booking) return;
    setTrip(b.booking);
    if (b.booking.status) setStatus(b.booking.status.toUpperCase());
    setRated(!!b.booking.rated);
    setRating(b.booking.rating || null);

    // Auto-open the rating popup once a trip completes (unless already rated).
    if (
      b.booking.status === 'Completed' &&
      !b.booking.rated &&
      ratingShownFor.current !== String(b.booking.id)
    ) {
      ratingShownFor.current = String(b.booking.id);
      setRateStars(0);
      setRateComment('');
      setRateModal(true);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        setAuthed(true);
        if (bookingId) {
          const b = await getActionBookingById(bookingId, token);
          applyBooking(b);
        }
      } catch (err) {
        console.log('TRIP LOAD ERR:', err.response?.data || err.message);
      }
    };
    load();
  }, [bookingId, reloadKey]);

  useEffect(() => {
    let interval;
    if (authed && bookingId && !['CONFIRMED', 'ONGOING'].includes(status)) {
      return undefined;
    }
    interval = setInterval(async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        const b = await getActionBookingById(bookingId, token);
        applyBooking(b);
      } catch (err) {
        console.log('POLL ERR:', err.response?.data || err.message);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [authed, bookingId, status]);

  useEffect(() => {
    if (!otpGeneratedAt) return undefined;
    const t = setInterval(() => {
      const left = timeLeft(otpGeneratedAt + OTP_VALIDITY_SEC * 1000);
      setOtpSecondsLeft(left);
      if (left <= 0) {
        setOtpGeneratedAt(null);
        setOtpSecondsLeft(0);
        setOtpCode('');
      }
    }, 1000);
    return () => clearInterval(t);
  }, [otpGeneratedAt]);

  const wrapDrag = useRef(new Animated.Value(0)).current;

  const handleCallOtp = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        alert.info('Session expired', 'Please log in again.');
        return;
      }
      setGenerating(true);
      const res = await generateActionTripOtp(bookingId, token);
      setOtpCode(res?.otp || '');
      setOtpGeneratedAt(Date.now());
      setOtpSecondsLeft(OTP_VALIDITY_SEC);
    } catch (err) {
      alert.error(
        'Could not generate OTP',
        err.response?.data?.message || err.message || 'Please try again.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handlePay = () => {
    if (!bookingId) {
      alert.error('Missing information', 'We could not find this booking.');
      return;
    }
    navigation.navigate('PaymentScreen', { trip: { ...trip, id: bookingId } });
  };

  const openRateModal = () => {
    setRateStars(0);
    setRateComment('');
    setRateModal(true);
  };

  const submitRating = async () => {
    if (rateStars < 1) {
      alert.warning('Select a rating', 'Tap a star to rate your driver.');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        alert.info('Session expired', 'Please log in again.');
        return;
      }
      setRateBusy(true);
      await rateActionBooking(
        bookingId,
        { stars: rateStars, comment: rateComment.trim() },
        token
      );
      setRated(true);
      setRating({ stars: rateStars, comment: rateComment.trim() });
      setRateModal(false);
      alert.success('Thanks!', 'Your rating helps track driver performance.');
    } catch (err) {
      alert.error(
        'Could not submit rating',
        err.response?.data?.message || err.message || 'Please try again.'
      );
    } finally {
      setRateBusy(false);
    }
  };

  const toggleReason = (r) =>
    setCancelReason((prev) => (prev?.key === r.key ? null : r));

  const closeCancelModal = () => {
    setCancelModal(false);
    setCancelReason(null);
    setCancelDesc('');
  };

  const handleCancelTrip = () => {
    setCancelModal(true);
  };

  const confirmCancelTrip = async () => {
    if (!cancelReason) {
      alert.warning('Select a reason', 'Choose a reason to continue cancelling.');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        alert.info('Session expired', 'Please log in again.');
        return;
      }
      setCancelBusy(true);
      const reason = cancelDesc && cancelDesc.trim()
        ? `${cancelReason.label} — ${cancelDesc.trim()}`
        : cancelReason.label;
      await cancelActionBooking(bookingId, reason, token);
      alert.success('Trip cancelled', 'Your trip has been cancelled.');
      navigation.goBack();
    } catch (err) {
      alert.error(
        'Cannot cancel',
        err.response?.data?.message || err.message || 'Something went wrong.'
      );
    } finally {
      setCancelBusy(false);
      closeCancelModal();
    }
  };

  const driver = trip?.driver || trip?.driverDetails || {};
  const isStartable = status === 'CONFIRMED';
  const isOngoing = status === 'ONGOING';
  const isCompleted = status === 'COMPLETED';

  const onDragRelease = () => {};
  const cancelPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: onDragRelease,
    })
  ).current;

  return (
    <ScrollView style={styles.container}>
      {loadError ? (
        <View style={styles.centerBox}>
          <MaterialIcons name="error-outline" size={44} color={C.danger} />
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setReloadKey((k) => k + 1)}>
            <Text style={styles.primaryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.headerCard}>
            <View style={styles.headerRow}>
              <Text style={styles.bookingLabel}>
                Booking #{trip?.bookingNumber || bookingId}
              </Text>
              <View style={[styles.statusBadge, statusBadgeColor(status)]}>
                <Text style={[styles.statusText, statusTextColor(status)]}>{status}</Text>
              </View>
            </View>
            <Text style={styles.subLabel}>
              {trip?.pickupAddressTxt || trip?.pickupAddress || 'Pickup TBD'}
            </Text>
            <Text style={styles.fareLine}>
              {formatPrice(trip?.finalFare ?? trip?.estimatedFare)} · {trip?.estimatedKm || 0} km
            </Text>
          </View>

          {driver?.name ? (
            <View style={styles.driverCard}>
              <View style={styles.avatar}>
                <MaterialIcons name="person" size={40} color={C.primary} />
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{driver.name}</Text>
                <Text style={styles.driverSub}>{driver.vehicleName || driver.vehicle?.name || 'Driver'}</Text>
              </View>
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => alert.info('Calling driver', `Calling ${driver.name}…`)}
              >
                <MaterialIcons name="call" size={22} color={C.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.driverEmptyCard}>
              <MaterialIcons name="person-search" size={30} color={C.textMuted} />
              <Text style={styles.driverEmptyText}>Looking for a driver…</Text>
            </View>
          )}

          {isOngoing ? (
            <View style={styles.liveCard}>
              <View style={styles.livePill}>
                <MaterialIcons name="timer" size={14} color={C.accentBorder} />
                <Text style={styles.livePillText}>LIVE TRIP</Text>
              </View>
              <Text style={styles.liveTimer}>{formatElapsed(elapsed)}</Text>
              <Text style={styles.liveSub}>
                Trip in progress — from {trip?.pickupAddressTxt || trip?.pickupAddress || 'pickup'}
              </Text>
            </View>
          ) : null}

          {(isStartable || isOngoing) && (
            <View style={styles.otpCard}>
              <Text style={styles.otpTitle}>
                {isOngoing ? 'End trip OTP' : 'Start trip OTP'}
              </Text>
              <Text style={styles.otpHint}>
                {isOngoing
                  ? 'Generate this OTP and read it out so the driver can end the trip.'
                  : 'Generate this OTP and read it out so the driver can start the trip.'}
                {' '}Valid for {OTP_VALIDITY_SEC / 60} minutes.
              </Text>
              {otpGeneratedAt && otpCode ? (
                <View style={styles.otpBox}>
                  <Text style={styles.otpValue}>{otpCode}</Text>
                  <Text style={styles.otpCountdown}>Read this OTP to your driver</Text>
                </View>
              ) : null}
              <TouchableOpacity
                style={[styles.primaryBtn, generating && { opacity: 0.6 }]}
                onPress={handleCallOtp}
                disabled={generating}
              >
                {generating ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {otpGeneratedAt
                      ? 'Regenerate OTP'
                      : `Generate ${isOngoing ? 'End' : 'Start'} OTP`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {isCompleted && (
            <TouchableOpacity style={styles.payBtn} onPress={handlePay}>
              <Text style={styles.payBtnText}>Pay Now</Text>
            </TouchableOpacity>
          )}

          {isCompleted && (
            <TouchableOpacity
              style={[styles.rateCard, rated && styles.rateCardDone]}
              onPress={rated ? null : openRateModal}
              disabled={rated}
            >
              <MaterialIcons
                name={rated ? 'check-circle' : 'star'}
                size={20}
                color={rated ? C.success : C.warning}
              />
              <Text style={[styles.rateCardText, rated && { color: C.success }]}>
                {rated
                  ? `You rated ★ ${rating?.stars} / 5`
                  : 'Rate your driver'}
              </Text>
              {!rated && (
                <MaterialIcons name="chevron-right" size={20} color={C.textMuted} />
              )}
            </TouchableOpacity>
          )}

          {!isCompleted && !isOngoing && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelTrip}>
              <MaterialIcons name="close" size={18} color={C.danger} />
              <Text style={styles.cancelBtnText}>Cancel Trip</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.pollingNote}>
            {isCompleted ? 'Trip completed.' : 'Auto-refreshing status…'}
          </Text>
        </>
      )}

      <Modal
        transparent
        visible={cancelModal}
        animationType="fade"
        onRequestClose={closeCancelModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalCard, { transform: [{ translateY: animY }] }]}>
            <Text style={styles.modalTitle}>Cancel Trip</Text>
            <Text style={styles.modalSubtitle}>
              Tell the driver why. This will end the booking and release the driver.
            </Text>
            {CANCEL_REASONS.map((r) => {
              const selected = cancelReason?.key === r.key;
              return (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.reasonRow, selected && styles.reasonRowSelected]}
                  onPress={() => toggleReason(r)}
                >
                  <MaterialIcons
                    name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={20}
                    color={selected ? C.danger : C.textMuted}
                  />
                  <Text style={[styles.reasonText, selected && styles.reasonTextSelected]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note (optional)"
              placeholderTextColor={C.textMuted}
              value={cancelDesc}
              onChangeText={setCancelDesc}
              multiline
            />
            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={closeCancelModal}>
                <Text style={[styles.btnText, { color: C.textSub }]}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnDanger, cancelBusy && { opacity: 0.6 }]}
                onPress={confirmCancelTrip}
                disabled={cancelBusy}
              >
                {cancelBusy ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <Text style={styles.btnTextDanger}>Cancel Trip</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={rateModal}
        animationType="fade"
        onRequestClose={() => !rateBusy && setRateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalCard, { transform: [{ translateY: animY }] }]}>
            <View style={styles.rateHeader}>
              <Text style={styles.rateTitle}>Rate your driver</Text>
              <Text style={styles.rateSubtitle}>
                {driver?.fullName || driver?.name || 'Your driver'}
              </Text>
            </View>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={styles.starBtn}
                  onPress={() => setRateStars(n)}
                >
                  <MaterialIcons
                    name={n <= rateStars ? 'star' : 'star-border'}
                    size={38}
                    color={n <= rateStars ? C.warning : C.textMuted}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.rateHint}>
              {rateStars ? `${rateStars} / 5` : 'Tap a star to rate this trip'}
            </Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Add a comment (optional)"
              placeholderTextColor={C.textMuted}
              value={rateComment}
              onChangeText={setRateComment}
              multiline
            />
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel, rateBusy && { opacity: 0.6 }]}
                onPress={() => setRateModal(false)}
                disabled={rateBusy}
              >
                <Text style={[styles.btnText, { color: C.textSub }]}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnRate, rateBusy && { opacity: 0.6 }]}
                onPress={submitRating}
                disabled={rateBusy}
              >
                {rateBusy ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <Text style={styles.btnTextDanger}>Submit Rating</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const statusBadgeColor = (s) => {
  switch (s) {
    case 'CONFIRMED': return { backgroundColor: C.accentSoft };
    case 'ONGOING': return { backgroundColor: C.infoSoft };
    case 'COMPLETED': return { backgroundColor: C.successSoft };
    case 'CANCELLED': return { backgroundColor: C.dangerSoft };
    default: return { backgroundColor: C.primarySoft };
  }
};

const statusTextColor = (s) => {
  switch (s) {
    case 'CONFIRMED': return { color: C.accentDark };
    case 'ONGOING': return { color: C.info };
    case 'COMPLETED': return { color: C.success };
    case 'CANCELLED': return { color: C.danger };
    default: return { color: C.textSub };
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centerBox: {
    marginTop: 80,
    alignItems: 'center',
    padding: 30,
  },
  errorText: {
    marginTop: 12,
    color: C.danger,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  headerCard: {
    margin: 14,
    padding: 16,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: C.primary,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  subLabel: {
    marginTop: 8,
    color: C.textSub,
    fontSize: 13,
    lineHeight: 18,
  },
  fareLine: {
    marginTop: 6,
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 14,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInfo: {
    flex: 1,
    marginLeft: 12,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  driverSub: {
    marginTop: 2,
    color: C.textSub,
    fontSize: 13,
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 16,
    backgroundColor: C.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  driverEmptyText: {
    marginLeft: 10,
    color: C.textMuted,
    fontSize: 14,
  },
  liveCard: {
    marginHorizontal: 14,
    marginBottom: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: 'center',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  livePillText: {
    marginLeft: 4,
    color: C.accentBorder,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  liveTimer: {
    marginTop: 10,
    color: C.white,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  liveSub: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    textAlign: 'center',
  },
  otpCard: {
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 16,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  otpTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.primary,
  },
  otpHint: {
    marginTop: 4,
    color: C.textSub,
    fontSize: 12,
    lineHeight: 17,
  },
  otpValue: {
    marginTop: 8,
    fontSize: 30,
    fontWeight: '800',
    color: C.accent,
    letterSpacing: 4,
  },
  otpBox: {
    marginTop: 12,
    backgroundColor: C.surfaceAlt,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  otpCountdown: {
    marginTop: 2,
    color: C.textMuted,
    fontSize: 12,
  },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: C.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 14,
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.danger,
    backgroundColor: C.surface,
  },
  cancelBtnText: {
    marginLeft: 6,
    color: C.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  payBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 14,
    marginBottom: 14,
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: C.success,
  },
  payBtnText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
  },
  rateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginBottom: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.warning,
    backgroundColor: C.surface,
  },
  rateCardDone: {
    borderColor: C.success,
    borderStyle: 'dashed',
  },
  rateCardText: {
    flex: 1,
    marginLeft: 8,
    color: C.warning,
    fontSize: 15,
    fontWeight: '700',
  },
  rateHeader: {
    alignItems: 'center',
    marginBottom: 6,
  },
  rateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.primary,
  },
  rateSubtitle: {
    marginTop: 4,
    color: C.textSub,
    fontSize: 13,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 14,
  },
  starBtn: {
    paddingHorizontal: 6,
  },
  rateHint: {
    textAlign: 'center',
    color: C.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  btnRate: {
    backgroundColor: C.accent,
    marginLeft: 8,
  },
  pollingNote: {
    textAlign: 'center',
    color: C.textMuted,
    fontSize: 12,
    marginVertical: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.primary,
  },
  modalSubtitle: {
    marginTop: 6,
    marginBottom: 12,
    color: C.textSub,
    fontSize: 13,
    lineHeight: 18,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
    backgroundColor: C.surfaceAlt,
  },
  reasonRowSelected: {
    borderColor: C.danger,
    backgroundColor: C.dangerSoft,
  },
  reasonText: {
    marginLeft: 10,
    fontSize: 14,
    color: C.text,
  },
  reasonTextSelected: {
    color: C.danger,
    fontWeight: '700',
  },
  noteInput: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: C.borderDark,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text,
    textAlignVertical: 'top',
    marginTop: 6,
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderDark,
    marginRight: 8,
  },
  btnDanger: {
    backgroundColor: C.danger,
    marginLeft: 8,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  btnTextDanger: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default TripDetails;
