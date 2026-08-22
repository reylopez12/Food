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
        {/* Header Area */}
        <View style={[styles.heroBlock, { paddingTop: topPad, backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <View>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={12} color={colors.primary} />
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

          <View style={styles.heroCopy}>
            <View style={styles.tagLine}>
              <View style={[styles.tagDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.tagText, { color: colors.primary }]}>INDEPENDENT FOOD, CLOSE BY</Text>
            </View>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>
              good food,{'\n'}close to home.
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
              Find the family-run counters, late-night windows, and neighborhood gems that make the city taste like itself.
            </Text>
          </View>

          {/* Search bar */}
          <View style={styles.searchContainer}>
            <TouchableOpacity
              style={[styles.searchTap, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/(tabs)/explore')}
              activeOpacity={0.8}
            >
              <Feather name="search" size={18} color={colors.foreground} />
              <Text style={[styles.searchPlaceholder, { color: colors.foreground, opacity: 0.6 }]}>
                Try "tacos", "Mission"...
              </Text>
              <View style={[styles.searchAction, { backgroundColor: colors.primary }]}>
                <Text style={[styles.searchActionText, { color: colors.primaryForeground }]}>Find food</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.searchMeta}>
              <Text style={[styles.searchMetaLabel, { color: colors.secondary }]}>
                SEARCHING AROUND
              </Text>
              <View style={[styles.searchMetaPill, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.searchMetaPillText, { color: colors.secondaryForeground }]}>
                  Near you
                </Text>
              </View>
              <Text style={[styles.searchMetaText, { color: colors.mutedForeground }]}>
                Mission
              </Text>
            </View>
          </View>
        </View>

        {/* Spin wheel — Hero */}
        <View style={[styles.spinSection, { backgroundColor: colors.primary }]}>
          <View style={styles.spinSectionInner}>
            <HomeSpinWidget />
          </View>
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
  heroBlock: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  locationCity: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginTop: 2,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroCopy: {
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 28,
  },
  tagLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: 46,
    fontFamily: 'PlayfairDisplay_700Bold',
    lineHeight: 52,
    letterSpacing: -1,
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
    paddingRight: 20,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchTap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
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
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  searchMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 6,
  },
  searchMetaLabel: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  searchMetaPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  searchMetaPillText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  searchMetaText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  spinSection: {
    paddingTop: 32,
    paddingBottom: 40,
    marginBottom: 32,
  },
  spinSectionInner: {
    // any internal padding if needed
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
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_700Bold',
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
