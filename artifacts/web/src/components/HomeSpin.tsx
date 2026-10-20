import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { ExternalLink, Star, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useListings } from "@workspace/api-client-react";
import type { Venue as Listing } from "@workspace/api-client-react";
import {
  hasValidCoordinates,
  haversineDistanceMi,
  useNearMe,
  type RadiusMiles,
} from "../hooks/useNearMe";
import {
  customSpinItems,
  emptyCustomEntries,
  matchesPriceTier,
  shuffled,
  updateCustomEntry,
  type PriceFilter,
} from "@/lib/spinWheel";
import { HomeSpinControls, type WheelEditor } from "./spin/HomeSpinControls";
import { CustomChoicesPanel } from "./spin/CustomChoicesPanel";
import { useWheelSound } from "@/hooks/useWheelSound";
import { WheelSoundToggle } from "./spin/WheelSoundToggle";
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
  const dpr = Number(canvas.dataset.dpr) || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
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
  const dpr = Number(canvas.dataset.dpr) || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cx  = canvas.width  / dpr / 2;
  const cy  = canvas.height / dpr / 2;
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
  const sound = useWheelSound();
  const [, setLocation] = useLocation();
  const { data: allListings = [], isPending, isError, refetch } = useListings();
  const {
    status: locationStatus,
    userLat,
    userLng,
    radius,
    requestLocation,
    setRadius,
  } = useNearMe();

  const [editor,        setEditor]        = useState<WheelEditor>("distance");
  const [priceFilter,   setPriceFilter]   = useState<PriceFilter>("any");
  const [customEntries, setCustomEntries] = useState<string[]>(emptyCustomEntries);
  const [seed,     setSeed]     = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner,   setWinner]   = useState<SpinItem | null>(null);

  const currentAngleRef = useRef(0);
  const spinningRef     = useRef(false);
  const [displayAngle,  setDisplayAngle]  = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number | null>(null);

  const [primaryColor, setPrimaryColor] = useState(
    () => resolveCssVar("--primary", "#DE6B48")
  );
  const [accentColor, setAccentColor] = useState(
    () => resolveCssVar("--secondary", "#F4B952")
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

  const isCustom = editor === "custom";

  // No radius: random directory picks (price still applies; "any" includes unspecified tiers).
  // Explicit radius: only known-coordinate venues inside it, never an all-directory fallback.
  const spinItems = useMemo<SpinItem[]>(() => {
    if (radius === null) {
      return shuffled(
        allListings
          .filter((listing) => matchesPriceTier(listing.priceRange, priceFilter))
          .map((listing) => ({ id: listing.id, name: listing.name, color: listing.color }))
      ).slice(0, MAX_SLOTS);
    }
    if (!locationReady) return [];
    return shuffled(
      allListings.flatMap((listing) => {
        if (!matchesPriceTier(listing.priceRange, priceFilter)) return [];
        if (!hasValidCoordinates(listing.lat, listing.lng)) return [];
        const distanceMi = haversineDistanceMi(userLat, userLng, listing.lat, listing.lng);
        if (distanceMi > radius) return [];
        return [{ id: listing.id, name: listing.name, color: listing.color, distanceMi }];
      })
    ).slice(0, MAX_SLOTS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allListings, locationReady, radius, priceFilter, seed, userLat, userLng]);

  const customItems = useMemo<SpinItem[]>(() => customSpinItems(customEntries), [customEntries]);
  const wheelItems = isCustom ? customItems : spinItems;

  const mappedCount = useMemo(
    () => allListings.filter((l) => hasValidCoordinates(l.lat, l.lng)).length,
    [allListings],
  );

  // ── Draw ────────────────────────────────────────────────────────────────────

  const redraw = useCallback(
    (angle: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      drawWheel(canvas, wheelItems, angle, primaryColor);
      drawPointer(canvas, accentColor);
    },
    [wheelItems, primaryColor, accentColor]
  );
  const redrawRef = useRef(redraw);
  redrawRef.current = redraw;

  // Resize on window and container changes (custom panel opening narrows the column).
  // While spinning, the animation loop owns painting from its snapshot.
  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const fit = () => {
      const size = Math.max(1, Math.min(parent.clientWidth, 440));
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = Math.round(size * dpr);
      if (canvas.width === w && canvas.dataset.dpr === String(dpr)) return;
      canvas.width  = w;
      canvas.height = w;
      canvas.dataset.dpr = String(dpr);
      if (!spinningRef.current) redrawRef.current(currentAngleRef.current);
    };
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro?.observe(parent);
    window.addEventListener("resize", fit);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);

  useEffect(() => {
    if (!spinningRef.current) redraw(displayAngle);
  }, [displayAngle, redraw]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // ── Spin ────────────────────────────────────────────────────────────────────

  const handleSpin = () => {
    if (spinningRef.current || wheelItems.length === 0) return;
    sound.start(currentAngleRef.current, wheelItems.length);
    spinningRef.current = true;
    setWinner(null);
    setSpinning(true);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const n         = wheelItems.length;
    const slice     = TWO_PI / n;
    const winnerIdx = Math.floor(Math.random() * n);

    const targetNorm  = ((-(winnerIdx + 0.5) * slice) % TWO_PI + TWO_PI) % TWO_PI;
    const currentNorm = ((currentAngleRef.current % TWO_PI) + TWO_PI) % TWO_PI;
    let delta = targetNorm - currentNorm;
    if (delta < 0.01) delta += TWO_PI;

    const totalTarget = currentAngleRef.current + delta + (SPIN_ROTATIONS - 1) * TWO_PI;
    const startAngle  = currentAngleRef.current;
    const startTime   = { v: -1 };
    const snapshot    = wheelItems.slice();
    const snapPrimary = primaryColor;
    const snapAccent  = accentColor;

    const animate = (ts: number) => {
      if (startTime.v < 0) startTime.v = ts;
      const t       = Math.min((ts - startTime.v) / SPIN_DURATION, 1);
      const current = startAngle + (totalTarget - startAngle) * easeOut(t);
      sound.tick(current);

      const canvas = canvasRef.current;
      if (canvas) {
        drawWheel(canvas, snapshot, current, snapPrimary);
        drawPointer(canvas, snapAccent);
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        spinningRef.current = false;
        currentAngleRef.current = totalTarget;
        setDisplayAngle(totalTarget);
        setSpinning(false);
        setWinner(snapshot[winnerIdx]);
        sound.finish();
      }
    };
    rafRef.current = requestAnimationFrame(animate);
  };

  const handleReset = () => {
    if (spinningRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    currentAngleRef.current = 0;
    setDisplayAngle(0);
    setWinner(null);
  };

  /** Run a wheel-changing action only when idle, clearing any obsolete winner/angle. */
  const guarded = (action: () => void) => {
    if (spinningRef.current) return;
    handleReset();
    action();
  };

  const handleEditorChange = (next: WheelEditor) => {
    if (spinningRef.current || next === editor) return;
    // Switching between directory editors keeps the same wheel; entering/leaving custom changes source.
    if ((next === "custom") !== isCustom) handleReset();
    setEditor(next);
  };

  const handleRadiusChange = (next: RadiusMiles) => guarded(() => setRadius(next));
  const handleClearRadius  = () => guarded(() => setRadius(null));
  const handlePriceChange  = (next: PriceFilter) => guarded(() => setPriceFilter(next));
  const handleReshuffle    = () => guarded(() => setSeed((s) => s + 1));
  const handleLocationRequest = () => guarded(requestLocation);
  const handleEntryChange  = (i: number, value: string) =>
    guarded(() => setCustomEntries((prev) => updateCustomEntry(prev, i, value)));
  const handleEntriesReset = () => guarded(() => setCustomEntries(emptyCustomEntries()));

  const winnerListing: Listing | undefined =
    winner && !isCustom
      ? allListings.find(l => l.id === winner.id)
      : undefined;

  // ── Empty state copy ────────────────────────────────────────────────────────

  const priceLabel = priceFilter === "any" ? "" : ` at ${priceFilter}`;
  let emptyMessage = "";
  if (wheelItems.length === 0) {
    if (isCustom) emptyMessage = "Type at least one choice beside the wheel to spin.";
    else if (isPending) emptyMessage = "Loading restaurant choices…";
    else if (isError) emptyMessage = "Restaurant choices couldn't load. Please try again.";
    else if (allListings.length === 0) emptyMessage = "No restaurant listings are available yet. You can still spin your own choices.";
    else if (radius !== null && locationStatus === "requesting") emptyMessage = `Finding your location to keep picks within ${radius} mi…`;
    else if (radius !== null && locationStatus === "denied") emptyMessage = `Location is blocked, so nothing can be checked against ${radius} mi. Allow it in your browser, or clear the distance.`;
    else if (radius !== null && locationStatus === "unavailable") emptyMessage = `This browser can't share location, so the ${radius} mi distance can't be applied. Clear the distance to spin the directory.`;
    else if (radius !== null && !locationReady) emptyMessage = `Turn on location to spin spots within ${radius} mi.`;
    else if (radius !== null && mappedCount === 0) emptyMessage = "No restaurants have mapped locations yet, so none can match a distance. Clear the distance to spin the whole directory.";
    else if (radius !== null) emptyMessage = `No mapped restaurants within ${radius} mi${priceLabel}. Try a wider distance or another price.`;
    else emptyMessage = `No restaurants are listed${priceLabel}. Try another price.`;
  }

  const wheelCaption = isCustom
    ? `${customItems.length} custom ${customItems.length === 1 ? "choice" : "choices"}`
    : radius !== null
      ? locationReady
        ? `${spinItems.length} nearby ${spinItems.length === 1 ? "spot" : "spots"} within ${radius} mi${priceLabel}`
        : locationStatus === "requesting"
          ? "Getting your location…"
          : `Waiting on location for ${radius} mi`
      : `${spinItems.length} random directory ${spinItems.length === 1 ? "pick" : "picks"}${priceLabel}`;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <section className="relative bg-primary overflow-hidden border-t border-primary/20">
      <div className="absolute inset-0 bg-primary" />
      <div className="absolute inset-0 opacity-10 mix-blend-overlay bg-noise pointer-events-none" />

      <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
        <div className={`flex flex-col lg:flex-row items-center lg:items-start justify-center gap-12 ${isCustom ? "lg:gap-12" : "lg:gap-24"}`}>

          {/* ── Left: copy + controls ── */}
          <div className="flex-1 min-w-0 text-center lg:text-left max-w-lg">
            <p className="text-xs font-mono font-bold tracking-widest uppercase text-primary-foreground/60 mb-4">
              Not sure what you're craving?
            </p>

            <h2 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-primary-foreground tracking-tight leading-[1.05] mb-6">
              Let the city pick.
            </h2>

            <p className="text-primary-foreground/80 text-lg mb-8 leading-relaxed max-w-sm mx-auto lg:mx-0">
              One tap. One local favorite. No scrolling required.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start mb-8">
              <Button
                size="lg"
                onClick={handleSpin}
                disabled={spinning || wheelItems.length === 0}
                className="rounded-full px-10 text-base font-bold gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 min-w-36 h-14"
                data-testid="button-home-spin"
              >
                {spinning ? (
                  <>
                    <span className="w-4 h-4 border-2 border-secondary-foreground/40 border-t-secondary-foreground rounded-full animate-spin" />
                    Spinning…
                  </>
                ) : isCustom ? "Spin my choices" : "Spin for a spot"}
              </Button>
            </div>

            {wheelItems.length === 0 && !isCustom && (
              <div role="status" className="mb-6 max-w-sm mx-auto lg:mx-0 text-primary-foreground" data-testid="status-home-spin-empty">
                <p className="text-sm mb-3">{emptyMessage}</p>
                {!isPending && (
                  <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                    {isError && <Button variant="secondary" onClick={() => void refetch()}>Retry loading</Button>}
                    {radius !== null && (locationStatus === "idle" || locationStatus === "denied") && (
                      <Button variant="secondary" onClick={handleLocationRequest}>Enable location</Button>
                    )}
                    {radius !== null && allListings.length > 0 && (
                      <Button variant="secondary" onClick={handleClearRadius}>Clear distance</Button>
                    )}
                    {priceFilter !== "any" && (
                      <Button variant="secondary" onClick={() => handlePriceChange("any")}>Any price</Button>
                    )}
                    <Button variant="secondary" onClick={() => handleEditorChange("custom")}>Use my own choices</Button>
                  </div>
                )}
              </div>
            )}

            <div className="mb-4 flex justify-center lg:justify-start">
              <WheelSoundToggle {...sound} />
            </div>

            <HomeSpinControls
              editor={editor}
              disabled={spinning}
              radius={radius}
              priceFilter={priceFilter}
              locationStatus={locationStatus}
              onEditorChange={handleEditorChange}
              onRadiusChange={handleRadiusChange}
              onClearRadius={handleClearRadius}
              onPriceChange={handlePriceChange}
              onRequestLocation={handleLocationRequest}
            />

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
                  <div className="rounded-2xl overflow-hidden shadow-2xl bg-background max-w-sm mx-auto lg:mx-0" data-testid="card-home-spin-winner">
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
                            {winnerListing.priceRange && (
                              <Badge variant="secondary" className="text-xs font-bold px-2">{winnerListing.priceRange}</Badge>
                            )}
                            {winner.distanceMi !== undefined && (
                              <Badge className="text-xs gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/10">
                                <Navigation className="w-3 h-3" />
                                {winner.distanceMi < 0.1 ? "< 0.1 mi" : `${winner.distanceMi.toFixed(1)} mi`}
                              </Badge>
                            )}
                            {winnerListing.rating > 0 && (
                              <div className="flex items-center gap-1 text-sm ml-auto">
                                <Star className="w-3.5 h-3.5 fill-secondary text-secondary" />
                                <span className="font-bold">{winnerListing.rating}</span>
                              </div>
                            )}
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
                          <h3 className="text-3xl font-serif font-bold text-center break-words">{winner.name}</h3>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Right: wheel (+ custom panel beside it) ── */}
          <div className={`w-full flex flex-col items-center gap-8 ${isCustom ? "md:flex-row md:items-start md:justify-center lg:w-auto" : "lg:w-auto"}`}>
            <div className={`shrink-0 w-full max-w-[340px] ${isCustom ? "md:max-w-[300px] xl:max-w-[360px]" : "lg:max-w-[400px] lg:w-[400px]"}`}>
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
                {wheelItems.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center px-12 text-center text-white">
                    <span className="font-semibold text-base">
                      {isCustom ? "Add a choice to fill the wheel" : isPending ? "Loading choices…" : "Nothing on the wheel yet"}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-center text-white/60 text-xs mt-3" data-testid="text-wheel-caption">
                {wheelCaption}
                {!isCustom && spinItems.length > 0 && (
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

            <AnimatePresence initial={false}>
              {isCustom && (
                <motion.div
                  key="custom-panel"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full max-w-[340px] md:w-auto"
                >
                  <CustomChoicesPanel
                    entries={customEntries}
                    filledCount={customItems.length}
                    disabled={spinning}
                    onChange={handleEntryChange}
                    onReset={handleEntriesReset}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </section>
  );
}
