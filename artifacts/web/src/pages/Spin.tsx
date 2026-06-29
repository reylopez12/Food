import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Shuffle, RotateCcw, ExternalLink, Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LISTINGS, type Listing } from "../data/listings";

type Filter = "all" | "restaurants" | "food-trucks";

const FILTER_OPTIONS: { id: Filter; label: string }[] = [
  { id: "all",          label: "All" },
  { id: "restaurants",  label: "Restaurants" },
  { id: "food-trucks",  label: "Food Trucks" },
];

const SPIN_ROTATIONS = 8;   // full extra rotations added for drama
const SPIN_DURATION  = 4200; // ms
const TWO_PI = 2 * Math.PI;

// ─── Canvas drawing ───────────────────────────────────────────────────────────

/**
 * Draw the coloured wheel.
 *
 * Coordinate convention:
 *   ctx.rotate(angle) is applied before drawing the segments.
 *   Segment i spans  [i*slice - π/2 , (i+1)*slice - π/2]  (so segment 0 starts at the top).
 *   The amber pointer is drawn fixed at the top of the canvas (world-space angle -π/2).
 *
 * Landing math (to land segment `winnerIdx` under the top pointer):
 *   We need the centre of segment winnerIdx to coincide with world angle -π/2.
 *   Centre in rotated frame: -π/2 + (winnerIdx + 0.5) * slice
 *   World angle of centre:   angle + (-π/2 + (winnerIdx + 0.5) * slice) = -π/2
 *   ⟹  angle = -(winnerIdx + 0.5) * slice   (mod 2π)
 */
function drawWheel(canvas: HTMLCanvasElement, listings: Listing[], angle: number) {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  const cx = width / 2;
  const cy = height / 2;
  const r  = Math.min(cx, cy) - 6;
  const n  = listings.length;

  ctx.clearRect(0, 0, width, height);
  if (n === 0) return;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  const slice = TWO_PI / n;

  listings.forEach((listing, i) => {
    const start = i * slice - Math.PI / 2;
    const end   = start + slice;

    // Fill segment
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, start, end);
    ctx.closePath();
    ctx.fillStyle = listing.color;
    ctx.fill();

    // Divider line
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label — rotated to read along the segment
    const midAngle = start + slice / 2;
    ctx.save();
    ctx.rotate(midAngle);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    const fontSize = Math.min(14, Math.max(9, 200 / n));
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    const maxChars = 14;
    const label = listing.name.length > maxChars
      ? listing.name.slice(0, maxChars - 1) + "…"
      : listing.name;
    ctx.fillText(label, r - 12, fontSize / 3);
    ctx.restore();
  });

  // Hub circle
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, TWO_PI);
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Hub dot
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, TWO_PI);
  ctx.fillStyle = "#1B4FD8";
  ctx.fill();

  ctx.restore();
}

function drawPointer(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;
  const r  = Math.min(cx, cy) - 6;

  ctx.save();
  ctx.translate(cx, cy);

  // Amber downward-pointing triangle sitting just outside the top of the wheel
  const tipY = -(r + 2);
  ctx.beginPath();
  ctx.moveTo(0,   tipY + 26); // base-centre (inside wheel)
  ctx.lineTo(-10, tipY + 4);  // left
  ctx.lineTo(10,  tipY + 4);  // right
  ctx.closePath();
  ctx.fillStyle = "#F59E0B";
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur  = 6;
  ctx.fill();
  ctx.shadowBlur  = 0;
  ctx.restore();
}

// ─── Easing ───────────────────────────────────────────────────────────────────

/** Ease-out cubic */
function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function Spin() {
  const [, setLocation] = useLocation();

  const [filter,   setFilter]   = useState<Filter>("all");
  const [spinning, setSpinning] = useState(false);
  const [winner,   setWinner]   = useState<Listing | null>(null);

  // Running total angle (never modded — keeps continuity across spins)
  const currentAngleRef = useRef(0);
  const [displayAngle, setDisplayAngle] = useState(0); // triggers redraws

  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const rafRef         = useRef<number | null>(null);

  const listings = LISTINGS.filter(
    (l) => filter === "all" || l.category === filter
  );

  // ── Draw ──────────────────────────────────────────────────────────────────

  const redraw = useCallback(
    (angle: number, lsOverride?: Listing[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      drawWheel(canvas, lsOverride ?? listings, angle);
      drawPointer(canvas);
    },
    [listings]
  );

  // Size canvas + redraw on listing/angle change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = Math.min(canvas.parentElement!.clientWidth, 440);
    canvas.width  = size;
    canvas.height = size;
    redraw(currentAngleRef.current);
  }, [listings, redraw]);

  // Redraw whenever displayAngle changes (driven by RAF during spin)
  useEffect(() => {
    redraw(displayAngle);
  }, [displayAngle, redraw]);

  // Cleanup RAF on unmount
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // ── Spin ──────────────────────────────────────────────────────────────────

  const handleSpin = () => {
    if (spinning || listings.length === 0) return;

    setWinner(null);
    setSpinning(true);

    // Cancel any in-progress animation
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const n     = listings.length;
    const slice = TWO_PI / n;

    // Pick winner
    const winnerIdx = Math.floor(Math.random() * n);

    // Landing angle (normalized 0…2π):
    //   angle = -(winnerIdx + 0.5) * slice  (mod 2π)
    const targetNorm =
      (( -(winnerIdx + 0.5) * slice ) % TWO_PI + TWO_PI) % TWO_PI;

    // Current normalized position
    const currentNorm =
      (currentAngleRef.current % TWO_PI + TWO_PI) % TWO_PI;

    // Always rotate *forward*; guarantee at least a small arc
    let delta = targetNorm - currentNorm;
    if (delta < 0.01) delta += TWO_PI;

    // Total target = current + delta + (SPIN_ROTATIONS-1) extra loops
    const totalTarget = currentAngleRef.current + delta + (SPIN_ROTATIONS - 1) * TWO_PI;

    const startAngle  = currentAngleRef.current;
    const startTime   = { v: -1 };

    // Capture listings snapshot so filter changes mid-spin don't corrupt result
    const spinListings = listings.slice();

    const animate = (ts: number) => {
      if (startTime.v < 0) startTime.v = ts;
      const elapsed = ts - startTime.v;
      const t       = Math.min(elapsed / SPIN_DURATION, 1);
      const current = startAngle + (totalTarget - startAngle) * easeOut(t);

      // Draw with snapshot so a filter change doesn't corrupt the visual
      const canvas = canvasRef.current;
      if (canvas) {
        drawWheel(canvas, spinListings, current);
        drawPointer(canvas);
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        currentAngleRef.current = totalTarget;
        setDisplayAngle(totalTarget);
        setSpinning(false);
        setWinner(spinListings[winnerIdx]);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  };

  // ── Filter change ─────────────────────────────────────────────────────────

  const handleFilterChange = (f: Filter) => {
    if (spinning) return; // lock during spin
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    currentAngleRef.current = 0;
    setDisplayAngle(0);
    setFilter(f);
    setWinner(null);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────

  const handleReset = () => {
    if (spinning) return;
    currentAngleRef.current = 0;
    setDisplayAngle(0);
    setWinner(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center pb-20 pt-10 px-4 bg-background">
      {/* Header */}
      <div className="text-center mb-8 max-w-lg">
        <div className="inline-flex items-center gap-2 bg-accent/10 text-accent-foreground px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
          <Shuffle className="w-4 h-4" />
          Can't decide?
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3">
          Indecisive
        </h1>
        <p className="text-muted-foreground text-base">
          Spin the wheel. Let fate pick your next Bay Area meal.
        </p>
      </div>

      {/* Filter pills — disabled during spin */}
      <div className="flex items-center gap-2 mb-8 p-1 bg-muted rounded-full">
        {FILTER_OPTIONS.map((opt) => {
          const count = LISTINGS.filter(
            (l) => opt.id === "all" || l.category === opt.id
          ).length;
          return (
            <button
              key={opt.id}
              onClick={() => handleFilterChange(opt.id)}
              disabled={spinning}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
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

      {/* Wheel + controls */}
      <div className="flex flex-col items-center gap-6 w-full max-w-[440px]">
        <div className="relative w-full" style={{ maxWidth: 440 }}>
          <canvas
            ref={canvasRef}
            className="w-full h-auto rounded-full"
            style={{
              filter: spinning
                ? "drop-shadow(0 0 24px rgba(27,79,216,0.35))"
                : "drop-shadow(0 4px 16px rgba(0,0,0,0.12))",
              transition: "filter 0.3s",
            }}
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <Button
            size="lg"
            onClick={handleSpin}
            disabled={spinning || listings.length === 0}
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
      {listings.length === 0 && (
        <p className="mt-8 text-muted-foreground text-sm">
          No listings match this filter.
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
            {/* Accent bar */}
            <div
              className="h-1.5 rounded-t-2xl w-full"
              style={{ backgroundColor: winner.color }}
            />
            <div className="border border-t-0 rounded-b-2xl bg-card shadow-lg p-6">
              {/* Badges */}
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="capitalize">
                  {winner.category.replace("-", " ")}
                </Badge>
                <Badge variant="secondary">{winner.priceRange}</Badge>
                {winner.hasVideo && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-semibold">
                    ▶ Video
                  </Badge>
                )}
              </div>

              {/* Name + initials */}
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0"
                  style={{ backgroundColor: winner.color }}
                >
                  {winner.initials}
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight leading-tight">
                    {winner.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {winner.neighborhood}
                  </div>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-bold">{winner.rating}</span>
                <span className="text-muted-foreground text-sm">
                  ({winner.reviewCount.toLocaleString()} reviews)
                </span>
              </div>

              {/* Description snippet */}
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-5">
                {winner.description}
              </p>

              {/* CTA */}
              <Button
                className="w-full gap-2 rounded-xl"
                size="lg"
                onClick={() => setLocation(`/listing/${winner.id}`)}
              >
                <ExternalLink className="w-4 h-4" />
                View full listing
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
