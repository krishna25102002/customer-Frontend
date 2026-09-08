import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getDriverRequestById, cancelDriverRequest } from '../../api';
import { C } from '../../theme';

const STATUS_META = {
  Accepted: { text: C.success, soft: C.successSoft },
  Rejected: { text: C.danger, soft: C.dangerSoft },
  Cancelled: { text: C.textMuted, soft: C.inputBg },
  Completed: { text: C.info, soft: C.infoSoft },
};

const RequestedDriverDetail = ({ route, navigation }) => {
  const { requestId } = route.params;
  const [req, setReq] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const data = await getDriverRequestById(requestId, token);
        setReq(data.request);
      }
    } catch (err) {
      console.log('REQ DETAIL ERR:', err);
      Alert.alert('Error', 'Could not load request');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const handleCancel = async () => {
    Alert.alert('Cancel Request', 'Cancel this request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            await cancelDriverRequest(requestId, token);
            Alert.alert('Cancelled', 'Request cancelled');
            load();
          } catch (err) {
            Alert.alert('Error', err.message || 'Could not cancel');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  if (!req) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Text style={{ color: C.textMuted, textAlign: 'center' }}>Request not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = req.requestStatus || 'Requested';
  const driver = req.driverId || {};
  const meta = STATUS_META[status] || { text: C.warning, soft: C.accentSoft };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Request Details</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(driver.fullName || 'D').substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.name}>{driver.fullName || 'Driver'}</Text>
            <Text style={styles.sub}>⭐ {driver.rating || '5.0'} • {driver.totalTrips || 0} trips</Text>
            <Text style={styles.phone}>{driver.mobileNumber || ''}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: meta.soft }]}>
            <Text style={{ color: meta.text, fontWeight: 'bold' }}>{status}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: C.success }]} />
          <Text style={styles.loc}>{req.pickupAddress || 'Pickup'}</Text>
        </View>
        <View style={[styles.routeRow, styles.routeRowLast]}>
          <View style={[styles.dot, { backgroundColor: C.danger }]} />
          <Text style={styles.loc}>{req.dropAddress || 'Drop'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.rowBetween}>
          <Text style={styles.label}>Trip type</Text>
          <Text style={styles.value}>{req.tripType || 'Local'}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Estimated fare</Text>
          <Text style={[styles.value, { color: C.accent, fontWeight: 'bold' }]}>₹{req.estimatedFare || 0}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Requested on</Text>
          <Text style={styles.value}>
            {new Date(req.requestedAt || req.createdAt).toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      {status === 'Requested' && (
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelText}>Cancel Request</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Back to Requests</Text>
      </TouchableOpacity>
    </View>
  );
};

export default RequestedDriverDetail;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 20,
  },

  header: {
    color: C.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 4,
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
    alignItems: 'center',
  },

  avatar: {
    backgroundColor: C.primary,
    height: 50,
    width: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  name: {
    color: C.text,
    fontSize: 17,
    fontWeight: 'bold',
  },

  sub: {
    color: C.textSub,
    fontSize: 12,
  },

  phone: {
    color: C.info,
    fontSize: 12,
    fontWeight: '600',
  },

  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
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

  loc: {
    color: C.text,
    flexShrink: 1,
  },

  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 10,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  label: {
    color: C.textMuted,
  },

  value: {
    color: C.text,
    fontWeight: '600',
  },

  cancelBtn: {
    backgroundColor: C.danger,
    padding: 15,
    borderRadius: 26,
    alignItems: 'center',
    marginBottom: 10,
    ...C.shadow,
    shadowOpacity: 0.2,
  },

  cancelText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  backBtn: {
    backgroundColor: C.accent,
    padding: 15,
    borderRadius: 26,
    alignItems: 'center',
    ...C.shadow,
    shadowOpacity: 0.25,
  },

  backText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});