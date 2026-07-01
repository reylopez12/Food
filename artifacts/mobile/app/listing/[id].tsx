import React from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { SAMPLE_LISTINGS } from '@/constants/data';
import { RatingStars } from '@/components/RatingStars';
import { VideoCard } from '@/components/VideoCard';
import { useDirectory } from '@/context/DirectoryContext';
import { ListingMapWebView } from '@/components/ListingMapWebView';
import * as Haptics from 'expo-haptics';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSaved, toggleSave } = useDirectory();

  const listing = SAMPLE_LISTINGS.find((l) => l.id === id);
  const saved = listing ? isSaved(listing.id) : false;

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

  const handleSave = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleSave(listing.id);
  };

  const handleCall = () => {
    if (listing.phone) {
      Linking.openURL(`tel:${listing.phone}`);
    }
  };

  const handleWebsite = () => {
    if (listing.website) {
      Linking.openURL(listing.website);
    }
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

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 24 }}>
        {/* Hero block */}
        <View style={[styles.hero, { backgroundColor: listing.color, paddingTop: topPad + 16 }]}>
          {/* Top bar */}
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

          {/* Initials */}
          <View style={styles.heroCenter}>
            <Text style={styles.heroInitials}>{listing.initials}</Text>
            {listing.verified && (
              <View style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="checkmark-circle" size={14} color="#fff" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>

          {/* Hero info */}
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
        <View style={[styles.ratingCard, { backgroundColor: colors.card, shadowColor: '#000' }]}>
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
        <View style={styles.actions}>
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
              <Text style={[styles.actionLabel, { color: colors.foreground }]}>{action.label}</Text>
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

        {/* Map */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Location</Text>
          <ListingMapWebView lat={listing.lat} lng={listing.lng} name={listing.name} />
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Details</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
            {[
              { icon: 'location-outline', text: `${listing.address}, ${listing.city}` },
              { icon: 'call-outline', text: listing.phone },
              { icon: 'time-outline', text: listing.hours },
              { icon: 'globe-outline', text: listing.website },
            ].map((item, i, arr) => (
              <React.Fragment key={item.icon}>
                <View style={styles.infoRow}>
                  <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                  <Text style={[styles.infoText, { color: colors.foreground }]} numberOfLines={2}>
                    {item.text}
                  </Text>
                </View>
                {i < arr.length - 1 && (
                  <View style={[styles.dividerH, { backgroundColor: colors.border }]} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      </ScrollView>
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
  notFoundText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  backBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  topBarRight: {
    flexDirection: 'row',
    gap: 10,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCenter: {
    alignItems: 'center',
    marginBottom: 16,
  },
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
  verifiedText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  heroInfo: {
    alignItems: 'center',
    gap: 6,
  },
  heroName: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    textAlign: 'center',
  },
  heroCat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  catChipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#fff',
  },
  heroPrice: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.8)',
  },
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
  ratingLeft: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  ratingNum: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  ratingCount: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  dividerV: {
    width: 1,
    height: 50,
  },
  ratingRight: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  ratingLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  ratingPrice: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
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
  actionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
  },
  description: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 23,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
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
