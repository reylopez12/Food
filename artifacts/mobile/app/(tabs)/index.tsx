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
import { VideoShowcase } from '@/components/VideoShowcase';
import { HomeSpinWidget } from '@/components/HomeSpinWidget';

const LOCATION = 'San Francisco Bay Area';

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
            onPress={() => router.push('/(tabs)/notifications')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="View alerts"
          >
            <Ionicons name="notifications-outline" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Spin wheel — Hero */}
        <View style={styles.spinSection}>
          <HomeSpinWidget />
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <TouchableOpacity
            style={[styles.searchTap, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.foreground }]}
            onPress={() => router.push('/(tabs)/explore')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Search places"
          >
            <Feather name="search" size={20} color={colors.mutedForeground} />
            <Text style={[styles.searchPlaceholder, { color: colors.mutedForeground }]}>
              Tacos, sourdough, bao, pasta...
            </Text>
            <View style={[styles.searchAction, { backgroundColor: colors.primary }]}>
              <Text style={styles.searchActionText}>Search</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Video Showcase */}
        <View style={styles.videoSection}>
          <VideoShowcase />
        </View>

        {/* Categories */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Browse by Category</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
            Find exactly the kind of experience you're craving.
          </Text>
        </View>
        <View style={styles.categoriesSection}>
          <CategoryPillRow />
        </View>

        {/* Featured listings */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderTop}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Featured Places</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/explore')} activeOpacity={0.6} style={styles.seeAllBtn}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
              <Feather name="arrow-right" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
            Iconic spots that define Bay Area dining.
          </Text>
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

        {/* All listings */}
        <View style={[styles.sectionHeader, { marginTop: 12 }]}>
          <View style={styles.sectionHeaderTop}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>More to Discover</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/explore')} activeOpacity={0.6} style={styles.seeAllBtn}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>Explore</Text>
              <Feather name="arrow-right" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
            Hidden gems and neighborhood favorites.
          </Text>
        </View>

        <View style={styles.listSection}>
          {filteredListings.slice(0, 5).map((item) => (
            <ListingCard key={item.id} listing={item} />
          ))}
          <TouchableOpacity
            style={[styles.viewAllBtn, { borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/explore')}
            activeOpacity={0.7}
          >
            <Text style={[styles.viewAllText, { color: colors.foreground }]}>View all {filteredListings.length} places</Text>
          </TouchableOpacity>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationCity: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  spinSection: {
    marginBottom: 24,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  searchTap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  searchAction: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchActionText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  videoSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 4,
  },
  seeAll: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  categoriesSection: {
    marginBottom: 36,
  },
  featuredList: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  listSection: {
    paddingHorizontal: 20,
  },
  viewAllBtn: {
    marginTop: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
  },
  viewAllText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
});
