import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { C } from '../../theme';

const PaymentScreen = ({ route }) => {
  const { trip } = route.params;

  const totalAmount = 1800; // 🔥 you can calculate dynamically

  return (
    <View style={styles.container}>
      <MaterialIcons name="check-circle" size={64} color={C.success} style={{ alignSelf: 'center', marginTop: 30 }} />

      <Text style={styles.title}>Complete Payment</Text>
      <Text style={styles.subtitle}>Your trip is complete</Text>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text style={styles.label}>Driver</Text>
          <Text style={styles.value}>{trip.driver.name}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.cardRow}>
          <Text style={styles.label}>Route</Text>
          <Text style={styles.value}>{trip.pickup} → {trip.drop}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.cardRow}>
          <Text style={styles.label}>Total Payable</Text>
          <Text style={styles.amount}>₹{totalAmount}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.payBtn}
        onPress={() => alert('Payment Successful 🎉')}
      >
        <Text style={styles.payText}>Pay Now</Text>
      </TouchableOpacity>
    </View>
  );
};

export default PaymentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 20,
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
    marginVertical: 6,
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
});