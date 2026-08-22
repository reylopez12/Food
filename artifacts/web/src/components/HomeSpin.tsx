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
  if (!raw) return fallback;
  const parts = raw.split(/\s+/);
  if (parts.length >= 3) {
    return `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`;
  }
  return `hsl(${raw})`;
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
    () => resolveCssVar("--primary", "#DE6B48")
  );
  const [accentColor, setAccentColor] = useState(
    () => resolveCssVar("--secondary", "#F4B952") // secondary is yellow now
  );
  useEffect(() => {
    const update = () => {
      setPrimaryColor(resolveCssVar("--primary", "#DE6B48"));
      setAccentColor(resolveCssVar("--secondary", "#F4B952"));
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

  // Show random directory picks by default; opt-in location and radius narrow them to nearby spots.
  const spinItems = useMemo<SpinItem[]>(() => {
    if (!locationReady) {
      return shuffled(
        allListings.map((listing) => ({
          id: listing.id,
          name: listing.name,
          color: listing.color,
        }))
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
    <section className="relative bg-primary overflow-hidden border-t border-primary/20">
      {/* subtle dot-grid background */}
      <div className="absolute inset-0 bg-primary" />
      <div className="absolute inset-0 opacity-10 mix-blend-overlay bg-noise pointer-events-none" />

      <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24">

          {/* ── Left: copy ── */}
          <div className="flex-1 text-center lg:text-left max-w-lg">
            <p className="text-xs font-mono font-bold tracking-widest uppercase text-primary-foreground/60 mb-4">
              Not sure what you're craving?
            </p>

            <h2 className="text-5xl md:text-6xl font-serif font-bold text-primary-foreground tracking-tight leading-[1.05] mb-6">
              Let the city pick.
            </h2>

            <p className="text-primary-foreground/80 text-lg mb-8 leading-relaxed max-w-sm mx-auto lg:mx-0">
              One tap. One local favorite. No scrolling required.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start mb-8">
              <Button
                size="lg"
                onClick={handleSpin}
                disabled={spinning || spinItems.length === 0}
                className="rounded-full px-10 text-base font-bold gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 min-w-36 h-14"
              >
                {spinning ? (
                  <>
                    <span className="w-4 h-4 border-2 border-secondary-foreground/40 border-t-secondary-foreground rounded-full animate-spin" />
                    Spinning…
                  </>
                ) : (
                  "Spin for a spot"
                )}
              </Button>
            </div>

            <div className="max-w-sm mx-auto lg:mx-0 p-4 border border-white/20 rounded-2xl bg-white/5">
              <div className="flex items-center justify-between gap-4 mb-3">
                <span className="text-xs font-bold text-white/80 uppercase tracking-widest">Radius</span>
                {locationStatus !== "granted" && (
                  <button onClick={handleLocationRequest} className="text-xs font-bold text-white underline hover:text-secondary transition-colors">
                    {locationStatus === "requesting" ? "Locating..." : "Enable Location"}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {RADIUS_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleRadiusChange(option)}
                    disabled={spinning}
                    className={`flex-1 py-1.5 rounded-full border text-xs font-bold transition-all disabled:opacity-40 ${
                      radius === option
                        ? "bg-white text-primary border-white"
                        : "border-white/20 text-white hover:border-white/40 hover:bg-white/10"
                    }`}
                  >
                    {option} mi
                  </button>
                ))}
              </div>
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
                              <Star className="w-3.5 h-3.5 fill-secondary text-secondary" />
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
                    ? `drop-shadow(0 0 28px color-mix(in srgb, ${accentColor} 55%, transparent))`
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
                  : `${spinItems.length} random directory ${spinItems.length === 1 ? "pick" : "picks"} · enable location to focus nearby`}
              {spinItems.length > 0 && (
                <>
                  {" · "}
                  <button onClick={handleReshuffle} disabled={spinning} className="underline hover:text-white/80 transition-colors disabled:opacity-40">
                    Reshuffle
                  </button>
                </>
              )}
              {winner && !spinning && (
                <>
                  {" · "}
                  <button onClick={handleReset} className="underline hover:text-white/80 transition-colors">
                    Reset
                  </button>
                </>
              )}
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
