import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { C } from '../../theme';

const { width } = Dimensions.get('window');

const TripDetails = ({ navigation, route }) => {
  const { trip } = route.params;

  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,

      onPanResponderMove: Animated.event(
        [null, { dx: pan.x }],
        { useNativeDriver: false }
      ),

      onPanResponderRelease: (e, gesture) => {
        if (gesture.dx > width * 0.6) {
          // ✅ Swipe completed → go to payment
          navigation.navigate('PaymentScreen', { trip });
        } else {
          // reset
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false
          }).start();
        }
      }
    })
  ).current;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Driver is on the way 🚗</Text>
        <Text style={styles.subtitle}>Arriving in ~8 mins</Text>
      </View>

      {/* MAP */}
      <View style={styles.map}>
        <MaterialIcons name="map" size={40} color={C.borderDark} />
        <Text style={{ color: C.textMuted }}>Map View</Text>
      </View>

      {/* DRIVER */}
      <View style={styles.driverCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(trip.driver.name || 'D').substring(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.name}>{trip.driver.name}</Text>
          <Text style={styles.car}>Swift Dzire · White</Text>
        </View>
        <MaterialIcons name="call" size={24} color={C.primary} />
      </View>

      {/* 🔥 SWIPE BUTTON */}
      {trip.status !== 'completed' && (
        <View style={styles.swipeContainer}>
          <Text style={styles.swipeText}>Swipe to Complete & Pay</Text>

          <Animated.View
            style={[styles.swipeButton, { transform: [{ translateX: pan.x }] }]}
            {...panResponder.panHandlers}
          >
            <Text style={{ color: '#fff' }}>➡️</Text>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

export default TripDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 20,
    justifyContent: 'space-between',
  },

  headerRow: {
    marginTop: 6,
  },

  title: {
    color: C.text,
    fontSize: 22,
    fontWeight: 'bold',
  },

  subtitle: {
    color: C.textSub,
  },

  map: {
    height: 200,
    backgroundColor: C.surface,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },

  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
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

  car: {
    color: C.textSub,
  },

  swipeContainer: {
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
});