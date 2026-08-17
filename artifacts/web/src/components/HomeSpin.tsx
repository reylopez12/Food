import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { Shuffle, RotateCcw, RefreshCw, ExternalLink, Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useListings } from "@workspace/api-client-react";
import type { Venue as Listing } from "@workspace/api-client-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SpinItem = { id: string; name: string; color: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_SLOTS      = 10;
const SPIN_ROTATIONS = 8;
const SPIN_DURATION  = 4200;
const TWO_PI         = 2 * Math.PI;

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

function drawWheel(canvas: HTMLCanvasElement, items: SpinItem[], angle: number) {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  const cx = width / 2;
  const cy = height / 2;
  const r  = Math.min(cx, cy) - 6;
  const n  = items.length;

  ctx.clearRect(0, 0, width, height);
  if (n === 0) return;

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
    const label = item.name.length > 14 ? item.name.slice(0, 13) + "…" : item.name;
    ctx.fillText(label, r - 12, fontSize / 3);
    ctx.restore();
  });

  // Hub
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, TWO_PI);
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur  = 8;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, TWO_PI);
  ctx.fillStyle = "#1B4FD8";
  ctx.fill();

  ctx.restore();
}

function drawPointer(canvas: HTMLCanvasElement) {
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
  ctx.fillStyle  = "#F59E0B";
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

  const [seed,     setSeed]     = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner,   setWinner]   = useState<SpinItem | null>(null);

  const currentAngleRef = useRef(0);
  const [displayAngle,  setDisplayAngle]  = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number | null>(null);

  // Pick 10 random listings; reshuffles when seed changes
  const spinItems = useMemo<SpinItem[]>(() => {
    if (allListings.length === 0) return [];
    return shuffled(
      allListings.map(l => ({ id: l.id, name: l.name, color: l.color }))
    ).slice(0, MAX_SLOTS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allListings, seed]);

  // ── Draw ────────────────────────────────────────────────────────────────────

  const redraw = useCallback(
    (angle: number, override?: SpinItem[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      drawWheel(canvas, override ?? spinItems, angle);
      drawPointer(canvas);
    },
    [spinItems]
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

    const animate = (ts: number) => {
      if (startTime.v < 0) startTime.v = ts;
      const elapsed = ts - startTime.v;
      const t       = Math.min(elapsed / SPIN_DURATION, 1);
      const current = startAngle + (totalTarget - startAngle) * easeOut(t);

      const canvas = canvasRef.current;
      if (canvas) {
        drawWheel(canvas, snapshot, current);
        drawPointer(canvas);
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
            <Badge className="mb-5 bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-sm px-4 py-1.5 text-sm font-semibold inline-flex items-center gap-2">
              <Shuffle className="w-4 h-4" />
              Can't decide?
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight mb-5">
              Let the wheel pick<br className="hidden md:block" />
              <span className="text-accent"> your next meal.</span>
            </h1>

            <p className="text-primary-foreground/75 text-lg max-w-md mx-auto lg:mx-0 mb-8">
              10 Bay Area spots, one spin. No more endless scrolling — just tap and go.
            </p>

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
                              <h3 className="text-lg font-black tracking-tight leading-tight">{winnerListing.name}</h3>
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {winnerListing.neighborhood}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mb-3">
                            <Badge variant="outline" className="capitalize text-xs">
                              {winnerListing.category.replace("-", " ")}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">{winnerListing.priceRange}</Badge>
                            <div className="flex items-center gap-1 text-sm ml-auto">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span className="font-bold">{winnerListing.rating}</span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{winnerListing.description}</p>
                          <Button
                            className="w-full gap-2 rounded-xl"
                            onClick={() => setLocation(`/listing/${winnerListing.id}`)}
                          >
                            <ExternalLink className="w-4 h-4" />
                            View full listing
                          </Button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 py-4">
                          <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl"
                            style={{ backgroundColor: winner.color }}
                          >
                            {winner.name.slice(0, 2).toUpperCase()}
                          </div>
                          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">The wheel chose</p>
                          <h3 className="text-2xl font-black">{winner.name}</h3>
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
              {spinItems.length} randomly selected spots · <button onClick={handleReshuffle} disabled={spinning} className="underline hover:text-white/80 transition-colors disabled:opacity-40">Reshuffle</button>
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
