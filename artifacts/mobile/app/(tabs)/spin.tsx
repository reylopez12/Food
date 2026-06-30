import React, { useRef, useState, useEffect } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path, G, Text as SvgText, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { SAMPLE_LISTINGS, type Listing } from '@/constants/data';

// ─── Types ────────────────────────────────────────────────────────────────────

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

const SPIN_ROTATIONS = 8;
const SPIN_DURATION  = 4200;
const WHEEL_SIZE     = 300;
const CX             = WHEEL_SIZE / 2;
const CY             = WHEEL_SIZE / 2;
const R              = WHEEL_SIZE / 2 - 4;

// ─── SVG helpers ─────────────────────────────────────────────────────────────

function polarXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/**
 * SVG arc path for one pie slice.
 * Segment i spans [-90 + i*slice, -90 + (i+1)*slice]. Top = -90°.
 *
 * Landing math:
 *   angle ≡ -(winnerIdx + 0.5) * slice  (mod 360)
 */
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
  const insets  = useSafeAreaInsets();
  const router  = useRouter();

  const [filter,   setFilter]   = useState<FilterId>('all');
  const [price,    setPrice]    = useState<PriceId>('all');
  const [spinning, setSpinning] = useState(false);
  const [winner,   setWinner]   = useState<Listing | null>(null);

  // Result card animation (slide + fade)
  const resultOpacity    = useRef(new Animated.Value(0)).current;
  const resultTranslateY = useRef(new Animated.Value(24)).current;

  // Absolute accumulated rotation in degrees (never modded — ensures continuity)
  const currentRotation = useRef(0);
  const spinAnim        = useRef(new Animated.Value(0)).current;

  const rotateStr = spinAnim.interpolate({
    inputRange:  [-360_000, 360_000],
    outputRange: ['-360000deg', '360000deg'],
  });

  const listings = SAMPLE_LISTINGS.filter(
    (l) =>
      (filter === 'all' || l.category === filter) &&
      (price  === 'all' || l.priceRange === price)
  );

  const topPad   = Platform.OS === 'web' ? 67 : insets.top;
  const botPad   = Platform.OS === 'web' ? 120 : insets.bottom + 100;
  const sliceDeg = listings.length > 0 ? 360 / listings.length : 360;
  const fontSize = Math.min(12, Math.max(8, 160 / Math.max(listings.length, 1)));

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

  const handleSpin = () => {
    if (spinning || listings.length === 0) return;

    setSpinning(true);
    setWinner(null);
    resetResult();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const n        = listings.length;
    const winnerIdx = Math.floor(Math.random() * n);

    const targetNorm =
      (( -(winnerIdx + 0.5) * sliceDeg ) % 360 + 360) % 360;
    const currentNorm =
      (( currentRotation.current % 360 ) + 360) % 360;

    let delta = targetNorm - currentNorm;
    if (delta < 0.01) delta += 360;

    const newTotal = currentRotation.current + delta + (SPIN_ROTATIONS - 1) * 360;
    currentRotation.current = newTotal;

    const snapshot = listings.slice();

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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad + 14 }]}>
        <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
          <Feather name="shuffle" size={13} color={colors.primary} />
          <Text style={[styles.badgeText, { color: colors.primary }]}>Can't decide?</Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Indecisive Spin</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Spin the wheel. Let fate pick your next Bay Area meal.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Category filter ── */}
        <View style={[styles.pillRow, { backgroundColor: colors.muted }]}>
          {FILTER_OPTIONS.map((opt) => {
            const count = SAMPLE_LISTINGS.filter(
              (l) =>
                (opt.id === 'all' || l.category === opt.id) &&
                (price  === 'all' || l.priceRange === price)
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

        {/* ── Price filter ── */}
        <View style={[styles.pillRow, { backgroundColor: colors.muted, marginTop: 8 }]}>
          {PRICE_OPTIONS.map((opt) => {
            const count = SAMPLE_LISTINGS.filter(
              (l) =>
                (filter === 'all' || l.category === filter) &&
                (opt.id === 'all' || l.priceRange === opt.id)
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

        {/* ── Wheel + pointer ── */}
        <View style={styles.wheelWrap}>
          <View style={styles.pointerWrap} pointerEvents="none">
            <View style={styles.pointerTriangle} />
          </View>

          <Animated.View style={[styles.wheelAnim, { transform: [{ rotate: rotateStr }] }]}>
            <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
              {listings.length === 0 ? (
                <Circle cx={CX} cy={CY} r={R} fill={colors.muted} />
              ) : (
                listings.map((listing, i) => {
                  const startDeg = -90 + i * sliceDeg;
                  const endDeg   = startDeg + sliceDeg;
                  const midDeg   = startDeg + sliceDeg / 2;
                  const maxChars = 12;
                  const label    = listing.name.length > maxChars
                    ? listing.name.slice(0, maxChars - 1) + '…'
                    : listing.name;
                  return (
                    <G key={listing.id}>
                      <Path
                        d={slicePath(startDeg, endDeg)}
                        fill={listing.color}
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
        {listings.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No listings match these filters.
          </Text>
        )}

        {/* ── Buttons ── */}
        <View style={styles.btnRow}>
          <Pressable
            onPress={handleSpin}
            disabled={spinning || listings.length === 0}
            style={({ pressed }) => [
              styles.spinBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.82 : spinning || listings.length === 0 ? 0.5 : 1,
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
              <View style={styles.cardTop}>
                <View style={[styles.initials, { backgroundColor: winner.color }]}>
                  <Text style={styles.initialsText}>{winner.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
                    {winner.name}
                  </Text>
                  <View style={styles.cardMeta}>
                    <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.cardMetaText, { color: colors.mutedForeground }]}>
                      {winner.neighborhood}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.chips}>
                <View style={[styles.chip, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
                    {winner.category.replace('-', ' ')}
                  </Text>
                </View>
                <View style={[styles.chip, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
                    {winner.priceRange}
                  </Text>
                </View>
                <View style={styles.ratingChip}>
                  <Feather name="star" size={11} color="#F59E0B" />
                  <Text style={[styles.chipText, { color: colors.foreground, marginLeft: 3 }]}>
                    {winner.rating}
                  </Text>
                </View>
                {winner.hasVideo && (
                  <View style={[styles.chip, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.chipText, { color: colors.primary }]}>▶ Video</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                {winner.description}
              </Text>

              <Pressable
                onPress={() => router.push(`/listing/${winner!.id}`)}
                style={({ pressed }) => [
                  styles.ctaBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 },
                ]}
              >
                <Text style={styles.ctaText}>View full listing</Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </Pressable>
            </View>
          </Animated.View>
        )}
      </ScrollView>
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
  // Filter pills
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
    borderTopColor:   '#F59E0B',
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
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
    marginTop: 8,
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
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  initials: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  cardName: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
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
