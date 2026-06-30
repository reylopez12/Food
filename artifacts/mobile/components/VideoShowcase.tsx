/**
 * VideoShowcase — "Now Playing" dark-panel carousel for the mobile home screen.
 * Cycles through all hasVideo listings with auto-advance and dot indicators.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SAMPLE_LISTINGS } from '@/constants/data';
import { VideoCard } from '@/components/VideoCard';

const VIDEO_LISTINGS = SAMPLE_LISTINGS.filter(l => l.hasVideo && l.video);
const AUTO_ADVANCE_MS = 14000;

export function VideoShowcase() {
  const [activeIdx, setActiveIdx] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  if (VIDEO_LISTINGS.length === 0) return null;

  const goTo = useCallback((idx: number) => {
    const next = ((idx % VIDEO_LISTINGS.length) + VIDEO_LISTINGS.length) % VIDEO_LISTINGS.length;
    setActiveIdx(next);
    flatListRef.current?.scrollToIndex({ index: next, animated: true });
  }, []);

  useEffect(() => {
    const t = setInterval(() => goTo(activeIdx + 1), AUTO_ADVANCE_MS);
    return () => clearInterval(t);
  }, [activeIdx, goTo]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.nowPlayingRow}>
          <View style={styles.liveDot} />
          <Text style={styles.nowPlayingLabel}>NOW PLAYING</Text>
        </View>
        <Text style={styles.title}>Dish Showcases</Text>
        <Text style={styles.subtitle}>
          The signature dishes that put these Bay Area spots on the map — animated.
        </Text>
      </View>

      {/* Carousel */}
      <FlatList
        ref={flatListRef}
        data={VIDEO_LISTINGS}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
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
        {VIDEO_LISTINGS.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)} hitSlop={8}>
            <View
              style={[
                styles.dot,
                {
                  width: i === activeIdx ? 20 : 6,
                  backgroundColor: i === activeIdx ? '#F59E0B' : 'rgba(255,255,255,0.25)',
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
    backgroundColor: '#080c14',
    paddingTop: 20,
    paddingBottom: 24,
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
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
    backgroundColor: '#ef4444',
  },
  nowPlayingLabel: {
    color: '#f87171',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.45)',
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
