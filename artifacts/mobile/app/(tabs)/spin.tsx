import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path, G, Text as SvgText, Circle } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import {
  RADIUS_OPTIONS,
  hasValidCoordinates,
  haversineDistanceMi,
  useDirectory,
  type RadiusMiles,
} from '@/context/DirectoryContext';
import type { Venue as Listing } from '@workspace/api-client-react';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal item the wheel needs from either source */
type SpinItem = { id: string; name: string; color: string; distanceMi?: number };

type Mode     = 'directory' | 'custom';
type FilterId = 'all' | 'restaurants' | 'food-trucks';
type PriceId  = 'all' | '$' | '$$' | '$$$';

const FILTER_OPTIONS: { id: FilterId; label: string }[] = [
  { id: 'all',          label: 'All' },
  { id: 'restaurants',  label: 'Restaurants' },
  { id: 'food-trucks',  label: 'Food Trucks' },
];

const PRICE_OPTIONS: { id: PriceId; label: string }[] = [
  { id: 'all', label: 'Any price' },
  { id: '$',   label: '$' },
  { id: '$$',  label: '$$' },
  { id: '$$$', label: '$$$' },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const CUSTOM_COLORS = [
  '#E07552', '#F3B944', '#10B981', '#EF4444', '#8B5CF6', '#EC4899',
];
const MAX_CUSTOM = 6;

const SPIN_ROTATIONS = 8;
const SPIN_DURATION  = 4200;
const MAX_DIR_SLOTS  = 10;
const WHEEL_SIZE     = 300;

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const CX             = WHEEL_SIZE / 2;
const CY             = WHEEL_SIZE / 2;
const R              = WHEEL_SIZE / 2 - 4;

// ─── SVG helpers ─────────────────────────────────────────────────────────────

function polarXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(startDeg: number, endDeg: number): string {
  const s = polarXY(CX, CY, R, startDeg);
  const e = polarXY(CX, CY, R, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${CX} ${CY}`,
    `L ${s.x} ${s.y}`,
    `A ${R} ${R} 0 ${largeArc} 1 ${e.x} ${e.y}`,
    'Z',
  ].join(' ');
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SpinScreen() {
  const colors  = useColors();
  const router  = useRouter();
  const { bottomTabPadding, horizontalPadding, topInset, width } = useResponsiveLayout();

  const [mode,     setMode]     = useState<Mode>('directory');
  const [filter,   setFilter]   = useState<FilterId>('all');
  const [price,    setPrice]    = useState<PriceId>('all');
  const [spinning, setSpinning] = useState(false);
  const [winner,   setWinner]   = useState<SpinItem | null>(null);
  const [dirSeed,  setDirSeed]  = useState(0);

  // Custom entries — array of 6 strings (empty = unused slot)
  const [customEntries, setCustomEntries] = useState<string[]>(
    Array(MAX_CUSTOM).fill('')
  );

  // Result card animation
  const resultOpacity    = useRef(new Animated.Value(0)).current;
  const resultTranslateY = useRef(new Animated.Value(24)).current;

  // Accumulated rotation
  const currentRotation = useRef(0);
  const spinAnim        = useRef(new Animated.Value(0)).current;

  const rotateStr = spinAnim.interpolate({
    inputRange:  [-360_000, 360_000],
    outputRange: ['-360000deg', '360000deg'],
  });

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
  const locationReady =
    locationStatus === 'granted' &&
    userLat !== null &&
    userLng !== null &&
    preferredRadius !== null;

  const nearbyListings = useMemo(() => {
    if (!locationReady) return [] as Array<{ listing: Listing; distanceMi: number }>;

    return allListings.flatMap((listing) => {
      if (!hasValidCoordinates(listing.lat, listing.lng)) return [];
      const distanceMi = haversineDistanceMi(
        userLat,
        userLng,
        listing.lat,
        listing.lng,
      );
      return distanceMi <= preferredRadius ? [{ listing, distanceMi }] : [];
    });
  }, [allListings, locationReady, preferredRadius, userLat, userLng]);

  // Distance is applied before random selection, so every wheel slot is in range.
  const directoryItems: SpinItem[] = useMemo(() => {
    const filtered = nearbyListings
      .filter(
        ({ listing }) =>
          (filter === 'all' || listing.category === filter) &&
          (price === 'all' || listing.priceRange === price),
      )
      .map(({ listing, distanceMi }) => ({
        id: listing.id,
        name: listing.name,
        color: listing.color,
        distanceMi,
      }));
    return shuffled(filtered).slice(0, MAX_DIR_SLOTS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearbyListings, filter, price, dirSeed]);

  const customItems: SpinItem[] = customEntries
    .map((name, i) => ({ id: `custom-${i}`, name: name.trim(), color: CUSTOM_COLORS[i] }))
    .filter((e) => e.name.length > 0);

  const spinItems = mode === 'directory' ? directoryItems : customItems;

  const sliceDeg = spinItems.length > 0 ? 360 / spinItems.length : 360;
  const fontSize = Math.min(12, Math.max(8, 160 / Math.max(spinItems.length, 1)));
  const wheelScale = Math.min(1, (width - 32) / (WHEEL_SIZE + WHEEL_PAD * 2));
  const wheelFrameSize = (WHEEL_SIZE + WHEEL_PAD * 2) * wheelScale;

  useEffect(() => () => { spinAnim.stopAnimation(); }, [spinAnim]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const resetWheel = () => {
    spinAnim.stopAnimation();
    spinAnim.setValue(0);
    currentRotation.current = 0;
  };

  const resetResult = () => {
    resultOpacity.setValue(0);
    resultTranslateY.setValue(24);
  };

  const switchMode = (m: Mode) => {
    if (spinning) return;
    resetWheel();
    setMode(m);
    setWinner(null);
    resetResult();
  };

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleFilterChange = (f: FilterId) => {
    if (spinning) return;
    resetWheel();
    setFilter(f);
    setWinner(null);
    resetResult();
  };

  const handlePriceChange = (p: PriceId) => {
    if (spinning) return;
    resetWheel();
    setPrice(p);
    setWinner(null);
    resetResult();
  };

  const handleReset = () => {
    if (spinning) return;
    setWinner(null);
    resetResult();
  };

  const handleReshuffle = () => {
    if (spinning) return;
    resetWheel();
    setWinner(null);
    resetResult();
    setDirSeed(s => s + 1);
  };

  const resetDirectoryState = () => {
    resetWheel();
    setWinner(null);
    resetResult();
  };

  const handleLocationRequest = () => {
    if (spinning) return;
    resetDirectoryState();
    void requestLocation();
  };

  const handleLocationClear = () => {
    if (spinning) return;
    resetDirectoryState();
    clearLocation();
  };

  const handleRadiusChange = (nextRadius: RadiusMiles) => {
    if (spinning) return;
    resetDirectoryState();
    setPreferredRadius(nextRadius);
  };

  const updateEntry = (idx: number, value: string) => {
    if (spinning) return;
    const next = [...customEntries];
    next[idx] = value.slice(0, 30);
    setCustomEntries(next);
    resetWheel();
    setWinner(null);
    resetResult();
  };

  const handleSpin = () => {
    if (spinning || spinItems.length === 0) return;

    setSpinning(true);
    setWinner(null);
    resetResult();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const n         = spinItems.length;
    const winnerIdx = Math.floor(Math.random() * n);

    const targetNorm =
      ((-(winnerIdx + 0.5) * sliceDeg) % 360 + 360) % 360;
    const currentNorm =
      ((currentRotation.current % 360) + 360) % 360;

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
      const picked = snapshot[winnerIdx];
      setWinner(picked);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.parallel([
        Animated.spring(resultOpacity,    { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.spring(resultTranslateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      ]).start();
    });
  };

  // Look up the full listing for the result card.
  // Directory mode: match by id (exact).
  // Custom mode: match by name (case-insensitive) — shows the rich card when the
  //   typed entry corresponds to a real listing, otherwise falls back to simple card.
  const winnerListing: Listing | undefined = winner
    ? mode === 'directory'
      ? allListings.find((l) => l.id === winner.id)
      : allListings.find(
          (l) => l.name.toLowerCase() === winner.name.toLowerCase()
        )
    : undefined;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topInset + 14, paddingHorizontal: horizontalPadding }]}>
        <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
          <Feather name="shuffle" size={13} color={colors.primary} />
          <Text style={[styles.badgeText, { color: colors.primary }]}>Can't decide?</Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Indecisive Spin</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Spin the wheel. Let fate pick your next Bay Area meal.
        </Text>
      </View>

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomTabPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >

        {/* ── Mode toggle ── */}
        <View style={[styles.pillRow, { backgroundColor: colors.muted, marginBottom: 12 }]}>
          {(['directory', 'custom'] as Mode[]).map((m) => {
            const active = mode === m;
            return (
              <Pressable
                key={m}
                onPress={() => switchMode(m)}
                disabled={spinning}
                style={[
                  styles.pill,
                  {
                    backgroundColor: active ? colors.card : 'transparent',
                    opacity: spinning ? 0.45 : 1,
                  },
                ]}
              >
                <Text style={[styles.pillText, { color: active ? colors.foreground : colors.mutedForeground }]}>
                  {m === 'directory' ? 'Directory' : 'Custom'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Directory: location + preferred distance ── */}
        {mode === 'directory' && (
          <View style={[styles.locationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.locationHeader}>
              <View
                style={[
                  styles.locationIcon,
                  { backgroundColor: locationStatus === 'granted' ? colors.primary + '18' : colors.muted },
                ]}
              >
                <Feather
                  name="navigation"
                  size={17}
                  color={locationStatus === 'granted' ? colors.primary : colors.mutedForeground}
                />
              </View>
              <View style={styles.locationCopy}>
                <Text style={[styles.locationTitle, { color: colors.foreground }]}>
                  {locationStatus === 'granted' ? 'Using your current location' : 'Find a meal near you'}
                </Text>
                <Text style={[styles.locationText, { color: colors.mutedForeground }]}>
                  {locationStatus === 'requesting'
                    ? 'Getting your location…'
                    : locationStatus === 'denied'
                      ? 'Location was denied. Allow access and try again.'
                      : locationStatus === 'unavailable'
                        ? 'Location is unavailable on this device.'
                        : locationStatus === 'granted'
                          ? 'Every wheel option stays inside your selected distance.'
                          : 'Location is required for directory recommendations.'}
                </Text>
              </View>
            </View>

            {locationStatus === 'granted' ? (
              <View style={styles.locationActions}>
                <Pressable
                  testID="spin-refresh-location"
                  onPress={handleLocationRequest}
                  disabled={spinning}
                  style={({ pressed }) => [
                    styles.locationAction,
                    {
                      borderColor: colors.border,
                      opacity: pressed || spinning ? 0.55 : 1,
                    },
                  ]}
                >
                  <Feather name="refresh-cw" size={13} color={colors.primary} />
                  <Text style={[styles.locationActionText, { color: colors.primary }]}>Refresh</Text>
                </Pressable>
                <Pressable
                  testID="spin-clear-location"
                  onPress={handleLocationClear}
                  disabled={spinning}
                  style={({ pressed }) => [
                    styles.locationAction,
                    {
                      borderColor: colors.border,
                      opacity: pressed || spinning ? 0.55 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.locationActionText, { color: colors.mutedForeground }]}>Clear</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                testID="spin-use-location"
                onPress={handleLocationRequest}
                disabled={spinning || locationStatus === 'requesting' || locationStatus === 'unavailable'}
                style={({ pressed }) => [
                  styles.useLocationBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity:
                      pressed || spinning || locationStatus === 'requesting' || locationStatus === 'unavailable'
                        ? 0.55
                        : 1,
                  },
                ]}
              >
                <Feather name="navigation" size={14} color="#fff" />
                <Text style={styles.useLocationText}>
                  {locationStatus === 'requesting' ? 'Locating…' : 'Use my location'}
                </Text>
              </Pressable>
            )}

            <View style={[styles.radiusSection, { borderTopColor: colors.border }]}>
              <Text style={[styles.radiusLabel, { color: colors.mutedForeground }]}>
                Preferred distance
              </Text>
              <View style={styles.radiusRow}>
                {RADIUS_OPTIONS.map((option) => {
                  const active = preferredRadius === option;
                  return (
                    <Pressable
                      key={option}
                      testID={`spin-radius-${option}`}
                      onPress={() => handleRadiusChange(option)}
                      disabled={spinning}
                      style={({ pressed }) => [
                        styles.radiusPill,
                        {
                          backgroundColor: active ? colors.primary : colors.background,
                          borderColor: active ? colors.primary : colors.border,
                          opacity: pressed || spinning ? 0.6 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.radiusText,
                          { color: active ? '#fff' : colors.mutedForeground },
                        ]}
                      >
                        {option} mi
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {preferredRadius === null && (
                <Text style={[styles.radiusHint, { color: colors.accent }]}>
                  Choose a distance before spinning.
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ── Directory: category filter ── */}
        {mode === 'directory' && locationReady && (
          <>
            <View style={styles.reshuffleRow}>
              <Text style={[styles.reshuffleHint, { color: colors.mutedForeground }]}>
                {directoryItems.length} nearby {directoryItems.length === 1 ? 'spot' : 'spots'} —{' '}
              </Text>
              <Pressable onPress={handleReshuffle} disabled={spinning || nearbyListings.length === 0}>
                <Text style={[styles.reshuffleLink, { color: colors.primary, opacity: spinning ? 0.4 : 1 }]}>
                  reshuffle
                </Text>
              </Pressable>
            </View>
            <View style={[styles.pillRow, { backgroundColor: colors.muted }]}>
              {FILTER_OPTIONS.map((opt) => {
                const count = nearbyListings.filter(
                  ({ listing }) =>
                    (opt.id === 'all' || listing.category === opt.id) &&
                    (price === 'all' || listing.priceRange === price)
                ).length;
                const active = filter === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => handleFilterChange(opt.id)}
                    disabled={spinning}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: active ? colors.card : 'transparent',
                        opacity: spinning ? 0.45 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.pillText, { color: active ? colors.foreground : colors.mutedForeground }]}>
                      {opt.label}
                      <Text style={{ opacity: 0.55 }}> ({count})</Text>
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* ── Directory: price filter ── */}
            <View style={[styles.pillRow, { backgroundColor: colors.muted, marginTop: 8 }]}>
              {PRICE_OPTIONS.map((opt) => {
                const count = nearbyListings.filter(
                  ({ listing }) =>
                    (filter === 'all' || listing.category === filter) &&
                    (opt.id === 'all' || listing.priceRange === opt.id)
                ).length;
                const active = price === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => handlePriceChange(opt.id)}
                    disabled={spinning}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: active ? colors.card : 'transparent',
                        opacity: spinning ? 0.45 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.pillText, { color: active ? colors.foreground : colors.mutedForeground }]}>
                      {opt.label}
                      <Text style={{ opacity: 0.55 }}> ({count})</Text>
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* ── Custom: entry inputs ── */}
        {mode === 'custom' && (
          <View style={styles.customWrap}>
            <Text style={[styles.customHint, { color: colors.mutedForeground }]}>
              Enter up to 6 options — filled slots appear on the wheel
            </Text>
            {customEntries.map((entry, i) => (
              <View key={i} style={styles.entryRow}>
                {/* Numbered colour dot */}
                <View style={[styles.entryDot, { backgroundColor: CUSTOM_COLORS[i] }]}>
                  <Text style={styles.entryDotText}>{i + 1}</Text>
                </View>
                <TextInput
                  value={entry}
                  onChangeText={(v) => updateEntry(i, v)}
                  placeholder={`Entry ${i + 1}`}
                  placeholderTextColor={colors.mutedForeground}
                  maxLength={30}
                  editable={!spinning}
                  returnKeyType="next"
                  style={[
                    styles.entryInput,
                    {
                      color: colors.foreground,
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: spinning ? 0.5 : 1,
                    },
                  ]}
                />
              </View>
            ))}
          </View>
        )}

        {/* ── Wheel + pointer ── */}
        <View style={[styles.wheelWrap, { width: wheelFrameSize, height: wheelFrameSize }]}>
          <View style={styles.pointerWrap} pointerEvents="none">
            <View style={[styles.pointerTriangle, { borderTopColor: colors.accent }]} />
          </View>

          <Animated.View
            style={[
              styles.wheelAnim,
              { transform: [{ rotate: rotateStr }, { scale: wheelScale }] },
            ]}
          >
            <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
              {spinItems.length === 0 ? (
                <Circle cx={CX} cy={CY} r={R} fill={colors.muted} />
              ) : (
                spinItems.map((item, i) => {
                  const startDeg = -90 + i * sliceDeg;
                  const endDeg   = startDeg + sliceDeg;
                  const midDeg   = startDeg + sliceDeg / 2;
                  const maxChars = 12;
                  const label    = item.name.length > maxChars
                    ? item.name.slice(0, maxChars - 1) + '…'
                    : item.name;
                  return (
                    <G key={item.id}>
                      <Path
                        d={slicePath(startDeg, endDeg)}
                        fill={item.color}
                        stroke="rgba(255,255,255,0.22)"
                        strokeWidth={1.5}
                      />
                      <G transform={`rotate(${midDeg} ${CX} ${CY})`}>
                        <SvgText
                          x={CX + R * 0.72}
                          y={CY}
                          textAnchor="end"
                          fill="rgba(255,255,255,0.95)"
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
              <Circle cx={CX} cy={CY} r={20} fill="white" />
              <Circle cx={CX} cy={CY} r={7}  fill={colors.primary} />
            </Svg>
          </Animated.View>
        </View>

        {/* ── Empty state ── */}
        {spinItems.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {mode === 'custom'
              ? 'Add at least one entry above to spin.'
              : locationStatus === 'requesting'
                ? 'Getting your location…'
                : locationStatus !== 'granted'
                  ? 'Enable location to build a wheel of nearby recommendations.'
                  : preferredRadius === null
                    ? 'Choose your preferred distance to build the wheel.'
                    : `No venues with location data match within ${preferredRadius} miles. Try a wider distance or different filters.`}
          </Text>
        )}

        {/* ── Buttons ── */}
        <View style={styles.btnRow}>
          <Pressable
            onPress={handleSpin}
            disabled={spinning || spinItems.length === 0}
            style={({ pressed }) => [
              styles.spinBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.82 : spinning || spinItems.length === 0 ? 0.5 : 1,
              },
            ]}
          >
            {spinning ? (
              <Text style={styles.spinBtnText}>Spinning…</Text>
            ) : (
              <>
                <Feather name="shuffle" size={18} color="#fff" />
                <Text style={styles.spinBtnText}>Spin!</Text>
              </>
            )}
          </Pressable>

          {winner && !spinning && (
            <Pressable
              onPress={handleReset}
              style={({ pressed }) => [
                styles.resetBtn,
                { borderColor: colors.border, opacity: pressed ? 0.65 : 1 },
              ]}
            >
              <Feather name="rotate-ccw" size={17} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* ── Result card ── */}
        {winner && !spinning && (
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: resultOpacity,
                transform: [{ translateY: resultTranslateY }],
              },
            ]}
          >
            <View style={[styles.accentBar, { backgroundColor: winner.color }]} />

            <View style={styles.cardInner}>
              {/* ── Simple custom result (no matching listing) ── */}
              {!winnerListing && (
                <View style={styles.customResult}>
                  <View style={[styles.customResultDot, { backgroundColor: winner.color }]}>
                    <Text style={styles.customResultDotText}>
                      {winner.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.customResultLabel, { color: colors.mutedForeground }]}>
                    The wheel chose
                  </Text>
                  <Text style={[styles.customResultName, { color: colors.foreground }]}>
                    {winner.name}
                  </Text>
                </View>
              )}

              {/* ── Rich listing result (directory mode OR custom entry matched a listing) ── */}
              {winnerListing && (
                <>
                  <View style={styles.cardTop}>
                    <View style={[styles.initials, { backgroundColor: winnerListing.color }]}>
                      <Text style={styles.initialsText}>{winnerListing.initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
                        {winnerListing.name}
                      </Text>
                      <View style={styles.cardMeta}>
                        <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                        <Text style={[styles.cardMetaText, { color: colors.mutedForeground }]}>
                          {winnerListing.neighborhood}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.chips}>
                    <View style={[styles.chip, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
                        {winnerListing.category.replace('-', ' ')}
                      </Text>
                    </View>
                    <View style={[styles.chip, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
                        {winnerListing.priceRange}
                      </Text>
                    </View>
                    {winner.distanceMi !== undefined && (
                      <View style={[styles.distanceChip, { backgroundColor: colors.primary + '15' }]}>
                        <Feather name="navigation" size={11} color={colors.primary} />
                        <Text style={[styles.chipText, { color: colors.primary, marginLeft: 3 }]}>
                          {winner.distanceMi < 0.1 ? '< 0.1 mi' : `${winner.distanceMi.toFixed(1)} mi`}
                        </Text>
                      </View>
                    )}
                    {winnerListing.reviewCount > 0 && (
                      <View style={styles.ratingChip}>
                        <Feather name="star" size={11} color={colors.accent} />
                        <Text style={[styles.chipText, { color: colors.foreground, marginLeft: 3 }]}>
                          {winnerListing.rating}
                        </Text>
                      </View>
                    )}
                    {winnerListing.hasVideo && (
                      <View style={[styles.chip, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.chipText, { color: colors.primary }]}>▶ Video</Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
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
                    <Feather name="arrow-right" size={16} color="#fff" />
                  </Pressable>
                </>
              )}
            </View>
          </Animated.View>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const WHEEL_PAD = 24;

const styles = StyleSheet.create({
  root:   { flex: 1 },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  title: {
    fontSize: 34,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  scroll: {
    alignItems: 'center',
    paddingTop: 4,
  },
  // Filter / mode pills
  pillRow: {
    flexDirection: 'row',
    borderRadius: 100,
    padding: 4,
    gap: 2,
    marginBottom: 4,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
  },
  pillText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  // Location requirement
  locationCard: {
    width: '90%',
    maxWidth: 440,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 14,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  locationCopy: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Inter_400Regular',
  },
  locationActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  locationAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  locationActionText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  useLocationBtn: {
    minHeight: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 12,
  },
  useLocationText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  radiusSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 14,
    paddingTop: 13,
  },
  radiusLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 9,
  },
  radiusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radiusPill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  radiusText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  radiusHint: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 8,
  },
  // Custom entries
  customWrap: {
    width: '88%',
    maxWidth: 380,
    marginBottom: 8,
    marginTop: 4,
  },
  customHint: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 14,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  entryDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  entryDotText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  entryInput: {
    flex: 1,
    height: 42,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  // Wheel
  wheelWrap: {
    width:  WHEEL_SIZE + WHEEL_PAD * 2,
    height: WHEEL_SIZE + WHEEL_PAD * 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 20,
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
    borderLeftWidth:  11,
    borderRightWidth: 11,
    borderTopWidth:   22,
    borderLeftColor:  'transparent',
    borderRightColor: 'transparent',
  },
  wheelAnim: {
    width:  WHEEL_SIZE,
    height: WHEEL_SIZE,
    shadowColor:   '#000',
    shadowOpacity: 0.14,
    shadowRadius:  18,
    shadowOffset:  { width: 0, height: 4 },
    elevation: 6,
  },
  reshuffleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reshuffleHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  reshuffleLink: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textDecorationLine: 'underline',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  // Buttons
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
  },
  spinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 38,
    borderRadius: 100,
  },
  spinBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  resetBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Result card
  card: {
    width: '90%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  accentBar: { height: 5 },
  cardInner: { padding: 20 },
  // Custom result layout
  customResult: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  customResultDot: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customResultDotText: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  customResultLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  customResultName: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_700Bold',
    textAlign: 'center',
  },
  // Directory result layout
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  initials: {
    width: 52,
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  cardName: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay_700Bold',
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textTransform: 'capitalize',
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  distanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
    marginBottom: 16,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
  ctaText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
});
