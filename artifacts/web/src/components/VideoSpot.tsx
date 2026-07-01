/**
 * VideoSpot — animated commercial loop for a single listing's signature dish.
 *
 * Phases (total ~13 s, then loops):
 *   0.0 – 0.8  : black screen fade-in
 *   0.8 – 2.5  : restaurant name + neighborhood slide up
 *   2.5 – 4.5  : dish name SLAM (big text punches in)
 *   4.5 – 7.5  : three descriptor lines stagger in
 *   7.5 – 10.0 : tagline fades in over color wash
 *   10.0 – 12.0: hold
 *   12.0 – 13.0: fade to black → loop
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Venue as Listing } from "@workspace/api-client-react";

type Phase = "black" | "intro" | "dish" | "descriptors" | "tagline" | "hold" | "fadeout";

interface VideoSpotProps {
  listing: Listing;
  /** If false the animation stays paused on the first frame */
  playing?: boolean;
}

const PHASE_DURATIONS: Record<Phase, number> = {
  black:       800,
  intro:       1700,
  dish:        2000,
  descriptors: 3000,
  tagline:     2500,
  hold:        2000,
  fadeout:     1000,
};

const PHASE_ORDER: Phase[] = ["black", "intro", "dish", "descriptors", "tagline", "hold", "fadeout"];

function useAnimationPhase(playing: boolean) {
  const [phase, setPhase] = useState<Phase>("black");
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (!playing) return;

    let cancelled = false;
    let idx = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const advance = () => {
      if (cancelled) return;
      const p = PHASE_ORDER[idx];
      setPhase(p);
      const duration = PHASE_DURATIONS[p];
      idx = (idx + 1) % PHASE_ORDER.length;

      if (idx === 0) {
        const t = setTimeout(() => {
          if (!cancelled) setCycle(c => c + 1);
        }, duration);
        timers.push(t);
      } else {
        const t = setTimeout(advance, duration);
        timers.push(t);
      }
    };

    advance();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [playing, cycle]);

  return phase;
}

export function VideoSpot({ listing, playing = true }: VideoSpotProps) {
  const phase = useAnimationPhase(playing);
  const video = listing.video!;
  const accent = video.accentColor;
  const bg = listing.color;

  const showIntro      = ["intro", "dish", "descriptors", "tagline", "hold"].includes(phase);
  const showDish       = ["dish", "descriptors", "tagline", "hold"].includes(phase);
  const showDescriptors = ["descriptors", "tagline", "hold"].includes(phase);
  const showTagline    = ["tagline", "hold"].includes(phase);
  const isFadingOut    = phase === "fadeout" || phase === "black";

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl select-none"
      style={{ aspectRatio: "16 / 9", backgroundColor: "#000" }}
    >
      {/* Background color wash */}
      <motion.div
        className="absolute inset-0"
        style={{ backgroundColor: bg }}
        animate={{ opacity: isFadingOut ? 0 : 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />

      {/* Diagonal accent stripe */}
      <motion.div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        initial={false}
        animate={{ opacity: showDish ? 0.12 : 0 }}
        transition={{ duration: 0.5 }}
      >
        <div
          className="absolute"
          style={{
            backgroundColor: accent,
            width: "200%",
            height: "60%",
            bottom: "-10%",
            left: "-50%",
            transform: "rotate(-8deg)",
          }}
        />
      </motion.div>

      {/* Fade-to-black overlay */}
      <motion.div
        className="absolute inset-0 bg-black pointer-events-none z-20"
        animate={{ opacity: isFadingOut ? 1 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-8 z-10">
        {/* Top: restaurant name + neighborhood */}
        <AnimatePresence>
          {showIntro && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-col gap-1"
            >
              <span
                className="text-xs md:text-sm font-semibold tracking-widest uppercase"
                style={{ color: accent }}
              >
                {listing.neighborhood} · {listing.city}
              </span>
              <span className="text-white text-base md:text-lg font-bold tracking-tight">
                {listing.name}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center: dish name */}
        <div className="flex-1 flex items-center justify-center">
          <AnimatePresence>
            {showDish && (
              <motion.div
                key="dish"
                initial={{ opacity: 0, scale: 0.7, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="text-center px-4"
              >
                <h2
                  className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-none tracking-tight"
                  style={{ textShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
                >
                  {video.dish}
                </h2>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom: descriptors + tagline */}
        <div className="flex flex-col gap-3">
          {/* Descriptor pills */}
          <AnimatePresence>
            {showDescriptors && (
              <motion.div
                key="descriptors"
                className="flex flex-wrap gap-2"
                initial="hidden"
                animate="show"
                exit={{ opacity: 0 }}
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.15 } },
                }}
              >
                {video.descriptors.map((d, i) => (
                  <motion.span
                    key={i}
                    variants={{
                      hidden: { opacity: 0, y: 10, scale: 0.9 },
                      show:   { opacity: 1, y: 0,  scale: 1 },
                    }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="text-xs md:text-sm font-semibold px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.15)",
                      color: "#fff",
                      backdropFilter: "blur(6px)",
                    }}
                  >
                    {d}
                  </motion.span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tagline */}
          <AnimatePresence>
            {showTagline && (
              <motion.p
                key="tagline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="text-sm md:text-base font-medium italic"
                style={{ color: accent }}
              >
                "{video.tagline}"
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* "NOW PLAYING" badge */}
      {playing && (
        <div
          className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-bold text-white tracking-widest uppercase">Live</span>
        </div>
      )}
    </div>
  );
}
