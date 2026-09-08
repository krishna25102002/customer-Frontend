import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { C } from '../../theme';

const RequestSentScreen = ({ route, navigation }) => {
  const { driver } = route.params || {};

  const goHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'customerHome' }],
    });
  };

  const goRequests = () => {
    navigation.reset({
      index: 0,
      routes: [
        { name: 'customerHome' },
        { name: 'RequestedDriversScreen' },
      ],
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.checkCircle}>
          <MaterialIcons name="check" size={48} color="#fff" />
        </View>

        <Text style={styles.title}>Request Sent!</Text>
        <Text style={styles.subtitle}>
          Your booking request has been sent to {driver?.name || 'the driver'}.
          They will review and respond shortly.
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={goRequests}>
        <Text style={styles.buttonText}>View Requested Drivers</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondary} onPress={goHome}>
        <Text style={styles.secondaryText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
};

export default RequestSentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  hero: {
    backgroundColor: C.primary,
    borderRadius: 28,
    alignItems: 'center',
    padding: 30,
    marginBottom: 30,
    width: '100%',
    ...C.shadow,
    shadowOpacity: 0.28,
  },

  checkCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },

  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },

  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 10,
  },

  button: {
    backgroundColor: C.accent,
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
    ...C.shadow,
    shadowOpacity: 0.25,
  },

  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },

  secondary: {
    padding: 15,
  },

  secondaryText: {
    color: C.accent,
    fontWeight: 'bold',
  },
});