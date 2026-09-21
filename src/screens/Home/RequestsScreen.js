import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActionBookings, cancelActionBooking, previewActionCancellation } from '../../api';
import BottomTab from '../../components/BottomTab';
import { useAlert } from '../../components/AlertProvider';
import { formatElapsed, liveBill } from '../../utils/liveBill';
import { C } from '../../theme';

const TABS = [
  { key: 'requested', label: 'Requested', status: 'PENDING' },
  { key: 'accepted', label: 'Accepted', status: 'CONFIRMED' },
  { key: 'ongoing', label: 'Ongoing', status: 'ONGOING' },
  { key: 'rejected', label: 'Rejected', status: 'NO_DRIVER_AVAILABLE,CANCELLED' },
];

const STATUS_META = {
  PENDING: { label: 'Waiting for drivers', bg: C.warning, soft: C.accentSoft, dot: '#FF9500' },
  CONFIRMED: { label: 'Accepted', bg: C.success, soft: C.successSoft, dot: '#22B358' },
  ONGOING: { label: 'Ongoing', bg: C.info, soft: C.infoSoft, dot: '#3B82F6' },
  NO_DRIVER_AVAILABLE: { label: 'No driver available', bg: C.danger, soft: C.dangerSoft, dot: '#EF4444' },
  CANCELLED: { label: 'Cancelled', bg: C.textMuted, soft: '#F0F0F2', dot: '#9E9EA7' },
};

const OngoingCountdown = ({ startedAt, perHourRate = 210 }) => {
  const [sec, setSec] = useState(0);

  useEffect(() => {
    if (!startedAt) return undefined;
    const tick = () =>
      setSec(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  const bill = liveBill(sec, perHourRate);

  return (
    <View style={styles.liveRow}>
      <View style={styles.liveTimerWrap}>
        <MaterialIcons name="timer" size={18} color={C.info} />
        <Text style={styles.liveTimerText}>{formatElapsed(sec)}</Text>
      </View>
      <View style={styles.liveBillWrap}>
        <Text style={styles.liveBillValue}>₹{bill.total.toLocaleString('en-IN')}</Text>
        <Text style={styles.liveBillSub}>{bill.billableHours} hrs • running bill</Text>
      </View>
    </View>
  );
};

const RequestsScreen = ({ navigation }) => {
  const alert = useAlert();
  const [activeTab, setActiveTab] = useState('requested');
  const [lists, setLists] = useState({ requested: [], accepted: [], upcoming: [], rejected: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const results = await Promise.all(
        TABS.map(async (tab) => {
          const data = await getActionBookings(tab.status, token);
          return [tab.key, data.bookings || []];
        })
      );
      const next = {};
      results.forEach(([k, v]) => { next[k] = v; });
      setLists(next);
    } catch (err) {
      console.log('REQUESTS LOAD ERR:', err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadAll();
      setLoading(false);
    })();
    const t = setInterval(loadAll, 6000);
    return () => clearInterval(t);
  }, [loadAll]);

  const refresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const doCancel = async (booking) => {
    setCancellingId(booking.id);
    try {
      const token = await AsyncStorage.getItem('token');
      await cancelActionBooking(booking.id, 'Cancelled by customer', token);
      await loadAll();
      alert.success('Cancelled', 'Booking cancelled.');
    } catch (err) {
      alert.error('Could not cancel', err.message || 'Could not cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const confirmCancel = (booking, feeNote) => {
    alert.confirm({
      title: 'Cancel booking',
      message: `Cancel booking ${booking.bookingNumber}?${feeNote ? `\n\n${feeNote}` : ''}`,
      confirmText: 'Yes, Cancel',
      cancelText: 'No',
      destructive: true,
      onConfirm: () => doCancel(booking),
    });
  };

  const handleCancel = async (booking) => {
    if (booking.status !== 'CONFIRMED') {
      confirmCancel(booking, null);
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      const preview = await previewActionCancellation(booking.id, token);
      const fee = Number(preview.cancellationFee || 0);
      confirmCancel(
        booking,
        fee > 0
          ? `A cancellation fee of ₹${fee.toLocaleString('en-IN')} will be added to your dues.`
          : 'No cancellation fee applies at this stage.'
      );
    } catch (err) {
      confirmCancel(booking, null);
    }
  };

  const renderBooking = ({ item }) => {
    const meta = STATUS_META[item.status] || STATUS_META.CANCELLED;
    const isRequested = item.status === 'PENDING';
    const isReassigning = item.flowStatus === 'DRIVER_REASSIGNING';
    const isNoShowReassign = isReassigning && item.unavailabilityReason === 'DRIVER_NO_SHOW' && !item.driver;
    const cancelledWithFee = item.status === 'CANCELLED' && Number(item.amountDue) > 0;
    const showDriver = item.status === 'CONFIRMED' || item.status === 'ONGOING';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.bookingNumber}>{item.bookingNumber || 'Booking'}</Text>
            <View style={[styles.statusPill, { backgroundColor: meta.soft }]}>
              <View style={[styles.statusDot, { backgroundColor: meta.dot }]} />
              <Text style={[styles.statusText, { color: meta.bg }]}>{meta.label}</Text>
            </View>
          </View>
          <Text style={styles.amount}>
            ₹{item.amount != null ? Number(item.amount).toLocaleString('en-IN') : 0}
          </Text>
        </View>

        {isReassigning && (
          <View style={styles.reassignNote}>
            <Text style={styles.reassignNoteText}>
              {item.unavailabilityDescription
                ? `${item.unavailabilityDescription} — finding a replacement…`
                : isNoShowReassign
                  ? 'Driver did not show up — finding a replacement…'
                  : 'Driver unavailable — finding a replacement…'}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={styles.line}>{item.fromDate}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>⏰</Text>
          <Text style={styles.line}>{item.startTime} → {item.endTime} ({item.durationHours}h)</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>🟢</Text>
          <Text style={styles.line}>{item.pickupAddress || 'Pickup'}</Text>
        </View>
        {item.dropAddress ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🔴</Text>
            <Text style={styles.line}>{item.dropAddress}</Text>
          </View>
        ) : null}

        <View style={styles.summaryPill}>
          <Text style={styles.summaryText}>
            {isReassigning
              ? item.unavailabilityDescription
                ? item.unavailabilityDescription
                : isNoShowReassign
                  ? 'Driver did not show up — finding a replacement…'
                  : 'Driver unavailable — finding a replacement…'
              : item.driver && showDriver
                ? `✓ Accepted by ${item.driver.fullName}`
                : item.requestSummary
                  ? `${item.requestSummary.accepted} accepted • ${item.requestSummary.rejected} rejected • ${item.requestSummary.pending} waiting`
                  : 'No response yet'}
          </Text>
        </View>

        {item.status === 'ONGOING' && item.startedAt && (
          <OngoingCountdown startedAt={item.startedAt} perHourRate={item.perHourRate || 210} />
        )}

        {cancelledWithFee && (
          <View style={styles.feeDue}>
            <Text style={styles.feeDueText}>
              Cancellation fee payable: ₹{Number(item.amountDue).toLocaleString('en-IN')}
            </Text>
          </View>
        )}

        {item.status === 'CANCELLED' && (item.cancelReason || item.unavailabilityDescription) && (
          <View style={styles.cancelReasonBox}>
            <Text style={styles.cancelReasonText}>
              {[item.unavailabilityDescription, item.cancelReason].filter(Boolean).join(' — ')}
            </Text>
          </View>
        )}

        {(isRequested || item.status === 'CONFIRMED') && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => handleCancel(item)}
            disabled={cancellingId === item.id}
          >
            {cancellingId === item.id ? (
              <ActivityIndicator color={C.danger} />
            ) : (
              <Text style={styles.cancelText}>{isRequested ? 'Cancel Request' : 'Cancel Booking'}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const listData = lists[activeTab] || [];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Requests</Text>
      <Text style={styles.subheader}>Track your acting-driver bookings</Text>

      {/* SEGMENTED CONTROL */}
      <View style={styles.segment}>
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderBooking}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 90 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.primary} colors={[C.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>
                {activeTab === 'requested' ? '🧭' : activeTab === 'rejected' ? '🗑️' : '📬'}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'requested'
                  ? 'No pending requests. Book a driver from the Home page.'
                  : activeTab === 'rejected'
                    ? 'No rejected bookings.'
                    : activeTab === 'ongoing'
                      ? 'No ongoing trips right now.'
                      : `No ${activeTab} bookings yet.`}
              </Text>
            </View>
          }
        />
      )}

      <BottomTab navigation={navigation} activeTab="Requests" />
    </View>
  );
};

export default RequestsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 16,
    paddingBottom: 80,
  },

  header: {
    color: C.text,
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 4,
  },
  subheader: {
    color: C.textMuted,
    fontSize: 13,
    marginBottom: 14,
  },

  // SEGMENTED CONTROL
  segment: {
    flexDirection: 'row',
    backgroundColor: C.inputBg,
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 11,
  },
  segmentItemActive: {
    backgroundColor: C.surface,
    ...C.shadow,
    shadowOpacity: 0.12,
  },
  segmentText: {
    color: C.textSub,
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: C.accent,
    fontWeight: 'bold',
  },

  // CARD
  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookingNumber: {
    color: C.text,
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 6,
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  amount: {
    color: C.accent,
    fontSize: 20,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailIcon: {
    width: 26,
    fontSize: 12,
  },
  line: {
    color: C.textSub,
    fontSize: 13,
    flexShrink: 1,
  },
  summaryPill: {
    backgroundColor: C.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  summaryText: {
    color: C.textSub,
    fontSize: 12,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.infoSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  liveTimerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveTimerText: {
    color: C.info,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginLeft: 6,
    fontVariant: ['tabular-nums'],
  },
  liveBillWrap: {
    alignItems: 'flex-end',
  },
  liveBillValue: {
    color: C.info,
    fontSize: 15,
    fontWeight: 'bold',
  },
  liveBillSub: {
    color: C.textSub,
    fontSize: 11,
    marginTop: 1,
  },
  reassignNote: {
    backgroundColor: '#FFF4D6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  reassignNoteText: {
    color: C.warning,
    fontSize: 12,
    fontWeight: '600',
  },
  feeDue: {
    backgroundColor: C.dangerSoft || '#FEE',
    marginTop: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  feeDueText: {
    color: C.danger,
    fontSize: 12,
    fontWeight: 'bold',
  },
  cancelReasonBox: {
    backgroundColor: '#F3F3F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  cancelReasonText: {
    color: C.textSub,
    fontSize: 12,
  },
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: C.danger,
    borderRadius: 24,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelText: {
    color: C.danger,
    fontWeight: 'bold',
  },

  emptyBox: {
    alignItems: 'center',
    marginTop: 50,
    padding: 20,
  },
  emptyIcon: {
    fontSize: 34,
    marginBottom: 10,
  },
  emptyText: {
    color: C.textMuted,
    textAlign: 'center',
  },
});