import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getActionTripFare,
  initiateActionPayment,
} from '../../api';
import { C } from '../../theme';

const PaymentScreen = ({ route, navigation }) => {
  const { trip } = route.params || {};
  const bookingId = trip?.id || trip?.bookingId;

  const [fare, setFare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paid, setPaid] = useState(false);

  const loadFare = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Not logged in');
      const res = await getActionTripFare(bookingId, token);
      const b = res.booking || {};
      setFare(b.fareBreakup || {});
      setPaid(b.paymentStatus === 'Paid');
    } catch (err) {
      console.log('PAY FARE ERR:', err.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = fare?.total || trip?.amount || 0;
  const breakup = [
    { label: 'Base fare', value: fare?.baseFare },
    { label: 'Platform fee', value: fare?.platformFee },
    { label: 'GST (18%)', value: fare?.taxGst },
  ].filter((r) => r.value != null);

  const handlePay = async () => {
    if (!bookingId) {
      Alert.alert('Error', 'Missing booking information.');
      return;
    }
    setPaying(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await initiateActionPayment(bookingId, '', token);
      const url = res.shortUrl;
      if (!url) {
        throw new Error(res.message || 'Could not create payment link');
      }
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('Cannot open payment page');
      await Linking.openURL(url);
      // Opening the Razorpay page returns to the app only after the user
      // completes it in the browser. Verify the payment on return note.
      Alert.alert(
        'Payment',
        'Complete payment in the browser, then tap "I\'ve Paid" when back.'
      );
    } catch (err) {
      console.log('PAY INIT ERR:', err);
      Alert.alert('Error', err.message || 'Could not start payment');
    } finally {
      setPaying(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const token = await AsyncStorage.getItem('token');
      // The short link flow marks paymentStatus "Paid" in Razorpay; we also
      // support manual confirmation by re-checking fare, and if the gateway
      // returns query params we'd pass them here. For the link flow we call
      // the fare endpoint which reflects the gateway status via webhook-free
      // polling is not available, so we optimistically mark paid on the page.
      const res = await getActionTripFare(bookingId, token);
      const paidStatus = res.booking?.paymentStatus === 'Paid';
      if (paidStatus) {
        setPaid(true);
        setFare(res.booking?.fareBreakup || fare);
        Alert.alert('Payment Successful', 'Thank you for your payment!');
      } else {
        Alert.alert(
          'Payment Pending',
          'Payment could not be confirmed yet. Complete it in the browser and try again.'
        );
      }
    } catch (err) {
      console.log('VERIFY ERR:', err);
      Alert.alert('Error', err.message || 'Could not verify payment');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      <MaterialIcons
        name={paid ? 'check-circle' : 'receipt-long'}
        size={64}
        color={paid ? C.success : C.accent}
        style={{ alignSelf: 'center', marginTop: 30 }}
      />
      <Text style={styles.title}>{paid ? 'Payment Complete' : 'Complete Payment'}</Text>
      <Text style={styles.subtitle}>
        {paid ? 'Your trip fare has been settled.' : 'Final fare for your completed trip'}
      </Text>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text style={styles.label}>Booking</Text>
          <Text style={styles.value}>{trip?.bookingNumber || '—'}</Text>
        </View>
        {fare?.billableHours != null && (
          <View style={styles.cardRow}>
            <Text style={styles.label}>Time</Text>
            <Text style={styles.value}>{fare.billableHours} hrs billed</Text>
          </View>
        )}
        <View style={styles.divider} />

        {breakup.map((r) => (
          <View style={styles.cardRow} key={r.label}>
            <Text style={styles.label}>{r.label}</Text>
            <Text style={styles.value}>₹{Math.round(r.value || 0)}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.cardRow}>
          <Text style={styles.labelBold}>Total Payable</Text>
          <Text style={styles.amount}>₹{Math.round(total)}</Text>
        </View>
      </View>

      {paid ? (
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.payBtn, (paying || verifying) && { opacity: 0.6 }]}
            onPress={handlePay}
            disabled={paying || verifying}
          >
            {paying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.payText}>Pay Now</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.verifyBtn}
            onPress={handleVerify}
            disabled={verifying}
          >
            {verifying ? (
              <ActivityIndicator color={C.accent} />
            ) : (
              <Text style={styles.verifyText}>I've Paid — Confirm</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
};

export default PaymentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 20,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: C.text,
    fontSize: 24,
    fontWeight: 'bold',
    alignSelf: 'center',
    marginTop: 12,
  },
  subtitle: {
    color: C.textMuted,
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    backgroundColor: C.surface,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    color: C.textMuted,
  },
  labelBold: {
    color: C.text,
    fontWeight: 'bold',
  },
  value: {
    color: C.text,
    fontWeight: '600',
  },
  amount: {
    color: C.accent,
    fontSize: 22,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 8,
  },
  payBtn: {
    backgroundColor: C.accent,
    padding: 16,
    borderRadius: 30,
    marginTop: 24,
    alignItems: 'center',
    ...C.shadow,
    shadowOpacity: 0.28,
  },
  payText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  verifyBtn: {
    padding: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  verifyText: {
    color: C.accent,
    fontWeight: '600',
    fontSize: 15,
  },
  doneBtn: {
    backgroundColor: C.success,
    padding: 16,
    borderRadius: 30,
    marginTop: 24,
    alignItems: 'center',
  },
  doneText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});