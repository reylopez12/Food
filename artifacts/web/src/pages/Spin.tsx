import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Shuffle, RotateCcw, RefreshCw, ExternalLink, Star, MapPin, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useListings } from "@workspace/api-client-react";
import type { Venue as Listing } from "@workspace/api-client-react";
import {
  RADIUS_OPTIONS,
  hasValidCoordinates,
  haversineDistanceMi,
  useNearMe,
  type RadiusMiles,
} from "../hooks/useNearMe";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal item the wheel and result card need from either source */
type SpinItem = { id: string; name: string; color: string; distanceMi?: number };

type Mode   = "directory" | "custom";
type Filter = "all" | "restaurants" | "food-trucks";
type Price  = "all" | "budget" | "mid" | "upscale";

// ─── Constants ────────────────────────────────────────────────────────────────

const CUSTOM_COLORS = [
  "#E07552", "#F3B944", "#10B981", "#EF4444", "#8B5CF6", "#EC4899",
];
const MAX_CUSTOM = 6;

const PRICE_MAP: Record<Price, string | null> = {
  all:     null,
  budget:  "$",
  mid:     "$$",
  upscale: "$$$",
};

const FILTER_OPTIONS: { id: Filter; label: string }[] = [
  { id: "all",          label: "All" },
  { id: "restaurants",  label: "Restaurants" },
  { id: "food-trucks",  label: "Food Trucks" },
];

const PRICE_OPTIONS: { id: Price; label: string }[] = [
  { id: "all",     label: "Any price" },
  { id: "budget",  label: "$" },
  { id: "mid",     label: "$$" },
  { id: "upscale", label: "$$$" },
];

const SPIN_ROTATIONS  = 8;
const SPIN_DURATION   = 4200;
const TWO_PI          = 2 * Math.PI;
const MAX_DIR_SLOTS   = 10;

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Theme helpers ─────────────────────────────────────────────────────────────

/** Read a raw CSS custom property (e.g. "--primary") and wrap it in hsl(). */
function resolveCssVar(property: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(property)
    .trim();
  if (!raw) return fallback;
  const parts = raw.split(/\s+/);
  if (parts.length >= 3) {
    return `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`;
  }
  return `hsl(${raw})`;
}

// ─── Canvas drawing ───────────────────────────────────────────────────────────

function drawWheel(
  canvas: HTMLCanvasElement,
  items: SpinItem[],
  angle: number,
  primaryColor: string,
) {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  const cx = width / 2;
  const cy = height / 2;
  const r  = Math.min(cx, cy) - 6;
  const n  = items.length;

  ctx.clearRect(0, 0, width, height);
  if (n === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TWO_PI);
    ctx.fillStyle = "rgba(148,163,184,0.12)";
    ctx.fill();
    ctx.strokeStyle = "rgba(148,163,184,0.28)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  const slice = TWO_PI / n;

  items.forEach((item, i) => {
    const start = i * slice - Math.PI / 2;
    const end   = start + slice;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, start, end);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const midAngle = start + slice / 2;
    ctx.save();
    ctx.rotate(midAngle);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    const fontSize = Math.min(14, Math.max(9, 200 / n));
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    const maxChars = 14;
    const label = item.name.length > maxChars
      ? item.name.slice(0, maxChars - 1) + "…"
      : item.name;
    ctx.fillText(label, r - 12, fontSize / 3);
    ctx.restore();
  });

  // Hub — white outer ring with black shadow (intentional), primary-colored inner dot
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, TWO_PI);
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, TWO_PI);
  ctx.fillStyle = primaryColor;
  ctx.fill();

  ctx.restore();
}

function drawPointer(canvas: HTMLCanvasElement, accentColor: string) {
  const ctx = canvas.getContext("2d")!;
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;
  const r  = Math.min(cx, cy) - 6;

  ctx.save();
  ctx.translate(cx, cy);

  const tipY = -(r + 2);
  ctx.beginPath();
  ctx.moveTo(0,   tipY + 26);
  ctx.lineTo(-10, tipY + 4);
  ctx.lineTo(10,  tipY + 4);
  ctx.closePath();
  // Pointer uses accent color — intentional design element; shadow is black (intentional)
  ctx.fillStyle = accentColor;
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur  = 6;
  ctx.fill();
  ctx.shadowBlur  = 0;
  ctx.restore();
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function Spin() {
  const [, setLocation] = useLocation();

  const [mode,    setMode]    = useState<Mode>("directory");
  const [filter,  setFilter]  = useState<Filter>("all");
  const [price,   setPrice]   = useState<Price>("all");
  const [spinning, setSpinning] = useState(false);
  const [winner,  setWinner]  = useState<SpinItem | null>(null);
  const [dirSeed, setDirSeed] = useState(0);

  // Custom entries — array of 6 strings (empty = unused slot)
  const [customEntries, setCustomEntries] = useState<string[]>(
    Array(MAX_CUSTOM).fill("")
  );

  const currentAngleRef = useRef(0);
  const [displayAngle, setDisplayAngle] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number | null>(null);

  // Resolve theme colors for canvas; re-resolve on dark/light toggle
  const [primaryColor, setPrimaryColor] = useState(
    () => resolveCssVar("--primary", "#E07552")
  );
  const [accentColor, setAccentColor] = useState(
    () => resolveCssVar("--accent", "#F3B944")
  );
  useEffect(() => {
    const update = () => {
      setPrimaryColor(resolveCssVar("--primary", "#E07552"));
      setAccentColor(resolveCssVar("--accent", "#F3B944"));
    };
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const { data: allListings = [] } = useListings();
  const {
    status: locationStatus,
    userLat,
    userLng,
    radius,
    requestLocation,
    clearLocation,
    setRadius,
  } = useNearMe();

  const priceVal = PRICE_MAP[price];
  const locationReady =
    locationStatus === "granted" &&
    userLat !== null &&
    userLng !== null &&
    radius !== null;

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
      return distanceMi <= radius ? [{ listing, distanceMi }] : [];
    });
  }, [allListings, locationReady, radius, userLat, userLng]);

  // Distance is applied before random selection, so every wheel slot is in range.
  const directoryItems: SpinItem[] = useMemo(() => {
    const filtered = nearbyListings
      .filter(
        ({ listing }) =>
          (filter === "all" || listing.category === filter) &&
          (priceVal === null || listing.priceRange === priceVal)
      )
      .map(({ listing, distanceMi }) => ({
        id: listing.id,
        name: listing.name,
        color: listing.color,
        distanceMi,
      }));
    return shuffled(filtered).slice(0, MAX_DIR_SLOTS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearbyListings, filter, priceVal, dirSeed]);

  const customItems: SpinItem[] = customEntries
    .map((name, i) => ({ id: `custom-${i}`, name: name.trim(), color: CUSTOM_COLORS[i] }))
    .filter((e) => e.name.length > 0);

  const spinItems = mode === "directory" ? directoryItems : customItems;

  // ── Draw ──────────────────────────────────────────────────────────────────

  const redraw = useCallback(
    (angle: number, override?: SpinItem[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      drawWheel(canvas, override ?? spinItems, angle, primaryColor);
      drawPointer(canvas, accentColor);
    },
    [spinItems, primaryColor, accentColor]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = Math.min(canvas.parentElement!.clientWidth, 440);
    canvas.width  = size;
    canvas.height = size;
    redraw(currentAngleRef.current);
  }, [spinItems, redraw]);

  useEffect(() => { redraw(displayAngle); }, [displayAngle, redraw]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // ── Spin ──────────────────────────────────────────────────────────────────

  const handleSpin = () => {
    if (spinning || spinItems.length === 0) return;

    setWinner(null);
    setSpinning(true);

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const n     = spinItems.length;
    const slice = TWO_PI / n;
    const winnerIdx = Math.floor(Math.random() * n);

    const targetNorm =
      ((-(winnerIdx + 0.5) * slice) % TWO_PI + TWO_PI) % TWO_PI;
    const currentNorm =
      ((currentAngleRef.current % TWO_PI) + TWO_PI) % TWO_PI;

    let delta = targetNorm - currentNorm;
    if (delta < 0.01) delta += TWO_PI;

    const totalTarget  = currentAngleRef.current + delta + (SPIN_ROTATIONS - 1) * TWO_PI;
    const startAngle   = currentAngleRef.current;
    const startTime    = { v: -1 };
    const snapshot     = spinItems.slice();
    const snapPrimary  = primaryColor;
    const snapAccent   = accentColor;

    const animate = (ts: number) => {
      if (startTime.v < 0) startTime.v = ts;
      const elapsed = ts - startTime.v;
      const t       = Math.min(elapsed / SPIN_DURATION, 1);
      const current = startAngle + (totalTarget - startAngle) * easeOut(t);

      const canvas = canvasRef.current;
      if (canvas) {
        drawWheel(canvas, snapshot, current, snapPrimary);
        drawPointer(canvas, snapAccent);
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        currentAngleRef.current = totalTarget;
        setDisplayAngle(totalTarget);
        setSpinning(false);
        setWinner(snapshot[winnerIdx]);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const resetWheel = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    currentAngleRef.current = 0;
    setDisplayAngle(0);
  };

  const switchMode = (m: Mode) => {
    if (spinning) return;
    resetWheel();
    setMode(m);
    setWinner(null);
  };

  const handleFilterChange = (f: Filter) => {
    if (spinning) return;
    resetWheel();
    setFilter(f);
    setWinner(null);
  };

  const handlePriceChange = (p: Price) => {
    if (spinning) return;
    resetWheel();
    setPrice(p);
    setWinner(null);
  };

  const handleReset = () => {
    if (spinning) return;
    currentAngleRef.current = 0;
    setDisplayAngle(0);
    setWinner(null);
  };

  const handleReshuffle = () => {
    if (spinning) return;
    currentAngleRef.current = 0;
    setDisplayAngle(0);
    setWinner(null);
    setDirSeed(s => s + 1);
  };

  const resetDirectoryState = () => {
    resetWheel();
    setWinner(null);
  };

  const handleLocationRequest = () => {
    if (spinning) return;
    resetDirectoryState();
    requestLocation();
  };

  const handleLocationClear = () => {
    if (spinning) return;
    resetDirectoryState();
    clearLocation();
  };

  const handleRadiusChange = (nextRadius: RadiusMiles) => {
    if (spinning) return;
    resetDirectoryState();
    setRadius(nextRadius);
  };

  const updateEntry = (idx: number, value: string) => {
    if (spinning) return;
    const next = [...customEntries];
    next[idx] = value.slice(0, 30);
    setCustomEntries(next);
    resetWheel();
    setWinner(null);
  };

  // Look up the full listing for the result card.
  // Directory mode: match by id (exact).
  // Custom mode: match by name (case-insensitive) — shows the rich card when the
  //   typed entry corresponds to a real listing, otherwise falls back to simple card.
  const winnerListing: Listing | undefined = winner
    ? mode === "directory"
      ? allListings.find((l) => l.id === winner.id)
      : allListings.find(
          (l) => l.name.toLowerCase() === winner.name.toLowerCase()
        )
    : undefined;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center pb-20 pt-10 px-4 bg-background">
      {/* Header */}
      <div className="text-center mb-6 max-w-lg">
        <div className="inline-flex items-center gap-2 bg-accent/10 text-accent-foreground px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
          <Shuffle className="w-4 h-4" />
          Can't decide?
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3">
          Indecisive Spin
        </h1>
        <p className="text-muted-foreground text-base">
          Spin the wheel. Let fate pick your next Bay Area meal.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-full mb-6">
        {(["directory", "custom"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            disabled={spinning}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed capitalize ${
              mode === m
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "directory" ? "Directory" : "Custom"}
          </button>
        ))}
      </div>

      {/* Directory location + filters */}
      {mode === "directory" && (
        <div className="flex flex-col items-center gap-4 mb-8 w-full max-w-xl">
          <div
            className="w-full rounded-2xl border bg-card p-4 shadow-sm"
            aria-live="polite"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  locationStatus === "granted"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-primary/10 text-primary"
                }`}>
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">
                    {locationStatus === "granted"
                      ? "Using your current location"
                      : "Find a meal near you"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {locationStatus === "requesting"
                      ? "Getting your location…"
                      : locationStatus === "denied"
                        ? "Location was denied. Allow it in your browser and try again."
                        : locationStatus === "unavailable"
                          ? "Location is not available in this browser."
                          : locationStatus === "granted"
                            ? "Every wheel option will stay inside your selected distance."
                            : "Location is required for directory recommendations."}
                  </p>
                </div>
              </div>

              {locationStatus === "granted" ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleLocationRequest}
                    disabled={spinning}
                    className="gap-1.5"
                    data-testid="spin-refresh-location"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleLocationClear}
                    disabled={spinning}
                    data-testid="spin-clear-location"
                  >
                    Clear
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleLocationRequest}
                  disabled={spinning || locationStatus === "requesting" || locationStatus === "unavailable"}
                  className="gap-1.5 shrink-0"
                  data-testid="spin-use-location"
                >
                  {locationStatus === "requesting" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Navigation className="w-3.5 h-3.5" />
                  )}
                  {locationStatus === "requesting" ? "Locating…" : "Use my location"}
                </Button>
              )}
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Preferred distance
              </p>
              <div className="flex flex-wrap gap-2">
                {RADIUS_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleRadiusChange(option)}
                    disabled={spinning}
                    className={`px-4 py-1.5 rounded-full border text-sm font-semibold transition-colors disabled:opacity-40 ${
                      radius === option
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground hover:text-foreground hover:border-primary/50"
                    }`}
                    data-testid={`spin-radius-${option}`}
                  >
                    {option} mi
                  </button>
                ))}
              </div>
              {radius === null && (
                <p className="text-xs text-accent-foreground mt-2">
                  Choose a distance before spinning.
                </p>
              )}
            </div>
          </div>

          {locationReady && (
            <>
              <p className="text-xs text-muted-foreground">
                {directoryItems.length} nearby {directoryItems.length === 1 ? "spot" : "spots"} on the wheel
                {nearbyListings.length > 0 && (
                  <> — <button onClick={handleReshuffle} disabled={spinning} className="underline hover:text-foreground transition-colors disabled:opacity-40">reshuffle</button></>
                )}
              </p>
              <div className="flex items-center gap-2 p-1 bg-muted rounded-full max-w-full overflow-x-auto">
                {FILTER_OPTIONS.map((opt) => {
                  const count = nearbyListings.filter(
                    ({ listing }) =>
                      (opt.id === "all" || listing.category === opt.id) &&
                      (priceVal === null || listing.priceRange === priceVal)
                  ).length;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleFilterChange(opt.id)}
                      disabled={spinning}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                        filter === opt.id
                          ? "bg-background shadow text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                      <span className="ml-1.5 text-xs opacity-60">({count})</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 p-1 bg-muted rounded-full max-w-full overflow-x-auto">
                {PRICE_OPTIONS.map((opt) => {
                  const count = nearbyListings.filter(
                    ({ listing }) =>
                      (filter === "all" || listing.category === filter) &&
                      (PRICE_MAP[opt.id] === null || listing.priceRange === PRICE_MAP[opt.id])
                  ).length;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handlePriceChange(opt.id)}
                      disabled={spinning}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                        price === opt.id
                          ? "bg-background shadow text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                      <span className="ml-1.5 text-xs opacity-60">({count})</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Custom entry inputs */}
      {mode === "custom" && (
        <div className="w-full max-w-sm mb-8">
          <p className="text-sm text-muted-foreground text-center mb-4">
            Enter up to 6 options — filled slots appear on the wheel
          </p>
          <div className="grid grid-cols-2 gap-3">
            {customEntries.map((entry, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: CUSTOM_COLORS[i] }}
                >
                  {i + 1}
                </span>
                <input
                  value={entry}
                  onChange={(e) => updateEntry(i, e.target.value)}
                  placeholder={`Entry ${i + 1}`}
                  maxLength={30}
                  disabled={spinning}
                  className="flex-1 min-w-0 text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wheel + controls */}
      <div className="flex flex-col items-center gap-6 w-full max-w-[440px]">
        <div className="relative w-full" style={{ maxWidth: 440 }}>
          <canvas
            ref={canvasRef}
            className="w-full h-auto rounded-full"
            style={{
              filter: spinning
                ? `drop-shadow(0 0 24px color-mix(in srgb, ${primaryColor} 35%, transparent))`
                : "drop-shadow(0 4px 16px rgba(0,0,0,0.12))",
              transition: "filter 0.3s",
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="lg"
            onClick={handleSpin}
            disabled={spinning || spinItems.length === 0}
            className="rounded-full px-10 text-base font-bold gap-2 min-w-36"
          >
            {spinning ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Spinning…
              </>
            ) : (
              <>
                <Shuffle className="w-4 h-4" />
                Spin!
              </>
            )}
          </Button>

          {winner && !spinning && (
            <Button
              size="lg"
              variant="outline"
              onClick={handleReset}
              className="rounded-full px-6 gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {spinItems.length === 0 && (
        <p className="mt-8 text-muted-foreground text-sm text-center max-w-md">
          {mode === "custom"
            ? "Add at least one entry above to spin."
            : locationStatus === "requesting"
              ? "Getting your location…"
              : locationStatus !== "granted"
                ? "Enable location to build a wheel of nearby recommendations."
                : radius === null
                  ? "Choose your preferred distance to build the wheel."
                  : `No venues with location data match within ${radius} miles. Try a wider distance or different filters.`}
        </p>
      )}

      {/* Result card */}
      <AnimatePresence>
        {winner && !spinning && (
          <motion.div
            key={winner.id}
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 w-full max-w-md"
          >
            {/* ── Simple custom result (no matching listing) ── */}
            {!winnerListing && (
              <>
                <div
                  className="h-1.5 rounded-t-2xl w-full"
                  style={{ backgroundColor: winner.color }}
                />
                <div className="border border-t-0 rounded-b-2xl bg-card shadow-lg px-8 py-10 flex flex-col items-center gap-3">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl"
                    style={{ backgroundColor: winner.color }}
                  >
                    {winner.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                      The wheel chose
                    </p>
                    <h2 className="text-3xl font-black tracking-tight">
                      {winner.name}
                    </h2>
                  </div>
                </div>
              </>
            )}

            {/* ── Rich listing result (directory mode OR custom entry matched a listing) ── */}
            {winnerListing && (
              <>
                <div
                  className="h-1.5 rounded-t-2xl w-full"
                  style={{ backgroundColor: winnerListing.color }}
                />
                <div className="border border-t-0 rounded-b-2xl bg-card shadow-lg p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="capitalize">
                      {winnerListing.category.replace("-", " ")}
                    </Badge>
                    <Badge variant="secondary">{winnerListing.priceRange}</Badge>
                    {winner.distanceMi !== undefined && (
                      <Badge className="gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/10 dark:text-emerald-300">
                        <Navigation className="w-3 h-3" />
                        {winner.distanceMi < 0.1 ? "< 0.1 mi" : `${winner.distanceMi.toFixed(1)} mi`}
                      </Badge>
                    )}
                    {winnerListing.hasVideo && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 font-semibold">
                        ▶ Video
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0"
                      style={{ backgroundColor: winnerListing.color }}
                    >
                      {winnerListing.initials}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight leading-tight">
                        {winnerListing.name}
                      </h2>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {winnerListing.neighborhood}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    {winnerListing.reviewCount > 0 ? (
                      <>
                        <Star className="w-4 h-4 fill-secondary text-secondary" />
                        <span className="font-bold">{winnerListing.rating}</span>
                        <span className="text-muted-foreground text-sm">
                          ({winnerListing.reviewCount.toLocaleString()} reviews)
                        </span>
                      </>
                    ) : <span className="text-muted-foreground text-sm">No ratings yet</span>}
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-5">
                    {winnerListing.description}
                  </p>

                  <Button
                    className="w-full gap-2 rounded-xl"
                    size="lg"
                    onClick={() => setLocation(`/listing/${winnerListing.id}`)}
                  >
                    <ExternalLink className="w-4 h-4" />
                    View full listing
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
