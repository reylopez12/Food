import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useColors } from '@/hooks/useColors';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { RatingStars } from '@/components/RatingStars';
import { VideoCard } from '@/components/VideoCard';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useDirectory } from '@/context/DirectoryContext';
import { ListingMapWebView } from '@/components/ListingMapWebView';
import { useAuth } from '@/lib/auth';
import * as Haptics from 'expo-haptics';

function getApiBase() {
  return process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : '';
}

// ── Announcement types ────────────────────────────────────────────────────────
interface Announcement {
  id: string;
  venueId: string;
  title: string;
  body: string;
  type: string;
  createdAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  closed: 'Closed today',
  special: 'Daily special',
  general: 'Update',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { horizontalPadding, topInset } = useResponsiveLayout();
  const { listings, isSaved, toggleSave } = useDirectory();
  const { isAuthenticated, login } = useAuth();

  const TYPE_COLOR: Record<string, string> = {
    closed:  colors.destructive,
    special: colors.accent,
    general: colors.primary,
  };

  const listing = listings.find((l) => l.id === id);
  const saved = listing ? isSaved(listing.id) : false;

  // ── Follow state ──────────────────────────────────────────────────────────
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !listing) return;
    let cancelled = false;
    const apiBase = getApiBase();
    SecureStore.getItemAsync('auth_session_token').then((token) => {
      if (!token || cancelled) return;
      fetch(`${apiBase}/api/follows`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled) {
            setFollowing((data.following as string[]).includes(listing.id));
          }
        })
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [isAuthenticated, listing?.id]);

  // ── Announcements + broadcaster status ────────────────────────────────────
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [broadcasterActive, setBroadcasterActive] = useState(false);
  const [canPost, setCanPost] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    if (!listing) return;
    try {
      const apiBase = getApiBase();
      const r = await fetch(`${apiBase}/api/listings/${listing.id}/announcements`);
      if (r.ok) setAnnouncements(await r.json());
    } catch {}
  }, [listing?.id]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  useEffect(() => {
    if (!listing) return;
    let cancelled = false;
    const apiBase = getApiBase();
    const fetchStatus = async () => {
      try {
        const token = await SecureStore.getItemAsync('auth_session_token');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const r = await fetch(`${apiBase}/api/broadcaster/status/${listing.id}`, { headers });
        if (r.ok && !cancelled) {
          const data = await r.json();
          setBroadcasterActive(data.active ?? false);
          setCanPost(data.canPost ?? false);
        }
      } catch {}
    };
    fetchStatus();
    return () => { cancelled = true; };
  }, [listing?.id, isAuthenticated]);

  // ── Post form state ───────────────────────────────────────────────────────
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postType, setPostType] = useState<'general' | 'special' | 'closed'>('general');
  const [postSaving, setPostSaving] = useState(false);

  const handlePostAnnouncement = async () => {
    if (!postTitle.trim() || !postBody.trim() || !listing) return;
    setPostSaving(true);
    try {
      const token = await SecureStore.getItemAsync('auth_session_token');
      if (!token) { login(); return; }
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/listings/${listing.id}/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: postTitle, body: postBody, type: postType }),
      });
      if (res.ok) {
        const created = await res.json();
        setAnnouncements((prev) => [created, ...prev]);
        setPostTitle('');
        setPostBody('');
        setPostType('general');
      } else {
        Alert.alert('Error', 'Could not post announcement.');
      }
    } catch {
      Alert.alert('Error', 'Could not post announcement.');
    } finally {
      setPostSaving(false);
    }
  };

  // ── Not found guard ───────────────────────────────────────────────────────
  if (!listing) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.foreground }]}>Listing not found</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.primary }]}>
          <Text style={[styles.backBtnText, { color: colors.primaryForeground }]}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // ── Action handlers ───────────────────────────────────────────────────────
  const handleSave = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleSave(listing.id);
  };

  const handleFollow = async () => {
    if (!isAuthenticated) { login(); return; }
    if (followLoading) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFollowLoading(true);
    try {
      const token = await SecureStore.getItemAsync('auth_session_token');
      if (!token) { login(); return; }
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/follows/${listing.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { login(); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFollowing(data.following as boolean);
    } catch {
      Alert.alert('Error', 'Could not update follow status. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleCall = () => {
    if (listing.phone) {
      Linking.openURL(`tel:${listing.phone}`);
    } else {
      Linking.openURL(
        `https://www.google.com/search?q=${encodeURIComponent(listing.name + ' ' + listing.city + ' phone number')}`,
      );
    }
  };

  const handleWebsite = () => {
    if (listing.website) {
      Linking.openURL(listing.website);
    } else {
      Linking.openURL(
        `https://www.google.com/search?q=${encodeURIComponent(listing.name + ' ' + listing.city)}`,
      );
    }
  };

  const handleCopyAddress = () => {
    const fullAddress = `${listing.address}, ${listing.city}`;
    Share.share({ message: fullAddress }).catch(() => {/* dismissed */});
  };

  const handleDirections = () => {
    const url =
      Platform.OS === 'ios'
        ? `maps://?q=${listing.lat},${listing.lng}`
        : `https://maps.google.com/maps?q=${listing.lat},${listing.lng}`;
    Linking.openURL(url);
  };

  const handleShare = () => {
    Alert.alert('Share', `Share ${listing.name} with friends!`);
  };

  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  // Show section if there are announcements to read OR the venue has a broadcaster
  // subscription — same gate as the web version.
  const showAnnouncementsSection = announcements.length > 0 || broadcasterActive;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={{ paddingBottom: bottomPad + 32 }}
      >
        {/* Hero block */}
        <View
          style={[
            styles.hero,
            {
              backgroundColor: listing.color,
              paddingTop: topInset + 16,
              paddingHorizontal: horizontalPadding,
            },
          ]}
        >
          <View style={styles.topBar}>
            <Pressable
              style={[styles.circleBtn, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </Pressable>
            <View style={styles.topBarRight}>
              <Pressable
                style={[styles.circleBtn, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
                onPress={handleShare}
              >
                <Feather name="share-2" size={18} color="#fff" />
              </Pressable>
              <Pressable
                style={[styles.circleBtn, { backgroundColor: following ? 'rgba(239,68,68,0.7)' : 'rgba(0,0,0,0.3)' }]}
                onPress={handleFollow}
                disabled={followLoading}
              >
                <Ionicons name={following ? 'heart' : 'heart-outline'} size={18} color="#fff" />
              </Pressable>
              <Pressable
                style={[styles.circleBtn, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
                onPress={handleSave}
              >
                <Ionicons
                  name={saved ? 'bookmark' : 'bookmark-outline'}
                  size={18}
                  color={saved ? colors.accent : '#fff'}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.heroCenter}>
            <Text style={styles.heroInitials}>{listing.initials}</Text>
            {listing.verified && (
              <View style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="checkmark-circle" size={14} color="#fff" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>

          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{listing.name}</Text>
            <View style={styles.heroCat}>
              <View style={[styles.catChip, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Text style={styles.catChipText}>
                  {listing.category.charAt(0).toUpperCase() + listing.category.slice(1)}
                </Text>
              </View>
              <Text style={styles.heroPrice}>{listing.priceRange}</Text>
            </View>
          </View>
        </View>

        {/* Rating card */}
        <View
          style={[
            styles.ratingCard,
            { backgroundColor: colors.card, shadowColor: '#000', marginHorizontal: horizontalPadding },
          ]}
        >
          <View style={styles.ratingLeft}>
            <Text style={[styles.ratingNum, { color: colors.foreground }]}>{listing.rating.toFixed(1)}</Text>
            <RatingStars rating={listing.rating} size={16} showCount={false} />
            <Text style={[styles.ratingCount, { color: colors.mutedForeground }]}>
              {listing.reviewCount.toLocaleString()} reviews
            </Text>
          </View>
          <View style={[styles.dividerV, { backgroundColor: colors.border }]} />
          <View style={styles.ratingRight}>
            <Text style={[styles.ratingLabel, { color: colors.mutedForeground }]}>Price</Text>
            <Text style={[styles.ratingPrice, { color: colors.foreground }]}>{listing.priceRange}</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={[styles.actions, { marginHorizontal: horizontalPadding }]}>
          {[
            { icon: 'call-outline', label: 'Call', onPress: handleCall },
            { icon: 'globe-outline', label: 'Website', onPress: handleWebsite },
            { icon: 'navigate-outline', label: 'Directions', onPress: handleDirections },
          ].map((action) => (
            <Pressable
              key={action.label}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={action.onPress}
            >
              <Ionicons name={action.icon as any} size={22} color={colors.primary} />
              <Text style={[styles.actionLabel, { color: colors.foreground }]} numberOfLines={1}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Video Showcase */}
        {listing.hasVideo && listing.video && (
          <View style={[styles.section, { paddingTop: 20 }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Dish Showcase</Text>
            <View style={{ marginTop: 10 }}>
              <VideoCard listing={listing} />
            </View>
          </View>
        )}

        {/* About */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>{listing.description}</Text>
        </View>

        {/* Tags */}
        {listing.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Tags</Text>
            <View style={styles.tagsRow}>
              {listing.tags.map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Announcements ─────────────────────────────────────────────────── */}
        {showAnnouncementsSection && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Ionicons name="megaphone-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Announcements</Text>
            </View>

            {/* Post form — admin only when canPost */}
            {canPost && (
              <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.primary + '44' }]}>
                <Text style={[styles.postLabel, { color: colors.primary }]}>POST AN ANNOUNCEMENT</Text>

                {/* Type selector */}
                <View style={styles.typeRow}>
                  {(['general', 'special', 'closed'] as const).map((t) => (
                    <Pressable
                      key={t}
                      style={[
                        styles.typeChip,
                        {
                          borderColor: postType === t ? colors.primary : colors.border,
                          backgroundColor: postType === t ? colors.primary : 'transparent',
                        },
                      ]}
                      onPress={() => setPostType(t)}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          { color: postType === t ? colors.primaryForeground : colors.mutedForeground },
                        ]}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <TextInput
                  style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder="Title (e.g. Closed for the holiday)"
                  placeholderTextColor={colors.mutedForeground}
                  value={postTitle}
                  onChangeText={setPostTitle}
                  maxLength={120}
                />
                <TextInput
                  style={[styles.textArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder="Message… (up to 280 characters)"
                  placeholderTextColor={colors.mutedForeground}
                  value={postBody}
                  onChangeText={setPostBody}
                  maxLength={280}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <Pressable
                  style={[
                    styles.postBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity: postSaving || !postTitle.trim() || !postBody.trim() ? 0.5 : 1,
                    },
                  ]}
                  onPress={handlePostAnnouncement}
                  disabled={postSaving || !postTitle.trim() || !postBody.trim()}
                >
                  <Ionicons name="send" size={14} color={colors.primaryForeground} />
                  <Text style={[styles.postBtnText, { color: colors.primaryForeground }]}>
                    {postSaving ? 'Posting…' : 'Post'}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Broadcaster CTA — visible to any authenticated user who can't post */}
            {!canPost && isAuthenticated && (
              <View style={[styles.ctaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="megaphone-outline" size={22} color={colors.mutedForeground} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ctaTitle, { color: colors.foreground }]}>Broadcaster subscription</Text>
                  <Text style={[styles.ctaBody, { color: colors.mutedForeground }]}>
                    Post announcements to all your followers — specials, closures, and more. $29/month.
                  </Text>
                </View>
                <View style={[styles.comingSoon, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.comingSoonText, { color: colors.mutedForeground }]}>Soon</Text>
                </View>
              </View>
            )}

            {/* Announcement list */}
            {announcements.length > 0 ? (
              <View style={{ gap: 10 }}>
                {announcements.map((a) => (
                  <View key={a.id} style={[styles.annoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.annoTop}>
                      <View style={[styles.annoBadge, { backgroundColor: (TYPE_COLOR[a.type] ?? TYPE_COLOR.general) + '22' }]}>
                        <Text style={[styles.annoBadgeText, { color: TYPE_COLOR[a.type] ?? TYPE_COLOR.general }]}>
                          {TYPE_LABEL[a.type] ?? 'Update'}
                        </Text>
                      </View>
                      <Text style={[styles.annoTime, { color: colors.mutedForeground }]}>
                        {timeAgo(a.createdAt)}
                      </Text>
                    </View>
                    <Text style={[styles.annoTitle, { color: colors.foreground }]}>{a.title}</Text>
                    <Text style={[styles.annoBody, { color: colors.mutedForeground }]}>{a.body}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.annoEmpty, { color: colors.mutedForeground }]}>No announcements yet.</Text>
            )}
          </View>
        )}

        {/* Map */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Location</Text>
          <ListingMapWebView lat={listing.lat} lng={listing.lng} name={listing.name} />
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Details</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
            {/* Address — tap to copy/share */}
            <Pressable style={styles.infoRow} onPress={handleCopyAddress} android_ripple={{ color: colors.border }}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoText, { color: colors.foreground }]} numberOfLines={2}>
                  {listing.address}, {listing.city}
                </Text>
              </View>
              <Ionicons name="copy-outline" size={14} color={colors.mutedForeground} />
            </Pressable>

            <View style={[styles.dividerH, { backgroundColor: colors.border }]} />

            {/* Phone */}
            <Pressable style={styles.infoRow} onPress={handleCall} android_ripple={{ color: colors.border }}>
              <Ionicons name="call-outline" size={18} color={colors.primary} />
              <Text
                style={[styles.infoText, { color: listing.phone ? colors.foreground : colors.mutedForeground }]}
                numberOfLines={1}
              >
                {listing.phone || 'Not listed — tap to search'}
              </Text>
            </Pressable>

            <View style={[styles.dividerH, { backgroundColor: colors.border }]} />

            {/* Hours */}
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.foreground }]} numberOfLines={2}>
                {listing.hours}
              </Text>
            </View>

            <View style={[styles.dividerH, { backgroundColor: colors.border }]} />

            {/* Website */}
            <Pressable style={styles.infoRow} onPress={handleWebsite} android_ripple={{ color: colors.border }}>
              <Ionicons name="globe-outline" size={18} color={colors.primary} />
              <Text
                style={[styles.infoText, { color: listing.website ? colors.primary : colors.mutedForeground }]}
                numberOfLines={1}
              >
                {listing.website
                  ? listing.website.replace(/^https?:\/\//, '')
                  : 'Not listed — tap to search'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  notFoundText: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  backBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  hero: { paddingHorizontal: 20, paddingBottom: 24 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  topBarRight: { flexDirection: 'row', gap: 10 },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCenter: { alignItems: 'center', marginBottom: 16 },
  heroInitials: {
    fontSize: 64,
    fontFamily: 'Inter_700Bold',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  verifiedText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  heroInfo: { alignItems: 'center', gap: 6 },
  heroName: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: '#fff',
    textAlign: 'center',
  },
  heroCat: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  catChipText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#fff' },
  heroPrice: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.8)' },
  ratingCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    gap: 20,
    alignItems: 'center',
  },
  ratingLeft: { flex: 1, alignItems: 'center', gap: 4 },
  ratingNum: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  ratingCount: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  dividerV: { width: 1, height: 50 },
  ratingRight: { flex: 1, alignItems: 'center', gap: 4 },
  ratingLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  ratingPrice: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  actions: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  actionLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  section: { paddingHorizontal: 20, paddingTop: 24, gap: 10 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  description: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 23,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  tagText: { fontSize: 13, fontFamily: 'Inter_500Medium' },

  // ── Announcements ─────────────────────────────────────────────────────────
  postCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  postLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.6,
  },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeChipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    minHeight: 80,
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
  },
  postBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  ctaTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  ctaBody: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  comingSoon: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comingSoonText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  annoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  annoTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  annoBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  annoBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  annoTime: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  annoTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', lineHeight: 20 },
  annoBody: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  annoEmpty: { fontSize: 14, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },

  // ── Details card ──────────────────────────────────────────────────────────
  infoCard: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  dividerH: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 44,
  },
});
