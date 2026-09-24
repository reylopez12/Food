import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path, G, Text as SvgText, Circle } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import {
  RADIUS_OPTIONS,
  hasValidCoordinates,
  haversineDistanceMi,
  useDirectory,
  type RadiusMiles,
} from '@/context/DirectoryContext';
import type { Venue as Listing } from '@workspace/api-client-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type SpinItem = { id: string; name: string; color: string; distanceMi?: number };

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_SLOTS      = 10;
const SPIN_ROTATIONS = 8;
const SPIN_DURATION  = 4200;
const WHEEL_SIZE     = 260;
const WHEEL_PAD      = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function polarXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(cx: number, cy: number, radius: number, startDeg: number, endDeg: number): string {
  const s = polarXY(cx, cy, radius, startDeg);
  const e = polarXY(cx, cy, radius, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${cx} ${cy}`,
    `L ${s.x} ${s.y}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`,
    'Z',
  ].join(' ');
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HomeSpinWidget() {
  const colors = useColors();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const {
    listings: allListings,
    locationStatus,
    userLat,
    userLng,
    preferredRadius,
    requestLocation,
    clearLocation,
    setPreferredRadius,
  } = useDirectory();

  const [seed,     setSeed]     = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner,   setWinner]   = useState<SpinItem | null>(null);

  const currentRotation = useRef(0);
  const spinAnim        = useRef(new Animated.Value(0)).current;

  const rotateStr = spinAnim.interpolate({
    inputRange:  [-360_000, 360_000],
    outputRange: ['-360000deg', '360000deg'],
  });

  const locationReady =
    locationStatus === 'granted' &&
    userLat !== null &&
    userLng !== null &&
    preferredRadius !== null;

  // Show random directory picks by default; opt-in location and radius narrow them to nearby spots.
  const spinItems = useMemo<SpinItem[]>(() => {
    if (!locationReady) {
      return shuffled(
        allListings.map((listing) => ({
          id: listing.id,
          name: listing.name,
          color: listing.color,
        })),
      ).slice(0, MAX_SLOTS);
    }
    return shuffled(
      allListings.flatMap((listing) => {
        if (!hasValidCoordinates(listing.lat, listing.lng)) return [];
        const distanceMi = haversineDistanceMi(
          userLat,
          userLng,
          listing.lat,
          listing.lng,
        );
        if (distanceMi > preferredRadius) return [];
        return [{
          id: listing.id,
          name: listing.name,
          color: listing.color,
          distanceMi,
        }];
      }),
    ).slice(0, MAX_SLOTS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allListings, locationReady, preferredRadius, seed, userLat, userLng]);

  const wheelSize = Math.min(WHEEL_SIZE, Math.max(200, width - WHEEL_PAD * 2 - 16));
  const cx = wheelSize / 2;
  const cy = wheelSize / 2;
  const radius = wheelSize / 2 - 4;
  const wheelScale = wheelSize / WHEEL_SIZE;
  const sliceDeg = spinItems.length > 0 ? 360 / spinItems.length : 360;
  const fontSize = Math.min(11, Math.max(8, (wheelSize * 0.54) / Math.max(spinItems.length, 1)));

  useEffect(() => () => { spinAnim.stopAnimation(); }, [spinAnim]);

  const resetWheel = () => {
    spinAnim.stopAnimation();
    spinAnim.setValue(0);
    currentRotation.current = 0;
  };

  const handleReshuffle = () => {
    if (spinning) return;
    resetWheel();
    setWinner(null);
    setSeed(s => s + 1);
  };

  const handleReset = () => {
    if (spinning) return;
    setWinner(null);
  };

  const handleLocationRequest = () => {
    if (spinning) return;
    resetWheel();
    setWinner(null);
    void requestLocation();
  };

  const handleLocationClear = () => {
    if (spinning) return;
    resetWheel();
    setWinner(null);
    clearLocation();
  };

  const handleRadiusChange = (nextRadius: RadiusMiles) => {
    if (spinning) return;
    resetWheel();
    setWinner(null);
    setPreferredRadius(nextRadius);
  };

  const handleSpin = () => {
    if (spinning || spinItems.length === 0) return;
    setSpinning(true);
    setWinner(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const n         = spinItems.length;
    const winnerIdx = Math.floor(Math.random() * n);

    const targetNorm  = ((-(winnerIdx + 0.5) * sliceDeg) % 360 + 360) % 360;
    const currentNorm = ((currentRotation.current % 360) + 360) % 360;
    let delta = targetNorm - currentNorm;
    if (delta < 0.01) delta += 360;

    const newTotal = currentRotation.current + delta + (SPIN_ROTATIONS - 1) * 360;
    currentRotation.current = newTotal;
    const snapshot = spinItems.slice();

    Animated.timing(spinAnim, {
      toValue:         newTotal,
      duration:        SPIN_DURATION,
      easing:          Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      setSpinning(false);
      if (!finished) return;
      setWinner(snapshot[winnerIdx]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  };

  const winnerListing: Listing | undefined = winner
    ? allListings.find(l => l.id === winner.id)
    : undefined;

  return (
    <View style={[styles.container]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.subtitle, { color: colors.foreground }]}>
          NOT SURE WHAT YOU'RE CRAVING?
        </Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Let the city pick.</Text>
      </View>

      {/* Wheel */}
      <View style={[styles.wheelWrap, { width: wheelSize + WHEEL_PAD * 2, height: wheelSize + WHEEL_PAD * 2 }]}>
        {/* Pointer */}
        <View style={styles.pointerWrap} pointerEvents="none">
          <View style={[styles.pointerTriangle, { borderTopColor: colors.foreground }]} />
        </View>

        <Animated.View
          style={[
            styles.wheelAnim,
            { width: wheelSize, height: wheelSize, transform: [{ rotate: rotateStr }] },
          ]}
        >
          <Svg width={wheelSize} height={wheelSize}>
            {/* Outer cream ring */}
            <Circle cx={cx} cy={cy} r={radius + 4} fill={colors.primaryForeground} />
            {/* Inner dark ring */}
            <Circle cx={cx} cy={cy} r={radius} fill={colors.foreground} />

            {spinItems.length === 0 ? (
              <Circle cx={cx} cy={cy} r={radius - 6} fill={colors.muted} />
            ) : (
              spinItems.map((item, i) => {
                const startDeg = -90 + i * sliceDeg;
                const endDeg   = startDeg + sliceDeg;
                const midDeg   = startDeg + sliceDeg / 2;
                const label    = item.name.length > 11
                  ? item.name.slice(0, 10) + '…'
                  : item.name;
                return (
                  <G key={item.id}>
                    <Path
                      d={slicePath(cx, cy, radius, startDeg, endDeg)}
                      fill={item.color}
                      stroke={colors.foreground}
                      strokeWidth={1}
                    />
                    <G transform={`rotate(${midDeg} ${cx} ${cy})`}>
                      <SvgText
                        x={cx + radius * 0.72}
                        y={cy}
                        textAnchor="end"
                        fill={colors.foreground}
                        fontSize={fontSize}
                        fontWeight="bold"
                        dy="0.35em"
                      >
                        {label}
                      </SvgText>
                    </G>
                  </G>
                );
              })
            )}
            {/* Center Rings */}
            <Circle cx={cx} cy={cy} r={46 * wheelScale} fill={colors.primaryForeground} />
            <Circle cx={cx} cy={cy} r={40 * wheelScale} fill={colors.foreground} />
            <Circle cx={cx} cy={cy} r={12 * wheelScale} fill={colors.primaryForeground} />
          </Svg>
        </Animated.View>
      </View>

      {/* Buttons */}
      <View style={styles.btnRow}>
        <Pressable
          onPress={handleSpin}
          disabled={spinning || spinItems.length === 0}
          style={({ pressed }) => [
            styles.spinBtn,
            {
              backgroundColor: colors.background,
              opacity: pressed ? 0.82 : spinning || spinItems.length === 0 ? 0.5 : 1,
            },
          ]}
        >
          {spinning ? (
            <Text style={[styles.spinBtnText, { color: colors.primary }]}>Spinning…</Text>
          ) : (
            <Text style={[styles.spinBtnText, { color: colors.primary }]}>SPIN FOR A SPOT</Text>
          )}
        </Pressable>
        <Pressable
          onPress={handleReshuffle}
          disabled={spinning}
          style={({ pressed }) => [
            styles.utilityBtn,
            {
              borderColor: colors.background + '80',
              opacity: pressed || spinning ? 0.55 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Choose a new selection"
        >
          <Feather name="refresh-cw" size={15} color={colors.foreground} />
          <Text style={[styles.utilityBtnText, { color: colors.foreground }]}>New selection</Text>
        </Pressable>
        {winner && !spinning && (
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [
              styles.utilityBtn,
              { borderColor: colors.background + '80', opacity: pressed ? 0.65 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Reset the meal picker"
          >
            <Feather name="rotate-ccw" size={15} color={colors.foreground} />
            <Text style={[styles.utilityBtnText, { color: colors.foreground }]}>Reset</Text>
          </Pressable>
        )}
      </View>

      {/* Location + radius settings under the wheel, blended in */}
      <View style={[styles.locationPanel]}>
        <View style={styles.locationTop}>
          <View style={[styles.locationIcon, { backgroundColor: colors.background + '20' }]}>
            <Feather name="navigation" size={15} color={colors.foreground} />
          </View>
          <View style={styles.locationCopy}>
            <Text style={[styles.locationTitle, { color: colors.foreground }]}>
              {locationStatus === 'granted' ? 'Using your current location' : 'Find a meal near you'}
            </Text>
            <Text style={[styles.locationText, { color: colors.foreground, opacity: 0.8 }]}>
              {locationStatus === 'requesting'
                ? 'Getting your location…'
                : locationStatus === 'denied'
                  ? 'Location denied. Allow access and try again.'
                  : locationStatus === 'unavailable'
                    ? 'Location is unavailable on this device.'
                      : locationStatus === 'granted'
                        ? 'Choose a distance to focus picks nearby.'
                        : 'Spin random directory picks, or use location for nearby spots.'}
            </Text>
          </View>
        </View>

        {locationStatus === 'granted' ? (
          <View style={styles.locationActions}>
            <Pressable
              testID="home-spin-refresh-location"
              onPress={handleLocationRequest}
              disabled={spinning}
              style={({ pressed }) => [
                styles.smallAction,
                { borderColor: colors.background + '40', opacity: pressed || spinning ? 0.55 : 1 },
              ]}
            >
              <Feather name="refresh-cw" size={12} color={colors.foreground} />
              <Text style={[styles.smallActionText, { color: colors.foreground }]}>Refresh</Text>
            </Pressable>
            <Pressable
              testID="home-spin-clear-location"
              onPress={handleLocationClear}
              disabled={spinning}
              style={({ pressed }) => [
                styles.smallAction,
                { borderColor: colors.background + '40', opacity: pressed || spinning ? 0.55 : 1 },
              ]}
            >
              <Text style={[styles.smallActionText, { color: colors.foreground, opacity: 0.8 }]}>Clear</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            testID="home-spin-use-location"
            onPress={handleLocationRequest}
            disabled={spinning || locationStatus === 'requesting' || locationStatus === 'unavailable'}
            style={({ pressed }) => [
              styles.useLocationBtn,
              {
                backgroundColor: colors.background,
                opacity:
                  pressed || spinning || locationStatus === 'requesting' || locationStatus === 'unavailable'
                    ? 0.55
                    : 1,
              },
            ]}
          >
            <Feather name="navigation" size={13} color={colors.primary} />
            <Text style={[styles.useLocationText, { color: colors.primary }]}>
              {locationStatus === 'requesting' ? 'Locating…' : 'Use my location'}
            </Text>
          </Pressable>
        )}

        <View style={styles.radiusRow}>
          {RADIUS_OPTIONS.map((option) => {
            const active = preferredRadius === option;
            return (
              <Pressable
                key={option}
                testID={`home-spin-radius-${option}`}
                onPress={() => handleRadiusChange(option)}
                disabled={spinning}
                style={({ pressed }) => [
                  styles.radiusPill,
                  {
                    backgroundColor: active ? colors.foreground : 'transparent',
                    borderColor: active ? colors.foreground : colors.background + '40',
                    opacity: pressed || spinning ? 0.6 : 1,
                  },
                ]}
              >
                <Text style={[styles.radiusText, { color: active ? colors.background : colors.foreground }]}>
                  {option} mi
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Result card */}
      {winner && !spinning && (
        <View style={[styles.result, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.resultAccent, { backgroundColor: winner.color }]} />
          <View style={styles.resultInner}>
            {winnerListing ? (
              <>
                <View style={styles.resultTop}>
                  <View style={[styles.initials, { backgroundColor: winnerListing.color }]}>
                    <Text style={styles.initialsText}>{winnerListing.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resultName, { color: colors.foreground }]} numberOfLines={1}>
                      {winnerListing.name}
                    </Text>
                    <View style={styles.resultMeta}>
                      <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                      <Text
                        style={[styles.resultMetaText, { color: colors.mutedForeground }]}
                        numberOfLines={1}
                      >
                        {winnerListing.neighborhood} · {winnerListing.city}
                      </Text>
                    </View>
                  </View>
                  {winnerListing.reviewCount > 0 && (
                    <View style={styles.ratingRow}>
                      <Feather name="star" size={12} color={colors.accent} />
                      <Text style={[styles.ratingText, { color: colors.foreground }]}>{winnerListing.rating}</Text>
                    </View>
                  )}
                </View>
                {winner.distanceMi !== undefined && (
                  <View style={[styles.distanceRow, { backgroundColor: colors.primary + '12' }]}>
                    <Feather name="navigation" size={11} color={colors.primary} />
                    <Text style={[styles.distanceText, { color: colors.primary }]}>
                      {winner.distanceMi < 0.1 ? '< 0.1 mi away' : `${winner.distanceMi.toFixed(1)} mi away`}
                    </Text>
                  </View>
                )}
                <Text style={[styles.resultDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {winnerListing.description}
                </Text>
                <Pressable
                  onPress={() => router.push(`/listing/${winnerListing!.id}`)}
                  style={({ pressed }) => [
                    styles.ctaBtn,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 },
                  ]}
                >
                  <Text style={styles.ctaText}>View full listing</Text>
                  <Feather name="arrow-right" size={15} color="#fff" />
                </Pressable>
              </>
            ) : (
              <View style={styles.simpleResult}>
                <View style={[styles.simpleDot, { backgroundColor: winner.color }]}>
                  <Text style={styles.simpleDotText}>{winner.name.slice(0, 2).toUpperCase()}</Text>
                </View>
                <Text style={[styles.simpleLabel, { color: colors.mutedForeground }]}>The wheel chose</Text>
                <Text style={[styles.simpleName, { color: colors.foreground }]}>{winner.name}</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: 0,
    borderWidth: 0,
    overflow: 'visible',
    paddingBottom: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  header: {
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 26,
    fontFamily: 'PlayfairDisplay_700Bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1.5,
  },
  locationPanel: {
    marginHorizontal: 20,
    marginTop: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
  },
  locationTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCopy: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Inter_400Regular',
  },
  locationActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  smallAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  smallActionText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  useLocationBtn: {
    minHeight: 38,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  useLocationText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  radiusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  radiusPill: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  radiusText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  wheelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  pointerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  pointerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth:  12,
    borderRightWidth: 12,
    borderTopWidth:   24,
    borderLeftColor:  'transparent',
    borderRightColor: 'transparent',
    marginTop: -8,
  },
  wheelAnim: {
    shadowColor:   '#000',
    shadowOpacity: 0.2,
    shadowRadius:  20,
    shadowOffset:  { width: 0, height: 10 },
    elevation: 8,
  },
  btnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  spinBtn: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 100,
  },
  spinBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
  },
  utilityBtn: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 100,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  utilityBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  result: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  resultAccent: { height: 4 },
  resultInner:  { padding: 16 },
  resultTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    minWidth: 0,
  },
  initials: {
    width: 46,
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  initialsText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  resultName: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay_700Bold',
    marginBottom: 3,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minWidth: 0,
  },
  resultMetaText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    flexShrink: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  resultDesc: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
    marginBottom: 14,
  },
  distanceRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 10,
  },
  distanceText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    borderRadius: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  simpleResult: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  simpleDot: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleDotText: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  simpleLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  simpleName: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_700Bold',
    textAlign: 'center',
  },
});
