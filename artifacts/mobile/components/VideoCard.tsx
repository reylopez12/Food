/**
 * VideoCard — animated commercial promo card for mobile listing detail.
 * Uses React Native's built-in Animated API (no Reanimated dependency).
 *
 * Phases (looping ~13 s cycle):
 *   black → intro → dish slam → descriptors → tagline → hold → fadeout
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Venue as Listing } from '@workspace/api-client-react';

type Phase = 'black' | 'intro' | 'dish' | 'descriptors' | 'tagline' | 'hold' | 'fadeout';
const PHASE_ORDER: Phase[] = ['black', 'intro', 'dish', 'descriptors', 'tagline', 'hold', 'fadeout'];
const PHASE_DURATIONS: Record<Phase, number> = {
  black:        700,
  intro:        1500,
  dish:         2000,
  descriptors:  3000,
  tagline:      2500,
  hold:         2000,
  fadeout:      1000,
};

interface VideoCardProps {
  listing: Listing;
}

export function VideoCard({ listing }: VideoCardProps) {
  const video = listing.video!;
  const accent = video.accentColor;
  const bg = listing.color;

  const [phase, setPhase] = useState<Phase>('black');
  const [cycle, setCycle] = useState(0);
  const [playing, setPlaying] = useState(true);

  // Animated values
  const bgOpacity    = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const introOpacity = useRef(new Animated.Value(0)).current;
  const introY       = useRef(new Animated.Value(12)).current;
  const dishScale    = useRef(new Animated.Value(0.6)).current;
  const dishOpacity  = useRef(new Animated.Value(0)).current;
  const desc1Opacity = useRef(new Animated.Value(0)).current;
  const desc2Opacity = useRef(new Animated.Value(0)).current;
  const desc3Opacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  const resetAnimValues = useCallback(() => {
    bgOpacity.setValue(0);
    overlayOpacity.setValue(1);
    introOpacity.setValue(0);
    introY.setValue(12);
    dishScale.setValue(0.6);
    dishOpacity.setValue(0);
    desc1Opacity.setValue(0);
    desc2Opacity.setValue(0);
    desc3Opacity.setValue(0);
    taglineOpacity.setValue(0);
  }, []);

  useEffect(() => {
    if (!playing) return;

    resetAnimValues();
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const trackedDelay = (ms: number) =>
      new Promise<void>(resolve => {
        const t = setTimeout(resolve, ms);
        timers.push(t);
      });

    const run = async () => {
      // black → show bg
      setPhase('black');
      await trackedDelay(100);
      if (cancelled) return;
      Animated.timing(bgOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      Animated.timing(overlayOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start();

      await trackedDelay(PHASE_DURATIONS.black);
      if (cancelled) return;

      // intro
      setPhase('intro');
      Animated.parallel([
        Animated.timing(introOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(introY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
      await trackedDelay(PHASE_DURATIONS.intro);
      if (cancelled) return;

      // dish
      setPhase('dish');
      Animated.parallel([
        Animated.timing(dishOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(dishScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }),
      ]).start();
      await trackedDelay(PHASE_DURATIONS.dish);
      if (cancelled) return;

      // descriptors
      setPhase('descriptors');
      Animated.stagger(150, [
        Animated.timing(desc1Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(desc2Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(desc3Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      await trackedDelay(PHASE_DURATIONS.descriptors);
      if (cancelled) return;

      // tagline
      setPhase('tagline');
      Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      await trackedDelay(PHASE_DURATIONS.tagline);
      if (cancelled) return;

      // hold
      setPhase('hold');
      await trackedDelay(PHASE_DURATIONS.hold);
      if (cancelled) return;

      // fadeout → loop
      setPhase('fadeout');
      Animated.timing(overlayOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      await trackedDelay(PHASE_DURATIONS.fadeout);
      if (cancelled) return;

      setCycle(c => c + 1);
    };

    run();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [playing, cycle]);

  const descOpacities = [desc1Opacity, desc2Opacity, desc3Opacity];

  return (
    <View style={styles.wrapper}>
      {/* Background */}
      <Animated.View style={[styles.bg, { backgroundColor: bg, opacity: bgOpacity }]} />

      {/* Diagonal stripe */}
      <View style={styles.stripeContainer} pointerEvents="none">
        <View style={[styles.stripe, { backgroundColor: accent }]} />
      </View>

      {/* Fade-to-black overlay */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />

      {/* Content */}
      <View style={styles.content}>
        {/* Top: intro */}
        <Animated.View style={{ opacity: introOpacity, transform: [{ translateY: introY }] }}>
          <Text style={[styles.neighborhoodText, { color: accent }]}>
            {listing.neighborhood} · {listing.city}
          </Text>
          <Text style={styles.restaurantName}>{listing.name}</Text>
        </Animated.View>

        {/* Center: dish */}
        <Animated.View
          style={[
            styles.dishContainer,
            { opacity: dishOpacity, transform: [{ scale: dishScale }] },
          ]}
        >
          <Text style={styles.dishText}>{video.dish}</Text>
        </Animated.View>

        {/* Bottom: descriptors + tagline */}
        <View style={styles.bottom}>
          <View style={styles.descriptorsRow}>
            {video.descriptors.map((d, i) => (
              <Animated.View
                key={i}
                style={[styles.descriptorPill, { opacity: descOpacities[i] }]}
              >
                <Text style={styles.descriptorText}>{d}</Text>
              </Animated.View>
            ))}
          </View>
          <Animated.Text style={[styles.tagline, { opacity: taglineOpacity, color: accent }]}>
            "{video.tagline}"
          </Animated.Text>
        </View>
      </View>

      {/* LIVE badge */}
      <View style={styles.liveBadge}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LIVE</Text>
      </View>

      {/* Pause / resume tap */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => setPlaying(p => !p)}
        accessibilityLabel={playing ? 'Pause animation' : 'Resume animation'}
      />
    </View>
  );
}

function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  stripeContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    opacity: 0.12,
  },
  stripe: {
    position: 'absolute',
    width: '200%',
    height: '60%',
    bottom: '-10%',
    left: '-50%',
    transform: [{ rotate: '-8deg' }],
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 10,
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    zIndex: 5,
  },
  neighborhoodText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  restaurantName: {
    fontSize: 15,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: '#fff',
  },
  dishContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  dishText: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  bottom: {
    gap: 8,
  },
  descriptorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  descriptorPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  descriptorText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  tagline: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    fontStyle: 'italic',
  },
  liveBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    zIndex: 15,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  liveText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
  },
});
