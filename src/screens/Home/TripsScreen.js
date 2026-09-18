import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import BottomTab from '../../components/BottomTab';
import { getBookings, getActionBookings } from '../../api';
import { C } from '../../theme';

const { width } = Dimensions.get('window');

const TABS = ['Upcoming', 'Completed', 'Cancelled'];
const SEG_WIDTH = (width - 32 - 8) / 3;

/* ============================================================
   HELPERS
============================================================ */

const padZero = (n) => String(n).padStart(2, '0');

const fmtDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const fmtDateTime = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })} at ${padZero(dt.getHours())}:${padZero(dt.getMinutes())}`;
};

const groupOf = (status) => {
  const s = String(status || '').toUpperCase();
  if (s === 'COMPLETED') return 'Completed';
  if (s === 'CANCELLED' || s === 'NO_DRIVER_AVAILABLE' || s === 'EXPIRED') return 'Cancelled';
  return 'Upcoming';
};

const STATUS_META = (status) => {
  const s = String(status || '').toUpperCase();
  const map = {
    PENDING: { label: 'Awaiting Driver', color: C.warning },
    SEARCHING: { label: 'Searching', color: C.warning },
    CONFIRMED: { label: 'Confirmed', color: C.success },
    ACCEPTED: { label: 'Accepted', color: C.success },
    ASSIGNED: { label: 'Driver Assigned', color: C.info },
    'REACHED PICKUP': { label: 'Reached Pickup', color: C.accent },
    'TRIP STARTED': { label: 'Trip Started', color: C.accent },
    ONGOING: { label: 'Ongoing', color: C.info },
    COMPLETED: { label: 'Completed', color: C.success },
    CANCELLED: { label: 'Cancelled', color: C.danger },
    EXPIRED: { label: 'Expired', color: C.textMuted },
    NO_DRIVER_AVAILABLE: { label: 'No Driver Found', color: C.danger },
  };
  return map[s] || { label: status || '—', color: C.textSub };
};

const normalizeBooking = (b) => {
  const driver = b.driver || b.driverId || null;
  return {
    id: b.id || b._id,
    bookingNumber: b.bookingNumber || '',
    status: b.status || b.bookingStatus || 'PENDING',
    fromDate: b.fromDate || b.tripDate || null,
    toDate: b.toDate || null,
    startTime: b.startTime || b.tripTime || '',
    endTime: b.endTime || '',
    pickup: b.pickupAddress || (typeof b.pickup === 'string' ? b.pickup : b.pickup?.address) || 'Pickup location',
    drop: b.dropAddress || (typeof b.drop === 'string' ? b.drop : b.drop?.address) || 'Drop location',
    amount: b.amount ?? b.estimatedFare ?? 0,
    duration: b.durationHours ?? b.estimatedDuration ?? 0,
    tripType: b.tripType || 'Local',
    driver: driver
      ? {
          name: driver.fullName || driver.name || 'Driver',
          rating: driver.rating != null ? driver.rating : '—',
        }
      : null,
    requestedAt: b.bookingCreatedAt || b.createdAt || b.requestedAt || null,
    paymentStatus: b.paymentStatus || 'Pending',
    cancelledBy: b.cancelledBy || null,
    cancelReason: b.cancelReason || null,
    unavailabilityDescription: b.unavailabilityDescription || null,
    cancelledAt: b.cancelledAt || null,
    flowStatus: b.flowStatus || null,
  };
};

/* ============================================================
   SCREEN
============================================================ */

const TripsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('Upcoming');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('customer');
        if (raw) {
          const c = JSON.parse(raw);
          setCustomerName(c?.fullName || c?.name || '');
        }
      } catch (e) {
        console.log('CUSTOMER NAME ERR:', e);
      }
    })();
  }, []);

  const load = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const [legacy, action] = await Promise.all([
        getBookings(token).catch(() => ({ bookings: [] })),
        getActionBookings(null, token).catch(() => ({ bookings: [] })),
      ]);

      const seen = new Set();
      const list = [];
      [...(action.bookings || []), ...(legacy.bookings || [])].forEach((b) => {
        const key = String(b.id || b._id);
        if (seen.has(key)) return;
        seen.add(key);
        list.push(normalizeBooking(b));
      });

      list.sort((a, b) => new Date(b.requestedAt || 0) - new Date(a.requestedAt || 0));
      setTrips(list);
    } catch (err) {
      console.log('TRIPS ERR:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleTabSwitch = (idx) => {
    const tab = TABS[idx];
    setActiveTab(tab);
    Animated.timing(slideAnim, {
      toValue: idx * SEG_WIDTH,
      duration: 240,
      useNativeDriver: true,
    }).start();
  };

  const counts = {
    Upcoming: trips.filter((t) => groupOf(t.status) === 'Upcoming').length,
    Completed: trips.filter((t) => groupOf(t.status) === 'Completed').length,
    Cancelled: trips.filter((t) => groupOf(t.status) === 'Cancelled').length,
  };

  const visibleTrips = trips.filter((t) => groupOf(t.status) === activeTab);

  const renderTrip = ({ item }) => {
    const meta = STATUS_META(item.status);
    const isCancelled = groupOf(item.status) === 'Cancelled';
    const dateText =
      item.toDate && new Date(item.toDate).toDateString() !== new Date(item.fromDate).toDateString()
        ? `${fmtDate(item.fromDate)} – ${fmtDate(item.toDate)}`
        : fmtDate(item.fromDate) || '—';
    const timeText = item.startTime ? `${item.startTime} – ${item.endTime || '…'}` : '—';
    const initials = (item.driver?.name || 'D').substring(0, 2).toUpperCase();

    return (
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => {
          if (!isCancelled) navigation.navigate('TripDetails', { trip: item });
        }}
      >
        <View style={styles.card}>
          <View style={[styles.statusRail, { backgroundColor: meta.color }]} />

          <View style={styles.cardBody}>
            <View style={styles.cardTop}>
              <View style={[styles.chip, { backgroundColor: `${meta.color}18` }]}>
                <View style={[styles.chipDot, { backgroundColor: meta.color }]} />
                <Text style={[styles.chipText, { color: meta.color }]}>{meta.label}</Text>
              </View>
              <Text style={styles.bookingNo}>#{item.bookingNumber}</Text>
            </View>

            <View style={styles.routeBlock}>
              <View style={styles.routeCol}>
                <View style={[styles.routeDot, { backgroundColor: C.success }]} />
                <View style={styles.connector} />
                <View style={[styles.routeDot, { backgroundColor: C.danger }]} />
              </View>
              <View style={styles.routeTexts}>
                <Text style={styles.routeText} numberOfLines={1}>{item.pickup}</Text>
                <Text style={styles.routeText} numberOfLines={1}>{item.drop}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoGrid}>
              <InfoTile icon="calendar-month" label="DATE" value={dateText} />
              <InfoTile icon="schedule" label="TIME" value={timeText} />
              <InfoTile icon="hourglass-empty" label="DURATION" value={`${item.duration || 0} hrs`} />
              <InfoTile icon="currency-rupee" label="EST. FARE" value={`₹${item.amount}`} accent />
            </View>

            {item.driver ? (
              <View style={styles.driverRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{item.driver.name}</Text>
                  <Text style={styles.driverSub}>
                    ⭐ {item.driver.rating} • {item.tripType} booking
                  </Text>
                </View>
                <MaterialIcons name="verified-user" size={26} color={C.success} />
              </View>
            ) : (
              <View style={styles.searchingRow}>
                <ActivityIndicator size="small" color={C.accent} />
                <Text style={styles.searchingText}>
                  {groupOf(item.status) === 'Cancelled' ? 'No driver accepted' : 'Looking for a driver…'}
                </Text>
              </View>
            )}

            <View style={styles.footerRow}>
              <MaterialIcons name="receipt-long" size={14} color={C.textMuted} />
              <Text style={styles.bookedText}>Booked on {fmtDateTime(item.requestedAt)}</Text>
              <View style={styles.payBadge}>
                <Text style={styles.payBadgeText}>{item.paymentStatus}</Text>
              </View>
            </View>

            {isCancelled && (item.cancelReason || item.unavailabilityDescription) && (
              <View style={styles.reasonBox}>
                <MaterialIcons name="info" size={14} color={C.danger} />
                <Text style={styles.reasonText}>
                  {[item.unavailabilityDescription, item.cancelReason].filter(Boolean).join(' — ')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const emptyMeta = {
    Upcoming: { icon: 'event-available', title: 'No upcoming trips', sub: 'Book a driver from the home screen' },
    Completed: { icon: 'check-circle-outline', title: 'No completed trips', sub: 'Your ride history will show here' },
    Cancelled: { icon: 'cancel', title: 'No cancelled trips', sub: 'Cancelled bookings will show here' },
  }[activeTab];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.header}>My Trips</Text>
          <Text style={styles.headerSub}>Track bookings, drivers & ride history</Text>
        </View>
        <View style={styles.headerBadge}>
          <MaterialIcons name="route" size={22} color="#fff" />
        </View>
      </View>

      <View style={styles.tabContainer}>
        {TABS.map((tab, idx) => (
          <TouchableOpacity key={tab} style={styles.tabBtn} onPress={() => handleTabSwitch(idx)}>
            <Text style={activeTab === tab ? styles.activeTab : styles.inactiveTab}>
              {tab}
              {counts[tab] > 0 ? ` (${counts[tab]})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
        <Animated.View style={[styles.underline, { transform: [{ translateX: slideAnim }] }]} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : (
        <FlatList
          data={visibleTrips}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTrip}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.accent]} tintColor={C.accent} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <MaterialIcons name={emptyMeta.icon} size={34} color={C.primary} />
              </View>
              <Text style={styles.emptyTitle}>{emptyMeta.title}</Text>
              <Text style={styles.emptySub}>{emptyMeta.sub}</Text>
            </View>
          }
        />
      )}

      <BottomTab navigation={navigation} activeTab="Trips" />
    </View>
  );
};

/* ============================================================
   SUB COMPONENTS
============================================================ */

const InfoTile = ({ icon, label, value, accent }) => (
  <View style={styles.infoTile}>
    <View style={[styles.tileIcon, accent && styles.tileIconAccent]}>
      <MaterialIcons name={icon} size={16} color={accent ? C.accent : C.primary} />
    </View>
    <View style={styles.tileText}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, accent && styles.tileValueAccent]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  </View>
);

export default TripsScreen;

/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 16,
    paddingBottom: 80,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 4,
  },

  header: {
    color: C.text,
    fontSize: 26,
    fontWeight: 'bold',
  },

  headerSub: {
    color: C.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  headerBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...C.shadow,
    shadowOpacity: 0.25,
  },

  tabContainer: {
    flexDirection: 'row',
    marginBottom: 14,
    position: 'relative',
    backgroundColor: C.inputBg,
    borderRadius: 14,
    padding: 4,
  },

  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },

  activeTab: {
    color: C.text,
    fontWeight: 'bold',
    fontSize: 13,
  },

  inactiveTab: {
    color: C.textMuted,
    fontSize: 13,
  },

  underline: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: SEG_WIDTH,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.surface,
    ...C.shadow,
    shadowOpacity: 0.12,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  listContent: {
    paddingBottom: 20,
  },

  card: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
    ...C.shadow,
  },

  statusRail: {
    width: 4,
  },

  cardBody: {
    flex: 1,
    padding: 16,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  chipDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },

  chipText: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  bookingNo: {
    color: C.textMuted,
    fontSize: 11,
    letterSpacing: 0.4,
    fontVariant: ['tabular-nums'],
  },

  routeBlock: {
    flexDirection: 'row',
  },

  routeCol: {
    width: 18,
    alignItems: 'center',
    marginRight: 8,
  },

  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  connector: {
    width: 2,
    flex: 1,
    minHeight: 16,
    backgroundColor: C.borderDark,
  },

  routeTexts: {
    flex: 1,
    paddingBottom: 12,
  },

  routeText: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 14,
  },

  divider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 12,
  },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },

  infoTile: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginBottom: 10,
  },

  tileIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tileIconAccent: {
    backgroundColor: C.accentSoft,
  },

  tileText: {
    marginLeft: 8,
    flex: 1,
  },

  tileLabel: {
    color: C.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  tileValue: {
    color: C.text,
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 1,
  },

  tileValueAccent: {
    color: C.accent,
    fontSize: 15,
  },

  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceAlt,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 4,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },

  driverInfo: {
    flex: 1,
    marginLeft: 10,
  },

  driverName: {
    color: C.text,
    fontWeight: '700',
    fontSize: 14,
  },

  driverSub: {
    color: C.textMuted,
    fontSize: 12,
    marginTop: 1,
  },

  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.accentSoft,
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
  },

  searchingText: {
    marginLeft: 10,
    color: C.accentDark,
    fontWeight: '700',
    fontSize: 13,
  },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },

  bookedText: {
    color: C.textMuted,
    fontSize: 11,
    marginLeft: 5,
    flex: 1,
  },

  payBadge: {
    backgroundColor: C.inputBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  payBadgeText: {
    color: C.textSub,
    fontSize: 10,
    fontWeight: '700',
  },

  reasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3F3F5',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },

  reasonText: {
    color: C.textSub,
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },

  empty: {
    alignItems: 'center',
    marginTop: 60,
  },

  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  emptyTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: 'bold',
  },

  emptySub: {
    color: C.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
});