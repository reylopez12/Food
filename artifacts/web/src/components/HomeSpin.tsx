import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

type SpinItem = { id: string; name: string; color: string; distanceMi?: number };

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_SLOTS      = 10;
const SPIN_ROTATIONS = 8;
const SPIN_DURATION  = 4200;
const TWO_PI         = 2 * Math.PI;

// ─── Theme helpers ─────────────────────────────────────────────────────────────

/** Read a raw CSS custom property (e.g. "--primary") and wrap it in hsl(). */
function resolveCssVar(property: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(property)
    .trim();
  return raw ? `hsl(${raw})` : fallback;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
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
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
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
    const fontSize = Math.min(15, Math.max(10, 200 / n));
    ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
    const label = item.name.length > 14 ? item.name.slice(0, 13) + "…" : item.name;
    ctx.fillText(label, r - 16, fontSize / 3);
    ctx.restore();
  });

  // Hub — white outer ring with black shadow (intentional), primary-colored inner dot
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, TWO_PI);
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur  = 8;
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
  const cx  = canvas.width  / 2;
  const cy  = canvas.height / 2;
  const r   = Math.min(cx, cy) - 6;

  ctx.save();
  ctx.translate(cx, cy);
  const tipY = -(r + 2);
  ctx.beginPath();
  ctx.moveTo(0,   tipY + 26);
  ctx.lineTo(-10, tipY + 4);
  ctx.lineTo(10,  tipY + 4);
  ctx.closePath();
  // Pointer uses accent color — intentional design element; shadow is black (intentional)
  ctx.fillStyle  = accentColor;
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur  = 6;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HomeSpin() {
  const [, setLocation] = useLocation();
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

  const [seed,     setSeed]     = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner,   setWinner]   = useState<SpinItem | null>(null);

  const currentAngleRef = useRef(0);
  const [displayAngle,  setDisplayAngle]  = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number | null>(null);

  // Resolve canvas colors from theme; re-resolve on dark/light toggle.
  const [primaryColor, setPrimaryColor] = useState(
    () => resolveCssVar("--primary", "#1B4FD8")
  );
  const [accentColor, setAccentColor] = useState(
    () => resolveCssVar("--accent", "#F59E0B")
  );
  useEffect(() => {
    const update = () => {
      setPrimaryColor(resolveCssVar("--primary", "#1B4FD8"));
      setAccentColor(resolveCssVar("--accent", "#F59E0B"));
    };
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const locationReady =
    locationStatus === "granted" &&
    userLat !== null &&
    userLng !== null &&
    radius !== null;

  // Distance is applied before random selection, so every wheel slot is nearby.
  const spinItems = useMemo<SpinItem[]>(() => {
    if (!locationReady) return [];
    return shuffled(
      allListings.flatMap((listing) => {
        if (!hasValidCoordinates(listing.lat, listing.lng)) return [];
        const distanceMi = haversineDistanceMi(
          userLat,
          userLng,
          listing.lat,
          listing.lng,
        );
        if (distanceMi > radius) return [];
        return [{
          id: listing.id,
          name: listing.name,
          color: listing.color,
          distanceMi,
        }];
      })
    ).slice(0, MAX_SLOTS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allListings, locationReady, radius, seed, userLat, userLng]);

  // ── Draw ────────────────────────────────────────────────────────────────────

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
    const parent = canvas.parentElement!;
    const size = Math.min(parent.clientWidth, 440);
    canvas.width  = size;
    canvas.height = size;
    redraw(currentAngleRef.current);
  }, [spinItems, redraw]);

  useEffect(() => { redraw(displayAngle); }, [displayAngle, redraw]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // ── Spin ────────────────────────────────────────────────────────────────────

  const handleSpin = () => {
    if (spinning || spinItems.length === 0) return;
    setWinner(null);
    setSpinning(true);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const n         = spinItems.length;
    const slice     = TWO_PI / n;
    const winnerIdx = Math.floor(Math.random() * n);

    const targetNorm  = ((-(winnerIdx + 0.5) * slice) % TWO_PI + TWO_PI) % TWO_PI;
    const currentNorm = ((currentAngleRef.current % TWO_PI) + TWO_PI) % TWO_PI;
    let delta = targetNorm - currentNorm;
    if (delta < 0.01) delta += TWO_PI;

    const totalTarget = currentAngleRef.current + delta + (SPIN_ROTATIONS - 1) * TWO_PI;
    const startAngle  = currentAngleRef.current;
    const startTime   = { v: -1 };
    const snapshot    = spinItems.slice();
    const snapPrimary = primaryColor;
    const snapAccent  = accentColor;

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

  const handleReset = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    currentAngleRef.current = 0;
    setDisplayAngle(0);
    setWinner(null);
  };

  const handleReshuffle = () => {
    if (spinning) return;
    handleReset();
    setSeed(s => s + 1);
  };

  const handleLocationRequest = () => {
    if (spinning) return;
    handleReset();
    requestLocation();
  };

  const handleLocationClear = () => {
    if (spinning) return;
    handleReset();
    clearLocation();
  };

  const handleRadiusChange = (nextRadius: RadiusMiles) => {
    if (spinning) return;
    handleReset();
    setRadius(nextRadius);
  };

  const winnerListing: Listing | undefined = winner
    ? allListings.find(l => l.id === winner.id)
    : undefined;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <section className="relative bg-primary overflow-hidden">
      {/* subtle dot-grid background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-60" />

      <div className="container mx-auto px-4 py-14 md:py-20 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* ── Left: copy ── */}
          <div className="flex-1 text-center lg:text-left">
            <Badge className="mb-6 bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-md px-4 py-1.5 text-sm font-bold inline-flex items-center gap-2 shadow-sm">
              <Shuffle className="w-4 h-4" />
              Can't decide?
            </Badge>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-white tracking-tight leading-[1.05] mb-6 drop-shadow-sm">
              Let the wheel pick<br className="hidden md:block" />
              <span className="text-accent italic"> your next meal.</span>
            </h1>

            <p className="text-primary-foreground/80 text-lg md:text-xl max-w-md mx-auto lg:mx-0 mb-8 leading-relaxed">
              Nearby Bay Area spots, one spin. Choose your distance and let the wheel decide.
            </p>

            <div className="max-w-md mx-auto lg:mx-0 mb-8 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-5 text-left shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 shadow-inner">
                  <Navigation className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white mb-0.5">
                    {locationStatus === "granted" ? "Using your current location" : "Find a meal near you"}
                  </p>
                  <p className="text-xs text-white/65">
                    {locationStatus === "requesting"
                      ? "Getting your location…"
                      : locationStatus === "denied"
                        ? "Location was denied. Allow access and try again."
                        : locationStatus === "unavailable"
                          ? "Location is unavailable in this browser."
                          : locationStatus === "granted"
                            ? "Every recommendation stays inside your preferred distance."
                            : "Location is required before spinning."}
                  </p>
                </div>
                {locationStatus === "granted" ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleLocationRequest}
                      disabled={spinning}
                      className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-40"
                      aria-label="Refresh location"
                      data-testid="home-spin-refresh-location"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleLocationClear}
                      disabled={spinning}
                      className="text-xs text-white/70 hover:text-white underline disabled:opacity-40"
                      data-testid="home-spin-clear-location"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleLocationRequest}
                    disabled={spinning || locationStatus === "requesting" || locationStatus === "unavailable"}
                    className="rounded-full bg-white text-primary hover:bg-white/90 shrink-0 gap-1.5"
                    data-testid="home-spin-use-location"
                  >
                    {locationStatus === "requesting" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Navigation className="w-3.5 h-3.5" />
                    )}
                    {locationStatus === "requesting" ? "Locating…" : "Use location"}
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
                {RADIUS_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleRadiusChange(option)}
                    disabled={spinning}
                    className={`px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all disabled:opacity-40 ${
                      radius === option
                        ? "bg-accent text-accent-foreground border-accent shadow-sm scale-105"
                        : "border-white/20 text-white/80 hover:text-white hover:border-white/40 hover:bg-white/5"
                    }`}
                    data-testid={`home-spin-radius-${option}`}
                  >
                    {option} mi
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 justify-center lg:justify-start flex-wrap">
              <Button
                size="lg"
                onClick={handleSpin}
                disabled={spinning || spinItems.length === 0}
                className="rounded-full px-10 text-base font-bold gap-2 bg-accent text-accent-foreground hover:bg-accent/90 min-w-36 shadow-lg shadow-black/20"
              >
                {spinning ? (
                  <>
                    <span className="w-4 h-4 border-2 border-accent-foreground/40 border-t-accent-foreground rounded-full animate-spin" />
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
                  className="rounded-full px-6 gap-2 border-white/20 text-white hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
              )}

              <Button
                size="lg"
                variant="ghost"
                onClick={handleReshuffle}
                disabled={spinning}
                className="rounded-full px-5 gap-2 text-white/70 hover:text-white hover:bg-white/10"
                title="Pick 10 different spots"
              >
                <RefreshCw className="w-4 h-4" />
                New selection
              </Button>
            </div>

            {/* Result card */}
            <AnimatePresence>
              {winner && !spinning && (
                <motion.div
                  key={winner.id}
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-8 text-left"
                >
                  <div className="rounded-2xl overflow-hidden shadow-2xl bg-background max-w-sm mx-auto lg:mx-0">
                    <div className="h-1.5" style={{ backgroundColor: winnerListing?.color ?? winner.color }} />
                    <div className="p-5">
                      {winnerListing ? (
                        <>
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-base shrink-0"
                              style={{ backgroundColor: winnerListing.color }}
                            >
                              {winnerListing.initials}
                            </div>
                            <div>
                              <h3 className="text-2xl font-serif font-bold tracking-tight leading-tight">{winnerListing.name}</h3>
                              <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mt-1">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {winnerListing.neighborhood}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mb-4 mt-2">
                            <Badge variant="outline" className="capitalize text-xs font-semibold px-2">
                              {winnerListing.category.replace("-", " ")}
                            </Badge>
                            <Badge variant="secondary" className="text-xs font-bold px-2">{winnerListing.priceRange}</Badge>
                            {winner.distanceMi !== undefined && (
                              <Badge className="text-xs gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/10">
                                <Navigation className="w-3 h-3" />
                                {winner.distanceMi < 0.1 ? "< 0.1 mi" : `${winner.distanceMi.toFixed(1)} mi`}
                              </Badge>
                            )}
                            <div className="flex items-center gap-1 text-sm ml-auto">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span className="font-bold">{winnerListing.rating}</span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-5">{winnerListing.description}</p>
                          <Button
                            className="w-full gap-2 rounded-xl font-bold h-11"
                            onClick={() => setLocation(`/listing/${winnerListing.id}`)}
                          >
                            <ExternalLink className="w-4 h-4" />
                            View full listing
                          </Button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 py-4">
                          <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-serif italic font-bold text-2xl shadow-inner"
                            style={{ backgroundColor: winner.color }}
                          >
                            {winner.name.slice(0, 2).toUpperCase()}
                          </div>
                          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">The wheel chose</p>
                          <h3 className="text-3xl font-serif font-bold">{winner.name}</h3>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Right: wheel ── */}
          <div className="shrink-0 w-full max-w-[340px] lg:max-w-[400px]">
            <div className="relative w-full">
              <canvas
                ref={canvasRef}
                className="w-full h-auto rounded-full"
                style={{
                  filter: spinning
                    ? "drop-shadow(0 0 28px rgba(245,158,11,0.5))"
                    : "drop-shadow(0 8px 24px rgba(0,0,0,0.3))",
                  transition: "filter 0.3s",
                }}
              />
            </div>
            <p className="text-center text-white/50 text-xs mt-3">
              {locationReady
                ? `${spinItems.length} nearby ${spinItems.length === 1 ? "spot" : "spots"} within ${radius} mi`
                : locationStatus === "requesting"
                  ? "Getting your location…"
                  : radius === null
                    ? "Choose a distance and enable location"
                    : "Enable location to see nearby spots"}
              {spinItems.length > 0 && (
                <> · <button onClick={handleReshuffle} disabled={spinning} className="underline hover:text-white/80 transition-colors disabled:opacity-40">Reshuffle</button></>
              )}
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
