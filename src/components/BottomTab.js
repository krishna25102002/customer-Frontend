import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { C } from '../theme';

const BottomTab = ({ activeTab, onTabPress }) => {
  const navigation = useNavigation();

  const Tab = ({ name, icon, target }) => (
    <TouchableOpacity onPress={() => navigation.navigate(target)}>
      <View style={styles.tab}>
        <Icon name={icon} size={22} color={activeTab === name ? C.accent : C.textMuted} />
        <Text style={[styles.text, activeTab === name && styles.active]}>{name}</Text>
        {activeTab === name && <View style={styles.activeDot} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Tab name="Home" icon="home" target="customerHome" />
      <Tab name="Trips" icon="location" target="TripsScreen" />
      <Tab name="Requests" icon="notifications" target="RequestsScreen" />
      <Tab name="Settings" icon="settings" target="Settings" />
    </View>
  );
};

export default BottomTab;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: C.surface,
    paddingVertical: 10,
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderColor: C.border,
    zIndex: 1000,
    ...C.shadow,
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  text: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 2,
  },
  active: {
    color: C.accent,
    fontWeight: 'bold',
  },
  activeDot: {
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.accent,
    marginTop: 2,
  },
});