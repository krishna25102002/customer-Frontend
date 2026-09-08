import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import BottomTab from '../../components/BottomTab';
import {
  getNearbyDrivers,
  getAppConfig,
  getActionAvailableDrivers,
  createActionBooking,
} from '../../api';
import { C } from '../../theme';

const DURATIONS = [2, 4, 6, 8, 10, 12];
const START_TIMES = ['7:00 AM', '9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM', '6:00 PM', '9:00 PM'];

const parseTimeToMinutes = (t) => {
  const s = String(t || '').trim().toUpperCase();
  const isPM = s.includes('PM');
  const isAM = s.includes('AM');
  const nums = s.replace(/\s*(AM|PM)\s*/i, '').split(':').map(Number);
  let h = nums[0] || 0;
  const m = nums[1] || 0;
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
};

const minutesToTime = (min) => {
  let total = ((min % 1440) + 1440) % 1440;
  let h = Math.floor(total / 60);
  const m = total % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${period}`;
};

const fmtDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const CustomerDashboard = ({ navigation, route }) => {
  const [drivers, setDrivers] = useState([]);
  const [customerName, setCustomerName] = useState('Customer');
  const [loading, setLoading] = useState(true);

  const [perHourRate, setPerHourRate] = useState(210);
  const [date, setDate] = useState(fmtDate(new Date(new Date().getTime() + 86400000)));
  const [startTime, setStartTime] = useState('9:00 AM');
  const [duration, setDuration] = useState(6);
  const [pickup, setPickup] = useState('Koramangala 5th Block');
  const [drop, setDrop] = useState('');
  const [available, setAvailable] = useState([]);
  const [selected, setSelected] = useState({});
  const [selectedNames, setSelectedNames] = useState({});
  const [bookingMode, setBookingMode] = useState(false);
  const [availLoading, setAvailLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;

  const startMin = parseTimeToMinutes(startTime);
  const endMin = startMin + duration * 60;
  const endTime = minutesToTime(endMin);
  const hours = duration;
  const fare = hours * perHourRate;
  const selectedCount = Object.keys(selected).length;

  useEffect(() => {
    const pre = route?.params?.preselectDriver;
    if (!pre) return;
    const id = String(pre.id);
    setSelected((prev) => ({ ...prev, [id]: true }));
    setSelectedNames((prev) => ({ ...prev, [id]: pre.name || 'Driver' }));
    setBookingMode(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    Animated.timing(listAnim, {
      toValue: 1,
      duration: 800,
      delay: 200,
      useNativeDriver: true,
    }).start();

    const loadDrivers = async () => {
      try {
        const latitude = 12.9716;
        const longitude = 77.5946;
        const data = await getNearbyDrivers(latitude, longitude);
        setDrivers(
          (data.drivers || []).map((d) => ({
            id: d._id || d.id,
            name: d.fullName || d.name,
            rating: d.rating != null ? d.rating : '4.9',
            trips: d.totalTrips || d.trips || 0,
            distance: 'Nearby',
            status: 'Online',
          }))
        );
      } catch (err) {
        console.log('NEARBY DRIVERS ERR:', err);
      } finally {
        setLoading(false);
      }
    };

    const loadCustomer = async () => {
      try {
        const raw = await AsyncStorage.getItem('customer');
        if (raw) {
          const c = JSON.parse(raw);
          if (c.name) setCustomerName(c.name);
        }
      } catch (e) {
        console.log('CUSTOMER LOAD ERR:', e);
      }
    };

    const loadConfig = async () => {
      try {
        const data = await getAppConfig();
        if (data.config && data.config.actingDriverPerHourRate) {
          setPerHourRate(data.config.actingDriverPerHourRate);
        }
      } catch (e) {
        console.log('GET CONFIG ERR:', e);
      }
    };

    loadDrivers();
    loadCustomer();
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectToday = () => setDate(fmtDate(new Date()));
  const selectTomorrow = () => setDate(fmtDate(new Date(new Date().getTime() + 86400000)));

  const toggleDriver = (id, name) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        if (Object.keys(next).length >= 10) {
          Alert.alert('Error', 'A booking can be sent to a maximum of 10 drivers');
          return next;
        }
        next[id] = true;
      }
      return next;
    });
    setSelectedNames((prev) => {
      const next = { ...prev };
      if (prev[id]) {
        delete next[id];
      } else {
        next[id] = name;
      }
      return next;
    });
  };

  const loadAvailableDrivers = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        return;
      }
      setAvailLoading(true);
      const data = await getActionAvailableDrivers(
        { fromDate: date, toDate: date, startTime, endTime },
        token
      );
      const list = (data.drivers || []).map((d) => ({
        id: String(d.driverId),
        name: d.fullName,
        rating: d.rating,
        trips: d.totalTrips,
      }));
      setAvailable(list);
      setBookingMode(true);
      setAvailLoading(false);
    } catch (err) {
      setAvailLoading(false);
      console.log('AVAILABLE DRIVERS ERR:', err);
      Alert.alert('Error', err.message || 'Could not load drivers');
    }
  }, [date, startTime, endTime]);

  const handleSend = async () => {
    const ids = Object.keys(selected);
    if (ids.length === 0) {
      Alert.alert('Error', 'Please select at least one driver');
      return;
    }
    setSending(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        return;
      }
      const data = await createActionBooking(
        {
          fromDate: date,
          toDate: date,
          startTime,
          endTime,
          pickupAddress: pickup.trim(),
          dropAddress: drop.trim(),
          driverIds: ids,
        },
        token
      );
      Alert.alert(
        'Request Sent',
        `Booking ${data.booking?.bookingNumber || ''} sent to ${ids.length} driver${ids.length !== 1 ? 's' : ''}. Track it in the Requests tab.`
      );
      setSelected({});
      setSelectedNames({});
      setAvailable([]);
      setBookingMode(false);
      setDuration(6);
      setStartTime('9:00 AM');
      setDrop('');
    } catch (err) {
      console.log('CREATE ACTION BOOKING ERR:', err);
      Alert.alert('Error', err.message || 'Could not create booking');
    } finally {
      setSending(false);
    }
  };

  const renderDriver = ({ item, index }) => {
    const translateY = listAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [50, 0],
    });
    const opacity = listAnim;
    const isSel = !!selected[item.id];

    if (bookingMode) {
      return (
        <TouchableOpacity activeOpacity={0.8} onPress={() => toggleDriver(item.id, item.name)}>
          <View style={[styles.card, isSel && styles.cardSelected]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(item.name || 'D').substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.rating}>⭐ {item.rating} • {item.trips} trips</Text>
            </View>
            <View style={[styles.checkbox, isSel && styles.checkboxActive]}>
              {isSel && <MaterialIcons name="check" size={16} color="#fff" />}
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <Animated.View
        style={{
          transform: [{ translateY }],
          opacity,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('DriverProfile', { driver: item })}
        >
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(item.name || 'D').substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.rating}>⭐ {item.rating} • {item.trips} trips</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.online}>● Online</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const header = (
    <View>
      <Animated.View style={{ opacity: headerAnim }}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.greeting}>Good morning,</Text>
              <Text style={styles.nameHeader}>{customerName}</Text>
            </View>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>
                {(customerName || 'C').substring(0, 1).toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.location}>📍 Koramangala, Bengaluru</Text>
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={20} color={C.textMuted} />
            <TextInput
              placeholder="Where do you want to go?"
              placeholderTextColor={C.textMuted}
              style={styles.searchInput}
            />
          </View>
        </View>
      </Animated.View>

      {/* BOOKING WIDGET */}
      <View style={styles.widget}>
        <View style={styles.widgetHeader}>
          <View style={styles.widgetIcon}>
            <MaterialIcons name="schedule" size={18} color={C.primary} />
          </View>
          <Text style={styles.widgetTitle}>Book Acting Driver</Text>
        </View>

        <Text style={styles.label}>Date</Text>
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.chip, date === fmtDate(new Date()) && styles.chipActive]}
            onPress={selectToday}
          >
            <Text style={[styles.chipText, date === fmtDate(new Date()) && styles.chipTextActive]}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, date === fmtDate(new Date(new Date().getTime() + 86400000)) && styles.chipActive]}
            onPress={selectTomorrow}
          >
            <Text style={[styles.chipText, date === fmtDate(new Date(new Date().getTime() + 86400000)) && styles.chipTextActive]}>Tomorrow</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputBox}>
          <MaterialIcons name="event" size={20} color={C.primary} />
          <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={C.textMuted} />
        </View>

        <Text style={styles.label}>Start Time</Text>
        <View style={styles.chipWrap}>
          {START_TIMES.map((t) => (
            <TouchableOpacity key={t} style={[styles.chip, startTime === t && styles.chipActive]} onPress={() => setStartTime(t)}>
              <Text style={[styles.chipText, startTime === t && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Duration</Text>
        <View style={styles.chipWrap}>
          {DURATIONS.map((h) => (
            <TouchableOpacity key={h} style={[styles.chip, duration === h && styles.chipActive]} onPress={() => setDuration(h)}>
              <Text style={[styles.chipText, duration === h && styles.chipTextActive]}>{h}h</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.endTimeText}>Ends at {endTime}</Text>

        <Text style={styles.label}>Pickup</Text>
        <View style={styles.inputBox}>
          <MaterialIcons name="my-location" size={20} color={C.primary} />
          <TextInput style={styles.input} value={pickup} onChangeText={setPickup} placeholder="Pickup address" placeholderTextColor={C.textMuted} />
        </View>

        <Text style={styles.label}>Drop</Text>
        <View style={styles.inputBox}>
          <MaterialIcons name="place" size={20} color={C.primary} />
          <TextInput style={styles.input} value={drop} onChangeText={setDrop} placeholder="Drop address" placeholderTextColor={C.textMuted} />
        </View>

        <View style={styles.fareBox}>
          <View>
            <Text style={styles.fareRate}>{hours} hrs × ₹{perHourRate}/hr</Text>
            <Text style={styles.fareRateSmall}>Rate set by admin</Text>
          </View>
          <Text style={styles.fareAmount}>₹{fare.toLocaleString('en-IN')}</Text>
        </View>

        <TouchableOpacity style={styles.availBtn} onPress={loadAvailableDrivers} disabled={availLoading}>
          {availLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.availText}>
              {bookingMode ? 'Refresh Drivers' : 'Show Available Drivers'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>
        {bookingMode
          ? 'Select Drivers (max 10)'
          : loading ? 'Loading drivers…' : `${drivers.length} drivers nearby`}
      </Text>

      {bookingMode && selectedCount > 0 && (
        <View style={styles.chipWrap}>
          {Object.keys(selectedNames).map((id) => (
            <View key={id} style={[styles.chip, styles.selectedChip]}>
              <Text style={styles.chipTextActive}>{selectedNames[id]}</Text>
              <TouchableOpacity onPress={() => toggleDriver(id, selectedNames[id])}>
                <Text style={styles.removeText}> ✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const listData = bookingMode ? available : drivers;

  return (
    <View style={styles.container}>
      <FlatList
        data={listData}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderDriver}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListEmptyComponent={
          loading && !bookingMode ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                {availLoading
                  ? 'Loading available drivers…'
                  : bookingMode
                    ? `No drivers available for ${date} ${startTime} → ${endTime}. Try another slot.`
                    : 'No drivers online nearby'}
              </Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={bookingMode ? loadAvailableDrivers : async () => {
              setLoading(true);
              try {
                const latitude = 12.9716;
                const longitude = 77.5946;
                const data = await getNearbyDrivers(latitude, longitude);
                setDrivers(
                  (data.drivers || []).map((d) => ({
                    id: d._id || d.id,
                    name: d.fullName || d.name,
                    rating: d.rating != null ? d.rating : '4.9',
                    trips: d.totalTrips || d.trips || 0,
                    distance: 'Nearby',
                    status: 'Online',
                  }))
                );
              } catch (err) {
                console.log('REFRESH ERR:', err);
              } finally {
                setLoading(false);
              }
            }}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      />

      {bookingMode && selectedCount > 0 && (
        <View style={styles.sendBar}>
          <View>
            <Text style={styles.sendBarSelected}>{selectedCount} selected</Text>
            <Text style={styles.sendBarFare}>{hours}h • ₹{fare.toLocaleString('en-IN')}</Text>
          </View>
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending}>
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sendText}>Send Request</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <BottomTab navigation={navigation} activeTab="Home" />
    </View>
  );
};

export default CustomerDashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 16,
    paddingBottom: 80,
  },

  // HERO
  hero: {
    backgroundColor: C.primary,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    ...C.shadow,
    shadowOpacity: 0.25,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
  nameHeader: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  heroAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  location: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    color: C.text,
    padding: 12,
  },

  // WIDGET
  widget: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 16,
    ...C.shadow,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  widgetIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  widgetTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  label: {
    color: C.textSub,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  quickRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: C.inputBg,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: C.accent,
    ...C.shadow,
    shadowOpacity: 0.22,
  },
  chipText: {
    color: C.textSub,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  selectedChip: {
    backgroundColor: C.accent,
    borderWidth: 1,
    borderColor: C.accent,
  },
  removeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  endTimeText: {
    color: C.textSub,
    fontSize: 12,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.inputBg,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  input: {
    flex: 1,
    color: C.text,
    padding: 12,
  },
  fareBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.accentSoft,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.accentBorder,
  },
  fareRate: {
    color: C.primaryDark,
    fontWeight: '700',
  },
  fareRateSmall: {
    color: C.textSub,
    fontSize: 11,
    marginTop: 2,
  },
  fareAmount: {
    color: C.accent,
    fontSize: 22,
    fontWeight: 'bold',
  },
  availBtn: {
    backgroundColor: C.accent,
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
    ...C.shadow,
    shadowOpacity: 0.25,
  },
  availText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  title: {
    color: C.text,
    marginTop: 18,
    marginBottom: 12,
    fontSize: 17,
    fontWeight: 'bold',
  },

  // DRIVER CARDS
  card: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: C.accent,
    backgroundColor: C.primarySoft,
  },
  avatar: {
    backgroundColor: C.primarySoft,
    height: 52,
    width: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: C.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  name: {
    color: C.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  rating: {
    color: C.textSub,
    fontSize: 12,
    marginTop: 3,
  },
  online: {
    color: C.success,
    fontSize: 12,
    fontWeight: '600',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: C.accent,
  },

  emptyBox: {
    padding: 30,
  },
  emptyText: {
    color: C.textMuted,
    textAlign: 'center',
  },

  // SEND BAR
  sendBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 80,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1.5,
    borderColor: C.accent,
    ...C.shadow,
    zIndex: 50,
  },
  sendBarSelected: {
    color: C.text,
    fontWeight: 'bold',
  },
  sendBarFare: {
    color: C.accent,
    fontWeight: '700',
    fontSize: 12,
  },
  sendBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 30,
    ...C.shadow,
    shadowOpacity: 0.25,
  },
  sendText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});