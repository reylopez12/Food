import React, { useEffect } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import {
  useDirectory,
  haversineDistanceMi,
  RADIUS_OPTIONS,
  type RadiusMiles,
} from '@/context/DirectoryContext';
import { ListingCard } from '@/components/ListingCard';
import { CategoryPillRow } from '@/components/CategoryPill';
import { SearchBar } from '@/components/SearchBar';

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    filteredListings,
    searchQuery,
    setSearchQuery,
    cityQuery,
    setCityQuery,
    locationStatus,
    userLat,
    userLng,
    preferredRadius,
    requestLocation,
    clearLocation,
    setPreferredRadius,
  } = useDirectory();
  const { city } = useLocalSearchParams<{ city?: string }>();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  useEffect(() => {
    if (typeof city === 'string') setCityQuery(city);
  }, [city, setCityQuery]);

  const locationGranted = locationStatus === 'granted' && userLat !== null && userLng !== null;
  const distanceActive = locationGranted && preferredRadius !== null;

  function getDistanceMi(lat: number, lng: number): number | undefined {
    if (!locationGranted || (lat === 0 && lng === 0)) return undefined;
    return haversineDistanceMi(userLat!, userLng!, lat, lng);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sticky header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Explore</Text>
          {distanceActive && (
            <View style={[styles.distanceBadge, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="navigate" size={11} color={colors.primary} />
              <Text style={[styles.distanceBadgeText, { color: colors.primary }]}>
                {preferredRadius} mi
              </Text>
            </View>
          )}
        </View>

        <View style={styles.searchWrap}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search food or neighborhood"
            autoFocus={false}
          />
        </View>
        <View style={styles.citySearchWrap}>
          <SearchBar
            value={cityQuery}
            onChangeText={setCityQuery}
            placeholder="Filter by city, e.g. Oakland"
            autoFocus={false}
          />
        </View>

        <View style={styles.pillsWrap}>
          <CategoryPillRow />
        </View>

        {/* Near Me bar */}
        <NearMeBar
          colors={colors}
          locationStatus={locationStatus}
          locationGranted={locationGranted}
          preferredRadius={preferredRadius}
          requestLocation={requestLocation}
          clearLocation={clearLocation}
          setPreferredRadius={setPreferredRadius}
        />
      </View>

      {/* Results */}
      <FlatList
        data={filteredListings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            distanceMi={getDistanceMi(item.lat, item.lng)}
          />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === 'web' ? 100 : 90 },
        ]}
        scrollEnabled={!!filteredListings.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="search" size={40} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No results found</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {distanceActive
                ? `No spots found within ${preferredRadius} miles. Try a larger radius.`
                : 'Try a different search term or category.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Near Me Bar ────────────────────────────────────────────────────────────
interface NearMeBarProps {
  colors: ReturnType<typeof useColors>;
  locationStatus: string;
  locationGranted: boolean;
  preferredRadius: RadiusMiles | null;
  requestLocation: () => Promise<void>;
  clearLocation: () => void;
  setPreferredRadius: (r: RadiusMiles | null) => void;
}

function NearMeBar({
  colors,
  locationStatus,
  locationGranted,
  preferredRadius,
  requestLocation,
  clearLocation,
  setPreferredRadius,
}: NearMeBarProps) {
  if (!locationGranted) {
    // Show "Near me" trigger
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.nearMeRow}
      >
        <Pressable
          onPress={requestLocation}
          disabled={locationStatus === 'requesting'}
          style={({ pressed }) => [
            styles.nearMeButton,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed || locationStatus === 'requesting' ? 0.65 : 1,
            },
          ]}
        >
          <Ionicons
            name={locationStatus === 'requesting' ? 'navigate' : 'navigate-outline'}
            size={13}
            color={colors.mutedForeground}
          />
          <Text style={[styles.nearMeButtonText, { color: colors.mutedForeground }]}>
            {locationStatus === 'requesting'
              ? 'Getting location…'
              : locationStatus === 'denied'
              ? 'Location denied'
              : 'Near me'}
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  // Location granted — show radius pills + clear
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.nearMeRow}
    >
      {/* Active location indicator */}
      <Pressable
        onPress={clearLocation}
        style={[styles.nearMeButton, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}
      >
        <Ionicons name="navigate" size={13} color={colors.primary} />
        <Text style={[styles.nearMeButtonText, { color: colors.primary }]}>Near me</Text>
        <Ionicons name="close" size={12} color={colors.primary} style={{ marginLeft: 2 }} />
      </Pressable>

      {/* Radius options */}
      {RADIUS_OPTIONS.map((r) => {
        const active = preferredRadius === r;
        return (
          <Pressable
            key={r}
            onPress={() => setPreferredRadius(active ? null : r)}
            style={({ pressed }) => [
              styles.radiusPill,
              {
                backgroundColor: active ? colors.primary : colors.card,
                borderColor: active ? colors.primary : colors.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.radiusPillText,
                { color: active ? '#fff' : colors.mutedForeground },
              ]}
            >
              {r} mi
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  distanceBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  searchWrap: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  citySearchWrap: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  pillsWrap: {
    paddingBottom: 4,
  },
  nearMeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 4,
  },
  nearMeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  nearMeButtonText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  radiusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  radiusPillText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
