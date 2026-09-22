import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerCustomer, loginCustomer } from '../../api';
import { useAlert } from '../../components/AlertProvider';
import { C } from '../../theme';

const RegisterScreen = () => {
  const navigation = useNavigation();
  const alert = useAlert();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !email || !phone || !password) {
      alert.warning('Incomplete details', 'Please fill Name, Email, Phone and Password');
      return;
    }

    setLoading(true);
    try {
      const payload = { name, phone, email, password };

      console.log('📤 Register payload:', payload);
      await registerCustomer(payload);

      // Auto-login since register returns no token
      const loginData = await loginCustomer({ phone, password });
      if (loginData.token) {
        await AsyncStorage.setItem('token', loginData.token);
        await AsyncStorage.setItem('customer', JSON.stringify(loginData.customer));
      }

      alert.success('Welcome!', 'Your account has been created.');
      navigation.reset({
        index: 0,
        routes: [{ name: 'customerHome' }],
      });
    } catch (err) {
      console.log('❌ Register ERROR:', err);
      alert.error('Could not register', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const inputStyles = (value) => [styles.input, value && styles.inputFilled];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back to login</Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Create Account</Text>
        <Text style={styles.heroSubtitle}>Fill in your details to get started</Text>
      </View>

      <TextInput
        placeholder="Full name"
        placeholderTextColor={C.textMuted}
        style={inputStyles(name)}
        value={name}
        onChangeText={setName}
      />

      <TextInput
        placeholder="+91 98765 43210"
        placeholderTextColor={C.textMuted}
        style={inputStyles(phone)}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      <TextInput
        placeholder="Email address"
        placeholderTextColor={C.textMuted}
        style={inputStyles(email)}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor={C.textMuted}
        style={inputStyles(password)}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <View style={styles.row}>
        <TextInput
          placeholder="City"
          placeholderTextColor={C.textMuted}
          style={[styles.input, styles.halfInput, city && styles.inputFilled]}
          value={city}
          onChangeText={setCity}
        />
        <TextInput
          placeholder="State"
          placeholderTextColor={C.textMuted}
          style={[styles.input, styles.halfInput, state && styles.inputFilled]}
          value={state}
          onChangeText={setState}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Submit & Continue</Text>
        )}
      </TouchableOpacity>

      <View style={styles.steps}>
        <View style={[styles.dot, styles.activeDot]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
    </ScrollView>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    padding: 22,
    paddingTop: 20,
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: C.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  backText: {
    color: C.accent,
    fontWeight: '600',
  },
  hero: {
    backgroundColor: C.primary,
    borderRadius: 22,
    paddingVertical: 26,
    paddingHorizontal: 20,
    marginBottom: 20,
    ...C.shadow,
    shadowOpacity: 0.22,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 4,
  },
  input: {
    backgroundColor: C.surface,
    color: C.text,
    borderRadius: 16,
    padding: 15,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  inputFilled: {
    borderColor: C.accent,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  button: {
    backgroundColor: C.accent,
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
    ...C.shadow,
    shadowOpacity: 0.28,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  steps: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  dot: {
    width: 10,
    height: 5,
    backgroundColor: C.borderDark,
    marginHorizontal: 4,
    borderRadius: 5,
  },
  activeDot: {
    backgroundColor: C.primary,
    width: 20,
  },
});