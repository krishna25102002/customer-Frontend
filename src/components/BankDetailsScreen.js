import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useAlert } from './AlertProvider';
import { C } from '../theme';

const STORAGE_KEY = 'customerBankDetails';

const BankDetailsScreen = ({ navigation }) => {
  const { customer } = useAuth();
  const alert = useAlert();

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const b = JSON.parse(saved);
          setAccountHolder(b.accountHolder || '');
          setBankName(b.bankName || '');
          setAccountNumber(b.accountNumber || '');
          setIfsc(b.ifsc || '');
        } else {
          // Default account holder is the logged-in user.
          setAccountHolder(customer?.name || '');
        }
      } catch (e) {
        console.log('LOAD BANK ERR:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [customer]);

  const handleSave = async () => {
    if (!accountHolder || !bankName || !accountNumber || !ifsc) {
      alert.warning('Incomplete details', 'Please fill all bank details');
      return;
    }
    setSaving(true);
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ accountHolder, bankName, accountNumber, ifsc })
      );
      setEditing(false);
      alert.success('Saved!', 'Your bank details have been saved.');
    } catch (e) {
      console.log('SAVE BANK ERR:', e);
      alert.error('Could not save', 'We could not save your bank details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  //////////////////////////////////////////////////////////
  // 🔐 Mask Account Number
  //////////////////////////////////////////////////////////
  const maskAccount = (acc) => {
    if (!acc) return '—';
    if (acc.length <= 4) return '••••' + acc;
    return 'XXXXXX' + acc.slice(-4);
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Header with Back Arrow */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation && navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={26} color={C.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Bank Details</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : editing ? (
        <View style={styles.form}>
          <Text style={styles.label}>Account Holder</Text>
          <View style={styles.inputBox}>
            <MaterialIcons name="person" size={20} color={C.primary} />
            <TextInput
              style={styles.input}
              value={accountHolder}
              onChangeText={setAccountHolder}
              placeholder="Account holder name"
              placeholderTextColor={C.textMuted}
            />
          </View>

          <Text style={styles.label}>Bank Name</Text>
          <View style={styles.inputBox}>
            <MaterialIcons name="account-balance" size={20} color={C.primary} />
            <TextInput
              style={styles.input}
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g. HDFC Bank"
              placeholderTextColor={C.textMuted}
            />
          </View>

          <Text style={styles.label}>Account Number</Text>
          <View style={styles.inputBox}>
            <MaterialIcons name="credit-card" size={20} color={C.primary} />
            <TextInput
              style={styles.input}
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="number-pad"
              placeholder="Account number"
              placeholderTextColor={C.textMuted}
            />
          </View>

          <Text style={styles.label}>IFSC Code</Text>
          <View style={styles.inputBox}>
            <MaterialIcons name="vpn-key" size={20} color={C.primary} />
            <TextInput
              style={styles.input}
              value={ifsc}
              onChangeText={setIfsc}
              placeholder="e.g. HDFC0001234"
              placeholderTextColor={C.textMuted}
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>Save Bank Details</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {/* Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="account-balance" size={20} color={C.primary} />
              <Text style={styles.cardHeaderText}>Payout Account</Text>
            </View>
            <Row icon="person" label="Account Holder" value={accountHolder || '—'} />
            <Row icon="account-balance" label="Bank Name" value={bankName || 'Not added'} />
            <Row icon="credit-card" label="Account Number" value={maskAccount(accountNumber)} />
            <Row icon="vpn-key" label="IFSC Code" value={ifsc || 'Not added'} last />
          </View>

          {/* Buttons */}
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
            <Text style={styles.editText}>
              {accountNumber ? 'Edit Details' : 'Add Bank Details'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

    </SafeAreaView>
  );
};

//////////////////////////////////////////////////////////
// 🔹 Row Component
//////////////////////////////////////////////////////////

const Row = ({ icon, label, value, last }) => (
  <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
    <View style={styles.rowIcon}>
      <MaterialIcons name={icon} size={18} color={C.primary} />
    </View>
    <View style={{ marginLeft: 12, flex: 1 }}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  </View>
);

//////////////////////////////////////////////////////////
// 🎨 Styles
//////////////////////////////////////////////////////////

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 20,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  backBtn: {
    marginRight: 12,
    padding: 4,
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
  },

  title: {
    color: C.text,
    fontSize: 22,
    fontWeight: 'bold',
  },

  //////////////////////////////////
  // Card
  //////////////////////////////////

  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: 4,
  },

  cardHeaderText: {
    color: C.text,
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 8,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },

  rowLabel: {
    color: C.textMuted,
    fontSize: 12,
  },

  value: {
    color: C.text,
    fontSize: 15,
    marginTop: 2,
    fontWeight: '600',
  },

  //////////////////////////////////
  // Form
  //////////////////////////////////

  form: {
    marginTop: 5,
  },

  label: {
    color: C.textSub,
    marginBottom: 6,
    marginTop: 12,
    fontWeight: '600',
  },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
  },

  input: {
    flex: 1,
    color: C.text,
    padding: 13,
  },

  //////////////////////////////////
  // Buttons
  //////////////////////////////////

  editBtn: {
    backgroundColor: C.accent,
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 10,
    ...C.shadow,
    shadowOpacity: 0.25,
  },

  editText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },

  saveBtn: {
    backgroundColor: C.accent,
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 15,
    ...C.shadow,
    shadowOpacity: 0.25,
  },

  saveText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default BankDetailsScreen;