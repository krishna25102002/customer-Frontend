import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginCustomer } from '../../api';
import { C } from '../../theme';

const Login = () => {
  const navigation = useNavigation();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Error', 'Please enter phone number and password');
      return;
    }

    setLoading(true);
    try {
      const data = await loginCustomer({ phone, password });

      if (data.token) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('customer', JSON.stringify(data.customer));
        navigation.reset({
          index: 0,
          routes: [{ name: 'customerHome' }],
        });
      } else {
        Alert.alert('Error', data.message || 'Login failed');
      }
    } catch (err) {
      console.log('LOGIN ERR:', err);
      Alert.alert('Error', err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* HERO BAND */}
      <View style={styles.hero}>
        <Text style={styles.logo}>
          Caption<Text style={styles.logoAccent}>X</Text>
        </Text>
        <Text style={styles.partner}>Customer</Text>
      </View>

      {/* TITLE */}
      <Text style={styles.welcome}>Welcome</Text>
      <Text style={styles.title}>Good to see you! 👋</Text>
      <Text style={styles.subtitle}>Sign in to manage your trips</Text>

      {/* PHONE INPUT */}
      <View style={styles.inputContainer}>
        <Icon name="phone" size={20} color={C.primary} />
        <TextInput
          placeholder="+91 98765 43210"
          placeholderTextColor={C.textMuted}
          style={styles.input}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
      </View>

      {/* PASSWORD */}
      <View style={styles.inputContainer}>
        <Icon name="lock" size={20} color={C.primary} />
        <TextInput
          placeholder="Password"
          placeholderTextColor={C.textMuted}
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />
      </View>

      {/* FORGOT */}
      <TouchableOpacity onPress={() => Alert.alert('Info', 'Contact support to reset your password')}>
        <Text style={styles.forgot}>Forgot Password?</Text>
      </TouchableOpacity>

      {/* LOGIN */}
      <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.loginText}>Login</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.newDriver}>New here?</Text>
      <TouchableOpacity style={styles.registerBtn} onPress={() => navigation.navigate('Register')}>
        <Text style={styles.registerText}>Create Account</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 22,
    justifyContent: 'center',
  },
  hero: {
    backgroundColor: C.primary,
    borderRadius: 22,
    paddingVertical: 30,
    alignItems: 'center',
    marginBottom: 24,
    ...C.shadow,
    shadowOpacity: 0.22,
  },
  logo: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoAccent: {
    color: '#fff',
    opacity: 0.85,
  },
  partner: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  welcome: {
    color: C.primary,
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: C.text,
    marginTop: 4,
  },
  subtitle: {
    color: C.textSub,
    marginTop: 6,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginVertical: 9,
    borderWidth: 1,
    borderColor: C.border,
  },
  input: {
    flex: 1,
    color: C.text,
    marginLeft: 10,
    padding: 14,
  },
  forgot: {
    color: C.accent,
    textAlign: 'right',
    marginVertical: 10,
    fontWeight: '600',
  },
  loginBtn: {
    backgroundColor: C.accent,
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 12,
    ...C.shadow,
    shadowOpacity: 0.28,
  },
  loginText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  newDriver: {
    textAlign: 'center',
    color: C.textMuted,
    marginVertical: 16,
  },
  registerBtn: {
    borderColor: C.accent,
    borderWidth: 1.5,
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    backgroundColor: C.surface,
  },
  registerText: {
    color: C.accent,
    fontWeight: 'bold',
    fontSize: 15,
  },
});