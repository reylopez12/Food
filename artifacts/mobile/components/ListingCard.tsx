import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import type { Venue as Listing } from '@workspace/api-client-react';
import { RatingStars } from '@/components/RatingStars';
import { useDirectory } from '@/context/DirectoryContext';
import * as Haptics from 'expo-haptics';

interface ListingCardProps {
  listing: Listing;
  distanceMi?: number;
}

export function ListingCard({ listing, distanceMi }: ListingCardProps) {
  const colors = useColors();
  const router = useRouter();
  const { isSaved, toggleSave } = useDirectory();
  const saved = isSaved(listing.id);

  const handleSave = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSave(listing.id);
  };

  const distanceLabel =
    distanceMi !== undefined
      ? distanceMi < 0.1
        ? '< 0.1 mi'
        : `${distanceMi.toFixed(1)} mi`
      : null;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.93 : 1 },
      ]}
      onPress={() => router.push(`/listing/${listing.id}`)}
    >
      <View style={[styles.avatar, { backgroundColor: listing.color }]}>
        <Text style={styles.initials}>{listing.initials}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {listing.name}
          </Text>
          {listing.verified && (
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          )}
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.category, { color: colors.mutedForeground }]}>
            {listing.category.charAt(0).toUpperCase() + listing.category.slice(1)}
          </Text>
          <Text style={[styles.dot, { color: colors.border }]}> · </Text>
          <Text style={[styles.price, { color: colors.mutedForeground }]}>{listing.priceRange}</Text>
        </View>
        <RatingStars rating={listing.rating} reviewCount={listing.reviewCount} size={13} />
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
          <Text style={[styles.city, { color: colors.mutedForeground }]} numberOfLines={1}>
            {listing.address}, {listing.city}
          </Text>
          {distanceLabel && (
            <Text style={[styles.distance, { color: colors.primary }]}>
              {distanceLabel}
            </Text>
          )}
        </View>
        {listing.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {listing.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.muted }]}>
                <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <Pressable onPress={handleSave} style={styles.saveBtn} hitSlop={8}>
        <Ionicons
          name={saved ? 'bookmark' : 'bookmark-outline'}
          size={22}
          color={saved ? colors.accent : colors.mutedForeground}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
  },
  avatar: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  initials: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    flex: 1,
    padding: 14,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  category: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  dot: {
    fontSize: 13,
  },
  price: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  city: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  distance: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
  },
  saveBtn: {
    padding: 14,
    alignSelf: 'flex-start',
  },
});
