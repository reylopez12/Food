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
import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import {
  useDirectory,
  haversineDistanceMi,
  RADIUS_OPTIONS,
  type RadiusMiles,
  type SearchMode,
} from '@/context/DirectoryContext';
import { ListingCard } from '@/components/ListingCard';
import { CategoryPillRow } from '@/components/CategoryPill';
import { SearchBar } from '@/components/SearchBar';

export default function ExploreScreen() {
  const colors = useColors();
  const router = useRouter();
  const { bottomTabPadding, horizontalPadding, isCompact, topInset } = useResponsiveLayout();
  const {
    filteredListings,
    searchMode,
    searchQuery,
    setSearchQuery,
    setSearchMode,
    setCityQuery,
    setNeighborhoodQuery,
    clearSearch,
    setSelectedCategory,
    locationStatus,
    userLat,
    userLng,
    preferredRadius,
    requestLocation,
    clearLocation,
    setPreferredRadius,
  } = useDirectory();
  const { city, mode, q, neighborhood } = useLocalSearchParams<{
    city?: string;
    mode?: string;
    q?: string;
    neighborhood?: string;
  }>();
  useEffect(() => {
    const routeMode: SearchMode =
      mode === 'city' || mode === 'neighborhood' || mode === 'near-me'
        ? mode
        : typeof city === 'string'
          ? 'city'
          : 'food';
    const routeQuery =
      routeMode === 'city'
        ? (typeof city === 'string' ? city : '')
        : routeMode === 'neighborhood'
          ? (typeof neighborhood === 'string' ? neighborhood : '')
          : routeMode === 'food'
            ? (typeof q === 'string' ? q : '')
            : '';
    setSearchMode(routeMode);
    setSearchQuery(routeQuery);
    setCityQuery(routeMode === 'city' ? routeQuery : '');
    setNeighborhoodQuery(routeMode === 'neighborhood' ? routeQuery : '');
  }, [city, mode, q, neighborhood, setSearchMode, setSearchQuery, setCityQuery, setNeighborhoodQuery]);

  const handleModeChange = (nextMode: SearchMode) => {
    const nextQuery = nextMode === 'near-me' ? '' : searchQuery;
    setSearchMode(nextMode);
    setSearchQuery(nextQuery);
    setCityQuery(nextMode === 'city' ? nextQuery : '');
    setNeighborhoodQuery(nextMode === 'neighborhood' ? nextQuery : '');
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCityQuery(searchMode === 'city' ? value : '');
    setNeighborhoodQuery(searchMode === 'neighborhood' ? value : '');
  };

  const handleReset = () => {
    clearSearch();
    setSelectedCategory('all');
    clearLocation();
    setPreferredRadius(null);
    router.replace('/(tabs)/explore');
  };

  const locationGranted = locationStatus === 'granted' && userLat !== null && userLng !== null;
  const distanceActive = locationGranted && preferredRadius !== null;
  const hasSearchState =
    searchMode !== 'food' || searchQuery.length > 0 || locationGranted || preferredRadius !== null;

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
            paddingTop: topInset + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={[styles.titleRow, { paddingHorizontal: horizontalPadding }]}>
          <Text style={[styles.title, { color: colors.foreground, fontSize: isCompact ? 30 : 32 }]}>Explore</Text>
          {distanceActive && !isCompact && (
            <View style={[styles.distanceBadge, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="navigate" size={11} color={colors.primary} />
              <Text style={[styles.distanceBadgeText, { color: colors.primary }]}>
                {preferredRadius} mi
              </Text>
            </View>
          )}
          <Pressable
            onPress={() => router.push('/(tabs)/map')}
            style={({ pressed }) => [
              styles.mapButton,
              { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="View map"
            testID="explore-map-button"
          >
            <Feather name="map" size={19} color={colors.primary} />
            <Text style={[styles.mapButtonText, { color: colors.primary }]}>Map</Text>
          </Pressable>
        </View>

        <View style={[styles.searchWrap, { paddingHorizontal: horizontalPadding }]}>
          <SearchBar
            value={searchQuery}
            onChangeText={handleSearchChange}
            mode={searchMode}
            onModeChange={handleModeChange}
            editable={searchMode !== 'near-me'}
            placeholder={
              searchMode === 'food'
                ? 'Search food, name, or tags'
                : searchMode === 'city'
                  ? 'Search by city, e.g. Oakland'
                  : searchMode === 'neighborhood'
                    ? 'Search by neighborhood, e.g. Mission'
                    : 'Use the button below to find nearby places'
            }
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
        {hasSearchState && (
          <View style={[styles.resetWrap, { paddingHorizontal: horizontalPadding }]}>
            <Pressable
              onPress={handleReset}
              style={({ pressed }) => [styles.resetButton, { opacity: pressed ? 0.6 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Reset search and filters"
            >
              <Feather name="x-circle" size={14} color={colors.mutedForeground} />
              <Text style={[styles.resetText, { color: colors.mutedForeground }]}>Reset search</Text>
            </Pressable>
          </View>
        )}
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
          { paddingBottom: bottomTabPadding, paddingHorizontal: horizontalPadding },
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
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  mapButton: {
    marginLeft: 'auto',
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
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
    marginBottom: 6,
  },
  pillsWrap: {
    paddingBottom: 2,
  },
  nearMeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 2,
  },
  resetWrap: {
    alignItems: 'flex-end',
    paddingBottom: 8,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 3,
  },
  resetText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
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
    paddingTop: 12,
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
