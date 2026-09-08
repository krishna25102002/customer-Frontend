import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SectionList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import BottomTab from '../../components/BottomTab';
import { getDriverRequests } from '../../api';
import { C } from '../../theme';

const mapRequest = (r) => ({
  id: r._id,
  driverId: r.driverId?._id || r.driverId,
  name: r.driverId?.fullName || 'Driver',
  rating: r.driverId?.rating || '5.0',
  trips: r.driverId?.totalTrips || 0,
  pickup: r.pickupAddress || 'Pickup location',
  drop: r.dropAddress || 'Drop location',
  status: r.requestStatus || 'Requested',
  fare: r.estimatedFare || 0,
  type: r.tripType || 'Local',
  requestedAt: r.requestedAt || r.createdAt,
});

const formatDateLabel = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const STATUS_META = {
  Accepted: { text: C.success, soft: C.successSoft },
  Rejected: { text: C.danger, soft: C.dangerSoft },
  Cancelled: { text: C.textMuted, soft: C.inputBg },
  Completed: { text: C.info, soft: C.infoSoft },
};

const RequestStatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || { text: C.warning, soft: C.accentSoft };
  return (
    <View style={[styles.badge, { backgroundColor: meta.soft }]}>
      <Text style={{ color: meta.text, fontWeight: 'bold', fontSize: 11 }}>{status}</Text>
    </View>
  );
};

const RequestedDriversScreen = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const data = await getDriverRequests(token);
        setRequests((data.requests || []).map(mapRequest));
      }
    } catch (err) {
      console.log('REQUESTS ERR:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 5000);
      return () => clearInterval(t);
    }, [load])
  );

  const sections = [];
  const seenDates = new Set();

  [...requests]
    .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))
    .forEach((r) => {
      const label = formatDateLabel(r.requestedAt);
      if (!seenDates.has(label)) {
        seenDates.add(label);
        sections.push({ title: label, data: [] });
      }
      sections[sections.length - 1].data.push(r);
    });

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() =>
        navigation.navigate('RequestedDriverDetail', { requestId: item.id })
      }
    >
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.name || 'D').substring(0, 2).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.sub}>⭐ {item.rating} • {item.trips} trips</Text>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: C.success }]} />
            <Text style={styles.loc}>{item.pickup}</Text>
          </View>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: C.danger }]} />
            <Text style={styles.loc}>{item.drop}</Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <RequestStatusBadge status={item.status} />
          <Text style={styles.fare}>₹{item.fare}</Text>
          <Text style={styles.type}>{item.type}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Requested Drivers</Text>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: 90 }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No requests sent yet. Tap "Send Booking Request" on a driver.
            </Text>
          }
        />
      )}

      <BottomTab navigation={navigation} activeTab="Requests" />
    </View>
  );
};

export default RequestedDriversScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 16,
    paddingBottom: 80,
  },

  header: {
    color: C.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 4,
  },

  sectionTitle: {
    color: C.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 6,
  },

  card: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    padding: 15,
    borderRadius: 18,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },

  avatar: {
    backgroundColor: C.primary,
    height: 50,
    width: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  name: {
    color: C.text,
    fontSize: 16,
    fontWeight: 'bold',
  },

  sub: {
    color: C.textSub,
    fontSize: 12,
    marginBottom: 4,
  },

  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },

  loc: {
    color: C.textSub,
    fontSize: 12,
    flexShrink: 1,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },

  fare: {
    color: C.accent,
    fontWeight: 'bold',
  },

  type: {
    color: C.textMuted,
    fontSize: 11,
  },

  empty: {
    color: C.textMuted,
    textAlign: 'center',
    marginTop: 30,
  },
});