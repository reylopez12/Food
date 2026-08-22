/**
 * VideoShowcase — "Now Playing" dark-panel carousel for the mobile home screen.
 * Cycles through all hasVideo listings with auto-advance and dot indicators.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDirectory } from '@/context/DirectoryContext';
import { useColors } from '@/hooks/useColors';
import { VideoCard } from '@/components/VideoCard';

const AUTO_ADVANCE_MS = 14000;

export function VideoShowcase() {
  const { listings } = useDirectory();
  const colors = useColors();
  const videoListings = listings.filter(l => l.hasVideo && l.video);

  const [activeIdx, setActiveIdx] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const goTo = useCallback((idx: number) => {
    if (videoListings.length === 0) return;
    const next = ((idx % videoListings.length) + videoListings.length) % videoListings.length;
    setActiveIdx(next);
    flatListRef.current?.scrollToIndex({ index: next, animated: true });
  }, [videoListings.length]);

  useEffect(() => {
    if (videoListings.length === 0) return;
    const t = setInterval(() => goTo(activeIdx + 1), AUTO_ADVANCE_MS);
    return () => clearInterval(t);
  }, [activeIdx, goTo, videoListings.length]);

  if (videoListings.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background === '#F6F1E7' ? '#232733' : colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.nowPlayingRow}>
          <View style={[styles.liveDot, { backgroundColor: colors.destructive }]} />
          <Text style={[styles.nowPlayingLabel, { color: colors.primary }]}>NOW PLAYING</Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground === '#232733' ? '#F6F1E7' : colors.foreground }]}>
          Dish Showcases
        </Text>
        <Text style={[styles.subtitle, { color: 'rgba(246,241,231,0.5)' }]}>
          The signature dishes that put these Bay Area spots on the map — animated.
        </Text>
      </View>

      {/* Carousel */}
      <FlatList
        ref={flatListRef}
        data={videoListings}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={true}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP));
          setActiveIdx(idx);
        }}
        contentContainerStyle={styles.carouselContent}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <VideoCard listing={item} />
          </View>
        )}
        getItemLayout={(_, index) => ({
          length: CARD_WIDTH + CARD_GAP,
          offset: (CARD_WIDTH + CARD_GAP) * index,
          index,
        })}
      />

      {/* Dot indicators */}
      <View style={styles.dots}>
        {videoListings.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)} hitSlop={8}>
            <View
              style={[
                styles.dot,
                {
                  width: i === activeIdx ? 20 : 6,
                  backgroundColor: i === activeIdx ? colors.secondary : 'rgba(246,241,231,0.25)',
                },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const CARD_WIDTH = 320;
const CARD_GAP = 0;

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(246,241,231,0.07)',
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  nowPlayingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  nowPlayingLabel: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
  },
  title: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay_700Bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  carouselContent: {
    paddingHorizontal: 20,
    gap: 0,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
