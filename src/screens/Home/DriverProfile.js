import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';

import BottomTab from '../../components/BottomTab';
import { C } from '../../theme';

const DriverProfile = ({ route, navigation }) => {
  const driver = route.params?.driver;
  const [sending, setSending] = useState(false);

  const handleSendRequest = () => {
    if (sending) return;
    setSending(true);
    // Take the customer back Home with this driver preselected —
    // they pick the date & time on the Home page and send the request there.
    navigation.replace('customerHome', { preselectDriver: driver });
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* HERO CARD */}
        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(driver.name || 'D').substring(0, 2).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.name}>{driver.name}</Text>
          <Text style={styles.vehicle}>MH 01 AB 1234 · Swift Dzire</Text>

          <View style={styles.badges}>
            <View style={styles.verifiedPill}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
            <View style={styles.ratingPill}>
              <Text style={styles.ratingText}>{driver.rating} ★</Text>
            </View>
          </View>
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>284</Text>
            <Text style={styles.statTitle}>Trips</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>14K</Text>
            <Text style={styles.statTitle}>Km Done</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{driver.rating}</Text>
            <Text style={styles.statTitle}>Rating</Text>
          </View>
        </View>

        {/* SPECIAL */}
        <Text style={styles.sectionTitle}>Specialises in</Text>
        <View style={styles.tags}>
          <Text style={styles.tagActive}>Local</Text>
          <Text style={styles.tag}>Outstation</Text>
          <Text style={styles.tag}>Long Trip</Text>
        </View>

        {/* REVIEWS */}
        <Text style={styles.sectionTitle}>Reviews</Text>
        <View style={styles.reviewCard}>
          <View style={styles.reviewTop}>
            <Text style={styles.reviewName}>Ravi K</Text>
            <Text style={styles.reviewStars}>⭐⭐⭐⭐⭐</Text>
          </View>
          <Text style={styles.reviewText}>Very professional driver, smooth ride!</Text>
        </View>

        {/* BUTTON */}
        <TouchableOpacity style={styles.button} onPress={handleSendRequest} disabled={sending}>
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Book This Driver</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <BottomTab activeTab="Home" onTabPress={() => {}} />
    </View>
  );
};

export default DriverProfile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingBottom: 70,
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: C.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    ...C.shadow,
  },
  backText: {
    color: C.accent,
    fontWeight: 'bold',
  },

  heroCard: {
    backgroundColor: C.primary,
    alignItems: 'center',
    padding: 22,
    margin: 16,
    borderRadius: 24,
    ...C.shadow,
    shadowOpacity: 0.3,
  },
  avatar: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    height: 76,
    width: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  name: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  vehicle: {
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 12,
  },
  badges: {
    flexDirection: 'row',
  },
  verifiedPill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 8,
  },
  verifiedText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  ratingPill: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  ratingText: {
    color: C.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    marginHorizontal: 16,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: C.border,
  },
  statTitle: {
    color: C.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  statValue: {
    color: C.text,
    fontSize: 17,
    fontWeight: 'bold',
  },

  sectionTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 16,
    marginTop: 18,
    marginBottom: 10,
  },

  tags: {
    flexDirection: 'row',
    marginHorizontal: 16,
  },
  tagActive: {
    backgroundColor: C.accent,
    color: '#fff',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginRight: 8,
    fontWeight: '600',
  },
  tag: {
    backgroundColor: C.surface,
    color: C.textSub,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginRight: 8,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: C.border,
  },

  reviewCard: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  reviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewName: {
    color: C.text,
    fontWeight: 'bold',
  },
  reviewStars: {
    color: '#F5A623',
    fontSize: 12,
  },
  reviewText: {
    color: C.textSub,
  },

  button: {
    backgroundColor: C.accent,
    margin: 16,
    marginTop: 10,
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    ...C.shadow,
    shadowOpacity: 0.28,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});