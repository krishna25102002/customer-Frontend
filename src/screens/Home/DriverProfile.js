import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import BottomTab from '../../components/BottomTab';
import { C } from '../../theme';
import { getDriverProfile } from '../../api';

/* Staggered fade + rise animation for sections. */
const FadeIn = ({ delay = 0, style, children }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 450,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 450,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, delay]);

  return (
    <Animated.View
      style={[style, { opacity, transform: [{ translateY }] }]}
    >
      {children}
    </Animated.View>
  );
};

const starsRow = (stars) => {
  const filled = Math.max(0, Math.min(5, Number(stars) || 0));
  return '★★★★★'.slice(0, filled) + '☆☆☆☆☆'.slice(0, 5 - filled);
};

const DriverProfile = ({ route, navigation }) => {
  const driver = route.params?.driver || {};
  const driverId =
    driver.id || driver.driverId || driver._id || null;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!driverId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const token = await AsyncStorage.getItem('token');
      const res = await getDriverProfile(driverId, token);
      if (res && res.driver) setProfile(res.driver);
    } catch (e) {
      setError(e.message || 'Could not load driver profile.');
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSendRequest = () => {
    if (sending) return;
    setSending(true);
    // Take the customer back Home with this driver preselected —
    // they pick the date & time on the Home page and send the request there.
    // Reset (not replace/push) so we never end up with a duplicate
    // customerHome entry in the stack.
    navigation.reset({
      index: 0,
      routes: [
        { name: 'customerHome', params: { preselectDriver: driver } },
      ],
    });
  };

  // Prefer fresh backend data; fall back to what the list passed in.
  const name = profile?.fullName || driver.name || 'Driver';
  const rating = profile?.rating ?? driver.rating ?? 5;
  const ratingCount = profile?.ratingCount ?? driver.ratingCount ?? 0;
  const trips = profile?.completedTrips ?? driver.trips ?? 0;
  const totalKm = profile?.totalKm ?? 0;
  const totalHours = profile?.totalHours ?? 0;
  const experience = profile?.experience ?? 0;
  const city = profile?.city || '';
  const state = profile?.state || '';
  const languages = profile?.languages || [];
  const reviews = profile?.reviews || [];
  const verified = profile?.verified ?? true;

  const showKm = totalKm > 0;
  const distanceTitle = showKm ? 'Km Done' : 'Hours Done';
  const distanceValue = showKm
    ? `${totalKm} km`
    : `${totalHours} hrs`;

  if (loading && !profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Loading profile…</Text>
        <BottomTab activeTab="Home" />
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadProfile}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        <BottomTab activeTab="Home" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* HERO CARD */}
        <FadeIn delay={0}>
          <View style={styles.heroCard}>
            <View style={styles.heroGlow} pointerEvents="none" />

            <View style={styles.avatarRing}>
              {profile?.profilePhoto ? (
                <Image
                  source={{ uri: profile.profilePhoto }}
                  style={styles.avatarImg}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(name || 'D').substring(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.name}>{name}</Text>
            <Text style={styles.vehicle}>
              {city
                ? `${city}${state ? `, ${state}` : ''}`
                : 'Professional driver'}
              {experience ? ` · ${experience} yrs experience` : ''}
            </Text>

            <View style={styles.badges}>
              {verified && (
                <View style={styles.verifiedPill}>
                  <Text style={styles.verifiedText}>✓ Verified</Text>
                </View>
              )}
              <View style={styles.ratingPill}>
                <Text style={styles.ratingText}>
                  {ratingCount > 0
                    ? `${Number(rating).toFixed(1)} ★`
                    : 'New driver'}
                </Text>
              </View>
            </View>

            {languages.length > 0 && (
              <Text style={styles.languages}>
                Speaks {languages.slice(0, 3).join(', ')}
              </Text>
            )}
          </View>
        </FadeIn>

        {/* STATS */}
        <FadeIn delay={140}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{trips}</Text>
              <Text style={styles.statTitle}>Trips</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{distanceValue}</Text>
              <Text style={styles.statTitle}>{distanceTitle}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {Number(rating).toFixed(1)}
              </Text>
              <Text style={styles.statTitle}>Rating</Text>
            </View>
          </View>
        </FadeIn>

        {/* SPECIAL */}
        <FadeIn delay={240}>
          <Text style={styles.sectionTitle}>Specialises in</Text>
          <View style={styles.tags}>
            <Text style={styles.tagActive}>Local</Text>
            <Text style={styles.tag}>Outstation</Text>
            <Text style={styles.tag}>Long Trip</Text>
          </View>
        </FadeIn>

        {/* REVIEWS */}
        <FadeIn delay={340}>
          <View style={styles.reviewHeader}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            <Text style={styles.reviewCount}>
              {reviews.length > 0
                ? `${ratingCount > 0 ? Number(rating).toFixed(1) : '—'} ★ · ${ratingCount}`
                : ''}
            </Text>
          </View>

          {reviews.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No reviews yet — be the first to book and rate this driver.
              </Text>
            </View>
          ) : (
            reviews.map((rev, idx) => (
              <View key={idx} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <View style={styles.reviewWho}>
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewAvatarText}>
                        {(rev.customerName || 'C')
                          .substring(0, 1)
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.reviewName}>
                        {rev.customerName || 'Verified Customer'}
                      </Text>
                      <Text style={styles.reviewDate}>
                        {rev.date
                          ? new Date(rev.date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.reviewStars}>
                    {starsRow(rev.stars)}
                  </Text>
                </View>
                {rev.comment ? (
                  <Text style={styles.reviewText}>{rev.comment}</Text>
                ) : null}
              </View>
            ))
          )}
        </FadeIn>

        {/* BUTTON */}
        <FadeIn delay={420}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleSendRequest}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Book This Driver</Text>
            )}
          </TouchableOpacity>
        </FadeIn>
      </ScrollView>

      <BottomTab activeTab="Home" />
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: C.textMuted,
  },
  errorText: {
    color: C.textSub,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 24,
    ...C.shadow,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
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
    padding: 24,
    margin: 16,
    borderRadius: 26,
    overflow: 'hidden',
    ...C.shadow,
    shadowOpacity: 0.3,
  },
  heroGlow: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatarRing: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: 46,
    padding: 4,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatar: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    height: 78,
    width: 78,
    borderRadius: 39,
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'center',
    marginTop: 4,
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
  languages: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 10,
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
    paddingHorizontal: 4,
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
    textAlign: 'center',
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

  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
  },
  reviewCount: {
    color: C.textMuted,
    fontSize: 13,
    marginTop: 14,
  },
  reviewCard: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  reviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  reviewWho: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  reviewAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  reviewName: {
    color: C.text,
    fontWeight: 'bold',
  },
  reviewDate: {
    color: C.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  reviewStars: {
    color: '#F5A623',
    fontSize: 12,
    marginLeft: 8,
  },
  reviewText: {
    color: C.textSub,
    lineHeight: 20,
  },

  emptyCard: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  emptyText: {
    color: C.textMuted,
    textAlign: 'center',
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
