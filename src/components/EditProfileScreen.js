import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { updateCustomerProfile } from '../api';
import { useAlert } from './AlertProvider';
import { C } from '../theme';

const EditProfileScreen = ({ navigation }) => {
  const { customer, updateCustomer, refreshProfile } = useAuth();
  const alert = useAlert();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [image, setImage] = useState(customer?.profileImage || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setEmail(customer.email || '');
      setPhone(customer.phone || '');
      setImage(customer.profileImage || null);
    }
  }, [customer]);

  //////////////////////////////////////////////////////////
  // 📸 Pick Image (Dummy for now)
  //////////////////////////////////////////////////////////
  const handlePickImage = () => {
    alert.info('Upload Photo', 'Image picker integration needed');
  };

  //////////////////////////////////////////////////////////
  // 💾 Save Profile
  //////////////////////////////////////////////////////////
  const handleSave = async () => {
    if (!name || !phone) {
      alert.warning('Incomplete details', 'Please fill all fields');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        alert.info('Please login first', 'Your session has expired. Please log in again.');
        return;
      }

      const data = await updateCustomerProfile({ name, email, profileImage: image }, token);
      if (data.customer) {
        await updateCustomer(data.customer);
        await refreshProfile();
        alert.success('Profile updated!', 'Changes saved successfully.');
        if (navigation) navigation.goBack();
      } else {
        alert.error('Could not update', data.message || 'Could not update profile');
      }
    } catch (err) {
      console.log('UPDATE PROFILE ERR:', err);
      alert.error('Could not update', err.message || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  const inputBoxStyles = (focused) => [
    styles.inputBox,
    focused && styles.inputBoxFocused,
  ];
  const [focusField, setFocusField] = useState(null);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Arrow */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation && navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={26} color={C.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
      </View>

      {/* Profile Image */}
      <View style={styles.imageSection}>
        <TouchableOpacity onPress={handlePickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialIcons name="person" size={40} color="#fff" />
            </View>
          )}

          <View style={styles.cameraIcon}>
            <MaterialIcons name="camera-alt" size={18} color="#fff" />
          </View>
        </TouchableOpacity>

        <Text style={styles.changePhoto}>Change Photo</Text>
      </View>

      {/* Form */}
      <View style={styles.form}>

        {/* Name */}
        <Text style={styles.label}>Full Name</Text>
        <View style={inputBoxStyles(focusField === 'name')}>
          <MaterialIcons name="person" size={20} color={C.primary} />
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            onFocus={() => setFocusField('name')}
            onBlur={() => setFocusField(null)}
            placeholder="Enter name"
            placeholderTextColor={C.textMuted}
          />
        </View>

        {/* Email */}
        <Text style={styles.label}>Email Address</Text>
        <View style={inputBoxStyles(focusField === 'email')}>
          <MaterialIcons name="email" size={20} color={C.primary} />
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocusField('email')}
            onBlur={() => setFocusField(null)}
            keyboardType="email-address"
            placeholder="Enter email"
            placeholderTextColor={C.textMuted}
          />
        </View>

        {/* Phone (read-only - login identifier) */}
        <Text style={styles.label}>Mobile Number</Text>
        <View style={[styles.inputBox, styles.inputBoxDisabled]}>
          <MaterialIcons name="phone" size={20} color={C.primary} />
          <TextInput
            style={styles.input}
            value={phone}
            editable={false}
            keyboardType="number-pad"
            maxLength={10}
            placeholder="Enter phone"
            placeholderTextColor={C.textMuted}
          />
          <MaterialIcons name="lock-outline" size={16} color={C.textMuted} />
        </View>

      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>Save Changes</Text>
        )}
      </TouchableOpacity>

    </SafeAreaView>
  );
};

//////////////////////////////////////////////////////////
// 🎨 Styles
//////////////////////////////////////////////////////////

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 20,
  },

  //////////////////////////////////
  // Header
  //////////////////////////////////

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
  // Image Section
  //////////////////////////////////

  imageSection: {
    alignItems: 'center',
    marginBottom: 25,
  },

  image: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },

  imagePlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...C.shadow,
    shadowOpacity: 0.25,
  },

  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: C.primaryDark,
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },

  changePhoto: {
    color: C.accent,
    marginTop: 8,
    fontWeight: '600',
  },

  //////////////////////////////////
  // Form
  //////////////////////////////////

  form: {
    marginTop: 10,
  },

  label: {
    color: C.textSub,
    marginBottom: 6,
    marginTop: 14,
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
  },

  inputBoxFocused: {
    borderColor: C.accent,
    borderWidth: 1.5,
  },

  inputBoxDisabled: {
    opacity: 0.75,
  },

  input: {
    flex: 1,
    color: C.text,
    padding: 13,
  },

  //////////////////////////////////
  // Button
  //////////////////////////////////

  saveBtn: {
    backgroundColor: C.accent,
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 28,
    ...C.shadow,
    shadowOpacity: 0.28,
  },

  saveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default EditProfileScreen;