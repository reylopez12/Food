import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path, G, Text as SvgText, Circle } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useDirectory } from '@/context/DirectoryContext';
import type { Venue as Listing } from '@workspace/api-client-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type SpinItem = { id: string; name: string; color: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_SLOTS      = 10;
const SPIN_ROTATIONS = 8;
const SPIN_DURATION  = 4200;
const WHEEL_SIZE     = 260;
const CX             = WHEEL_SIZE / 2;
const CY             = WHEEL_SIZE / 2;
const R              = WHEEL_SIZE / 2 - 4;

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

export function HomeSpinWidget() {
  const colors = useColors();
  const router = useRouter();
  const { listings: allListings } = useDirectory();

  const [seed,     setSeed]     = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner,   setWinner]   = useState<SpinItem | null>(null);

  const currentRotation = useRef(0);
  const spinAnim        = useRef(new Animated.Value(0)).current;

  const rotateStr = spinAnim.interpolate({
    inputRange:  [-360_000, 360_000],
    outputRange: ['-360000deg', '360000deg'],
  });

  // Pick 10 random listings; reshuffles when seed changes
  const spinItems = useMemo<SpinItem[]>(() => {
    if (allListings.length === 0) return [];
    return shuffled(
      allListings.map(l => ({ id: l.id, name: l.name, color: l.color }))
    ).slice(0, MAX_SLOTS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allListings, seed]);

  const sliceDeg = spinItems.length > 0 ? 360 / spinItems.length : 360;
  const fontSize = Math.min(11, Math.max(8, 140 / Math.max(spinItems.length, 1)));

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
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
          <Feather name="shuffle" size={12} color={colors.primary} />
          <Text style={[styles.badgeText, { color: colors.primary }]}>Can't decide?</Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Spin for your next meal</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {spinItems.length} random spots · tap Spin!
        </Text>
      </View>

      {/* Wheel */}
      <View style={styles.wheelWrap}>
        {/* Pointer */}
        <View style={styles.pointerWrap} pointerEvents="none">
          <View style={styles.pointerTriangle} />
        </View>

        <Animated.View style={[styles.wheelAnim, { transform: [{ rotate: rotateStr }] }]}>
          <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
            {spinItems.length === 0 ? (
              <Circle cx={CX} cy={CY} r={R} fill={colors.muted} />
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
            <Circle cx={CX} cy={CY} r={18} fill="white" />
            <Circle cx={CX} cy={CY} r={6}  fill={colors.primary} />
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
              backgroundColor: colors.primary,
              opacity: pressed ? 0.82 : spinning || spinItems.length === 0 ? 0.5 : 1,
            },
          ]}
        >
          {spinning ? (
            <Text style={styles.spinBtnText}>Spinning…</Text>
          ) : (
            <>
              <Feather name="shuffle" size={16} color="#fff" />
              <Text style={styles.spinBtnText}>Spin!</Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={handleReshuffle}
          disabled={spinning}
          style={({ pressed }) => [
            styles.iconBtn,
            { borderColor: colors.border, opacity: pressed || spinning ? 0.5 : 1 },
          ]}
        >
          <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />
        </Pressable>

        {winner && !spinning && (
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [
              styles.iconBtn,
              { borderColor: colors.border, opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <Feather name="rotate-ccw" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
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
                      <Text style={[styles.resultMetaText, { color: colors.mutedForeground }]}>
                        {winnerListing.neighborhood} · {winnerListing.city}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.ratingRow}>
                    <Feather name="star" size={12} color="#F59E0B" />
                    <Text style={[styles.ratingText, { color: colors.foreground }]}>{winnerListing.rating}</Text>
                  </View>
                </View>
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

const WHEEL_PAD = 20;

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingBottom: 16,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  wheelWrap: {
    width:  WHEEL_SIZE + WHEEL_PAD * 2,
    height: WHEEL_SIZE + WHEEL_PAD * 2,
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
    borderLeftWidth:  10,
    borderRightWidth: 10,
    borderTopWidth:   20,
    borderLeftColor:  'transparent',
    borderRightColor: 'transparent',
    borderTopColor:   '#F59E0B',
  },
  wheelAnim: {
    width:  WHEEL_SIZE,
    height: WHEEL_SIZE,
    shadowColor:   '#000',
    shadowOpacity: 0.14,
    shadowRadius:  16,
    shadowOffset:  { width: 0, height: 4 },
    elevation: 5,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  spinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 13,
    paddingHorizontal: 32,
    borderRadius: 100,
  },
  spinBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  iconBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  result: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  resultAccent: { height: 4 },
  resultInner:  { padding: 16 },
  resultTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  initials: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  initialsText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  resultName: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    marginBottom: 3,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  resultMetaText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
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
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  simpleResult: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  simpleDot: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleDotText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  simpleLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  simpleName: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
});
