import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import type { Venue as Listing } from '@workspace/api-client-react';
import { RatingStars } from '@/components/RatingStars';
import { useDirectory } from '@/context/DirectoryContext';
import * as Haptics from 'expo-haptics';

interface FeaturedCardProps {
  listing: Listing;
}

export function FeaturedCard({ listing }: FeaturedCardProps) {
  const colors = useColors();
  const router = useRouter();
  const { isSaved, toggleSave } = useDirectory();
  const saved = isSaved(listing.id);

  const handleSave = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSave(listing.id);
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1 }]}
      onPress={() => router.push(`/listing/${listing.id}`)}
    >
      {/* Image placeholder */}
      <View style={[styles.imageBlock, { backgroundColor: listing.color }]}>
        <Text style={styles.initials}>{listing.initials}</Text>
        {listing.verified && (
          <View style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark" size={10} color="#fff" />
          </View>
        )}
        <Pressable
          style={[styles.saveBtn, { backgroundColor: 'rgba(0,0,0,0.35)' }]}
          onPress={handleSave}
          hitSlop={8}
        >
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={saved ? colors.accent : '#fff'}
          />
        </Pressable>
      </View>

      {/* Info block */}
      <View style={[styles.info, { backgroundColor: colors.card }]}>
        <View style={styles.tagRow}>
          <View style={[styles.categoryChip, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.categoryText, { color: colors.primary }]}>
              {listing.category.charAt(0).toUpperCase() + listing.category.slice(1)}
            </Text>
          </View>
          <Text style={[styles.price, { color: colors.mutedForeground }]}>{listing.priceRange}</Text>
        </View>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {listing.name}
        </Text>
        <RatingStars rating={listing.rating} reviewCount={listing.reviewCount} size={12} />
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
          <Text style={[styles.city, { color: colors.mutedForeground }]} numberOfLines={1}>
            {listing.city}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 220,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginRight: 14,
  },
  imageBlock: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 42,
    fontFamily: 'Inter_700Bold',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 2,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    padding: 12,
    gap: 4,
  },
  tagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  price: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  name: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  city: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});
