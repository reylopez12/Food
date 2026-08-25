import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useDirectory } from '@/context/DirectoryContext';
import { ListingCard } from '@/components/ListingCard';

export default function SavedScreen() {
  const colors = useColors();
  const { bottomTabPadding, horizontalPadding, topInset } = useResponsiveLayout();
  const { savedListings } = useDirectory();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12, paddingHorizontal: horizontalPadding }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Saved</Text>
        {savedListings.length > 0 && (
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {savedListings.length} {savedListings.length === 1 ? 'place' : 'places'}
          </Text>
        )}
      </View>

      <FlatList
        data={savedListings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListingCard listing={item} />}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomTabPadding, paddingHorizontal: horizontalPadding, flexGrow: 1 },
        ]}
        scrollEnabled={!!savedListings.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Ionicons name="bookmark-outline" size={36} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No saved places</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Tap the bookmark icon on any listing to save it here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  count: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  list: {
    paddingTop: 12,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
});
