import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import BottomTab from '../../components/BottomTab';
import { useAuth } from '../../context/AuthContext';
import { C, shadow } from '../../theme';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const { customer, refreshProfile } = useAuth();

  const [notifications, setNotifications] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Load persisted notification preference.
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('notifications');
        if (saved !== null) setNotifications(saved === 'true');
      } catch (e) {
        console.log('LOAD NOTIF ERR:', e);
      }
    })();
    refreshProfile();
  }, [refreshProfile]);

  const toggleNotifications = (val) => {
    setNotifications(val);
    AsyncStorage.setItem('notifications', String(val)).catch(() => {});
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.log("Logout Error:", error);
            }
          }
        }
      ]
    );
  };

  const userName = customer?.name || 'User';
  const userPhone = customer?.phone || '';
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || 'U';
  const email = customer?.email || '';

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.pageTitle}>Settings</Text>

      {/* 👤 Profile Section */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ marginLeft: 15, flex: 1 }}>
          <Text style={styles.name}>{userName}</Text>
          <Text style={styles.phone}>{userPhone}</Text>
          {email ? <Text style={styles.email}>{email}</Text> : null}
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
          <MaterialIcons name="edit" size={20} color={C.primary} />
        </TouchableOpacity>
      </View>

      {/* ⚡ Availability */}
      <Text style={styles.sectionTitle}>AVAILABILITY</Text>

      <SettingToggle
        icon="location-on"
        label="Online Status"
        value={isOnline}
        onValueChange={setIsOnline}
      />

      <SettingToggle
        icon="notifications"
        label="Trip Notifications"
        value={notifications}
        onValueChange={toggleNotifications}
      />

      {/* 👤 Account */}
      <Text style={styles.sectionTitle}>ACCOUNT</Text>

      <SettingItem icon="person" label="Edit Profile" onPress={() => navigation.navigate('EditProfile')} />
      <SettingItem icon="directions-car" label="My Vehicle" onPress={() => navigation.navigate('MyVehicle')} />
      <SettingItem icon="account-balance" label="Bank Account" onPress={() => navigation.navigate("BankDetails")} />

      {/* ⚙️ Other */}
      <Text style={styles.sectionTitle}>OTHERS</Text>

      <SettingItem icon="help-outline" label="Help & Support" onPress={() => navigation.navigate("HelpSupport")} />
      <SettingItem
        icon="logout"
        label="Logout"
        danger
        onPress={handleLogout}
      />
      <BottomTab active="Settings" />
    </SafeAreaView>
  );
};

//////////////////////////////////////////////////////////
// 🔹 Toggle Item
//////////////////////////////////////////////////////////

const SettingToggle = ({ icon, label, value, onValueChange }) => (
  <View style={styles.itemRow}>
    <View style={styles.left}>
      <View style={styles.iconBox}>
        <MaterialIcons name={icon} size={20} color={C.primary} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>

    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: C.borderDark, true: C.accent }}
      thumbColor="#fff"
    />
  </View>
);

//////////////////////////////////////////////////////////
// 🔹 Click Item
//////////////////////////////////////////////////////////

const SettingItem = ({ icon, label, danger, onPress }) => (
  <TouchableOpacity style={styles.itemRow} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.left}>
      <View style={[styles.iconBox, danger && styles.iconBoxDanger]}>
        <MaterialIcons
          name={icon}
          size={20}
          color={danger ? C.danger : C.primary}
        />
      </View>
      <Text style={[styles.label, danger && { color: C.danger }]}>
        {label}
      </Text>
    </View>

    <MaterialIcons name="chevron-right" size={22} color={C.textMuted} />
  </TouchableOpacity>
);

//////////////////////////////////////////////////////////
// 🎨 Styles
//////////////////////////////////////////////////////////

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80, // for bottom nav
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: C.text,
    marginBottom: 14,
  },

  //////////////////////////////////
  // Profile
  //////////////////////////////////

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: C.border,
    ...shadow,
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow,
    shadowOpacity: 0.2,
  },

  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },

  name: {
    color: C.text,
    fontSize: 18,
    fontWeight: 'bold',
  },

  phone: {
    color: C.textSub,
    marginTop: 2,
  },

  email: {
    color: C.textMuted,
    marginTop: 2,
    fontSize: 13,
  },

  //////////////////////////////////
  // Sections
  //////////////////////////////////

  sectionTitle: {
    color: C.primary,
    fontWeight: 'bold',
    marginVertical: 10,
    letterSpacing: 1,
    fontSize: 12,
  },

  //////////////////////////////////
  // Items
  //////////////////////////////////

  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.surface,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },

  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  iconBoxDanger: {
    backgroundColor: C.dangerSoft,
  },

  label: {
    color: C.text,
    fontSize: 15,
  },
});

export default SettingsScreen;