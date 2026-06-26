import React from 'react';
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useDirectory } from '@/context/DirectoryContext';
import { FeaturedCard } from '@/components/FeaturedCard';
import { ListingCard } from '@/components/ListingCard';
import { CategoryPillRow } from '@/components/CategoryPill';
import { SAMPLE_LISTINGS } from '@/constants/data';

const LOCATION = 'San Francisco, CA';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { featuredListings, filteredListings } = useDirectory();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 100 : 90 }]}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background }]}>
          <View>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={14} color={colors.primary} />
              <Text style={[styles.locationLabel, { color: colors.primary }]}>Current Location</Text>
            </View>
            <Text style={[styles.locationCity, { color: colors.foreground }]}>{LOCATION}</Text>
          </View>
          <TouchableOpacity
            style={[styles.notifBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {}}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Hero heading */}
        <View style={styles.heroSection}>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>
            Find the best{'\n'}
            <Text style={{ color: colors.primary }}>places near you</Text>
          </Text>
        </View>

        {/* Search bar (tap to go to explore) */}
        <TouchableOpacity
          style={[styles.searchTap, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/explore')}
          activeOpacity={0.8}
        >
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <Text style={[styles.searchPlaceholder, { color: colors.mutedForeground }]}>
            Search restaurants, services...
          </Text>
          <View style={[styles.filterBtn, { backgroundColor: colors.primary }]}>
            <Feather name="sliders" size={14} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Featured listings */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Featured</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={featuredListings}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredList}
          renderItem={({ item }) => <FeaturedCard listing={item} />}
          scrollEnabled={featuredListings.length > 1}
        />

        {/* Categories */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Categories</Text>
        </View>
        <CategoryPillRow />

        {/* All listings */}
        <View style={[styles.sectionHeader, { marginTop: 20 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Nearby</Text>
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {filteredListings.length} places
          </Text>
        </View>

        <View style={styles.listSection}>
          {filteredListings.map((item) => (
            <ListingCard key={item.id} listing={item} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  locationCity: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    marginTop: 1,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    lineHeight: 36,
  },
  searchTap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  filterBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  seeAll: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  count: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  featuredList: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  listSection: {
    paddingHorizontal: 16,
  },
});
