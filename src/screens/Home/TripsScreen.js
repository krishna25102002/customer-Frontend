import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import BottomTab from '../../components/BottomTab';
import { getBookings } from '../../api';
import { C } from '../../theme';

const { width } = Dimensions.get('window');

const TripsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('Upcoming');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const data = await getBookings(token);
          const mapped = (data.bookings || []).map((b) => ({
            id: b._id,
            pickup: b.pickup || 'Pickup',
            drop: b.drop || 'Drop',
            price: `₹${b.estimatedFare || 0}`,
            type: b.tripType || 'Local',
            status: b.status === 'Completed' ? 'completed' : 'upcoming',
            driver: {
              name: b.driverId?.name || b.driverId?.fullName || 'Driver',
            },
          }));
          setTrips(mapped);
        }
      } catch (err) {
        console.log('TRIPS ERR:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const upcoming = trips.filter(t => t.status === 'upcoming');
  const completed = trips.filter(t => t.status === 'completed');

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);

    Animated.timing(slideAnim, {
      toValue: tab === 'Upcoming' ? 0 : width / 2,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const renderTrip = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => navigation.navigate('TripDetails', { trip: item })}
    >
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <View style={styles.routeRow}>
              <MaterialDot color={C.success} label={item.pickup} />
              <MaterialDot color={C.danger} label={item.drop} />
            </View>
            <Text style={styles.sub}>Driver · {item.driver.name}</Text>

            <View style={[styles.badge, item.status === 'completed' ? styles.completed : styles.confirmed]}>
              <Text style={styles.badgeText}>
                {item.status === 'completed' ? '✓ Completed' : '● Confirmed'}
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.price}>{item.price}</Text>
            <Text style={styles.type}>{item.type}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>

      <Text style={styles.header}>My Trips</Text>

      {/* 🔥 TAB BAR */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={styles.tabBtn} onPress={() => handleTabSwitch('Upcoming')}>
          <Text style={activeTab === 'Upcoming' ? styles.activeTab : styles.inactiveTab}>
            Upcoming
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBtn} onPress={() => handleTabSwitch('Completed')}>
          <Text style={activeTab === 'Completed' ? styles.activeTab : styles.inactiveTab}>
            Completed
          </Text>
        </TouchableOpacity>

        {/* Animated underline */}
        <Animated.View
          style={[
            styles.underline,
            { transform: [{ translateX: slideAnim }] }
          ]}
        />
      </View>

      {/* LIST */}
      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={activeTab === 'Upcoming' ? upcoming : completed}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTrip}
          contentContainerStyle={{ paddingBottom: 90 }}
          ListEmptyComponent={<Text style={styles.empty}>No trips found</Text>}
        />
      )}

      <BottomTab navigation={navigation} activeTab="Trips" />

    </View>
  );
};

const MaterialDot = ({ color, label }) => (
  <View style={styles.routeRow}>
    <View style={[styles.dot, { backgroundColor: color }]} />
    <Text style={styles.location}>{label}</Text>
  </View>
);

export default TripsScreen;

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
    marginBottom: 10,
    marginTop: 4,
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
    color: C.accent,
    fontWeight: 'bold',
  },

  inactiveTab: {
    color: C.textSub,
  },

  underline: {
    position: 'absolute',
    bottom: 4,
    width: '50%',
    height: 34,
    borderRadius: 10,
    backgroundColor: C.surface,
    ...C.shadow,
    shadowOpacity: 0.12,
  },

  card: {
    backgroundColor: C.surface,
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },

  location: {
    color: C.text,
    fontSize: 14,
    flexShrink: 1,
  },

  sub: {
    color: C.textMuted,
    marginTop: 4,
    fontSize: 12,
  },

  price: {
    color: C.accent,
    fontSize: 18,
    fontWeight: 'bold',
  },

  type: {
    color: C.textMuted,
  },

  badge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 11,
    alignSelf: 'flex-start',
  },

  confirmed: {
    backgroundColor: C.successSoft,
  },

  confirmedText: {
    color: C.success,
  },

  completed: {
    backgroundColor: C.inputBg,
  },

  completedText: {
    color: C.textMuted,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: C.success,
  },

  empty: {
    color: C.textMuted,
    textAlign: 'center',
    marginTop: 30,
  },
});