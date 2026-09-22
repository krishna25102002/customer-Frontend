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
import { useNavigation, useRoute } from '@react-navigation/native';
import { resetCustomerPassword } from '../../api';
import { useAlert } from '../../components/AlertProvider';
import { C } from '../../theme';

const ResetPasswordScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const alert = useAlert();
  const email = route.params?.email || '';
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!otp.trim()) {
      alert.warning('OTP required', 'Please enter the code from your email');
      return;
    }
    if (!newPassword) {
      alert.warning('Password required', 'Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      alert.warning('Weak password', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert.warning('Passwords do not match', 'Please re-enter your new password');
      return;
    }

    setLoading(true);
    try {
      const data = await resetCustomerPassword({ email, otp, newPassword });
      alert.success('Password reset', data.message || 'You can now log in with your new password');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (err) {
      console.log('RESET PASSWORD ERR:', err);
      alert.error('Reset failed', err.message || 'Please check your OTP and try again.');
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
        <Text style={styles.heroTitle}>Set New Password</Text>
        <Text style={styles.heroSub}>
          Enter the OTP sent to {email || 'your email'}, then choose your new password.
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <Icon name="security" size={20} color={C.primary} />
        <TextInput
          placeholder="OTP from email"
          placeholderTextColor={C.textMuted}
          style={styles.input}
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={setOtp}
        />
      </View>

      <View style={styles.inputContainer}>
        <Icon name="lock" size={20} color={C.primary} />
        <TextInput
          placeholder="New password (min 6 chars)"
          placeholderTextColor={C.textMuted}
          secureTextEntry
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
        />
      </View>

      <View style={styles.inputContainer}>
        <Icon name="lock" size={20} color={C.primary} />
        <TextInput
          placeholder="Confirm new password"
          placeholderTextColor={C.textMuted}
          secureTextEntry
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
      </View>

      <TouchableOpacity style={styles.resetBtn} onPress={handleReset} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.resetText}>Reset Password</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

export default ResetPasswordScreen;

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
  resetBtn: {
    backgroundColor: C.accent,
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 12,
    ...C.shadow,
    shadowOpacity: 0.28,
  },
  resetText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});