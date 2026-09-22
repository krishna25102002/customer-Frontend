import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { forgotCustomerPassword } from '../../api';
import { useAlert } from '../../components/AlertProvider';
import { C } from '../../theme';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const alert = useAlert();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      alert.warning('Email required', 'Please enter your registered email address');
      return;
    }

    setLoading(true);
    try {
      const data = await forgotCustomerPassword({ email });
      alert.success('OTP sent', data.message || 'Check your inbox for the verification OTP');
      navigation.navigate('ResetPassword', { email: email.trim() });
    } catch (err) {
      console.log('FORGOT PASSWORD ERR:', err);
      alert.error('Failed to send OTP', err.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Icon name="arrow-back" size={22} color={C.primary} />
      </TouchableOpacity>

      <View style={styles.hero}>
        <Text style={styles.logo}>
          Caption<Text style={styles.logoAccent}>X</Text>
        </Text>
        <Text style={styles.heroTitle}>Forgot Password</Text>
        <Text style={styles.heroSub}>
          We'll email a one-time verification code to your registered address so
          you can set a new password.
        </Text>
      </View>

      <View style={styles.field}>
        <View style={styles.inputContainer}>
          <Icon name="email" size={20} color={C.primary} />
          <TextInput
            placeholder="Registered email address"
            placeholderTextColor={C.textMuted}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.sendText}>Send OTP</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    padding: 22,
    paddingTop: 56,
    paddingBottom: 40,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    backgroundColor: C.primary,
    borderRadius: 22,
    padding: 22,
    marginTop: 16,
    marginBottom: 22,
    ...C.shadow,
    shadowOpacity: 0.22,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 14,
  },
  logoAccent: {
    opacity: 0.85,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
    lineHeight: 20,
  },
  field: {
    marginBottom: 8,
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
  sendBtn: {
    backgroundColor: C.accent,
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 12,
    ...C.shadow,
    shadowOpacity: 0.28,
  },
  sendText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});