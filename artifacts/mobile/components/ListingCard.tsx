import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Listing } from '@/constants/data';
import { RatingStars } from '@/components/RatingStars';
import { useDirectory } from '@/context/DirectoryContext';
import * as Haptics from 'expo-haptics';

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
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
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, opacity: pressed ? 0.93 : 1 },
      ]}
      onPress={() => router.push(`/listing/${listing.id}`)}
    >
      {/* Color strip / avatar */}
      <View style={[styles.avatar, { backgroundColor: listing.color }]}>
        <Text style={styles.initials}>{listing.initials}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {listing.name}
          </Text>
          {listing.verified && (
            <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
          )}
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.category, { color: colors.mutedForeground }]}>
            {listing.category.charAt(0).toUpperCase() + listing.category.slice(1)}
          </Text>
          <Text style={[styles.dot, { color: colors.border }]}> · </Text>
          <Text style={[styles.price, { color: colors.mutedForeground }]}>{listing.priceRange}</Text>
        </View>
        <RatingStars rating={listing.rating} reviewCount={listing.reviewCount} size={12} />
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
          <Text style={[styles.city, { color: colors.mutedForeground }]} numberOfLines={1}>
            {listing.address}, {listing.city}
          </Text>
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

      {/* Save button */}
      <Pressable onPress={handleSave} style={styles.saveBtn} hitSlop={8}>
        <Ionicons
          name={saved ? 'bookmark' : 'bookmark-outline'}
          size={20}
          color={saved ? colors.accent : colors.mutedForeground}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  initials: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    flex: 1,
    padding: 12,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  category: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  dot: {
    fontSize: 12,
  },
  price: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  city: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  saveBtn: {
    padding: 12,
    alignSelf: 'flex-start',
  },
});
