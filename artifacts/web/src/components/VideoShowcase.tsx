/**
 * VideoShowcase — Home page "Now Playing" section.
 * Cycles through all hasVideo listings with nav arrows + dot indicators.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useLocation } from "wouter";
import { useListings } from "@workspace/api-client-react";
import { VideoSpot } from "./VideoSpot";

const AUTO_ADVANCE_MS = 14000; // slightly longer than one VideoSpot cycle

export function VideoShowcase() {
  const [, setLocation] = useLocation();
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const { data: allListings = [] } = useListings();

  const videoListings = allListings.filter(l => l.hasVideo && l.video);

  const goTo = useCallback((idx: number, total: number) => {
    setActiveIdx(((idx % total) + total) % total);
  }, []);

  const prev = () => goTo(activeIdx - 1, videoListings.length);
  const next = () => goTo(activeIdx + 1, videoListings.length);

  // Auto-advance
  useEffect(() => {
    if (!playing || videoListings.length === 0) return;
    const t = setInterval(() => goTo(activeIdx + 1, videoListings.length), AUTO_ADVANCE_MS);
    return () => clearInterval(t);
  }, [playing, activeIdx, goTo, videoListings.length]);

  if (videoListings.length === 0) return null;

  const activeListing = videoListings[activeIdx] ?? videoListings[0];

  return (
    <section className="bg-background py-16 md:py-24 border-y border-border/40">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-mono font-bold text-primary tracking-widest uppercase">Now Playing</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-foreground mb-4">Dish Showcases</h2>
            <p className="text-muted-foreground text-lg max-w-md leading-relaxed font-medium">
              The signature dishes that put these Bay Area spots on the map — brought to life.
            </p>
          </div>

          {/* Nav controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={prev}
              className="w-10 h-10 rounded-full border border-border/60 hover:border-foreground/30 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Dot indicators */}
            <div className="flex items-center gap-2">
              {videoListings.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i, videoListings.length)}
                  className="transition-all"
                  aria-label={`Go to ${videoListings[i].name}`}
                >
                  <span
                    className="block rounded-full transition-all"
                    style={{
                      width: i === activeIdx ? 20 : 6,
                      height: 6,
                      backgroundColor: i === activeIdx ? "hsl(var(--primary))" : "hsl(var(--border))",
                    }}
                  />
                </button>
              ))}
            </div>

            <button
              onClick={next}
              className="w-10 h-10 rounded-full border border-border/60 hover:border-foreground/30 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main layout: video left, info right */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
          {/* Video player */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeListing.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.4 }}
              >
                <VideoSpot listing={activeListing} playing={playing} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sidebar: listing info + thumbnail queue */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Active listing info */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeListing.id + "-info"}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.35 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs font-mono font-bold uppercase tracking-widest"
                    style={{ color: activeListing.video!.accentColor }}
                  >
                    {activeListing.neighborhood}
                  </span>
                  <span className="text-border">·</span>
                  <span className="text-muted-foreground text-xs font-medium capitalize">{activeListing.category.replace('-', ' ')}</span>
                </div>
                <h3 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">{activeListing.name}</h3>
                <p className="text-muted-foreground text-base leading-relaxed line-clamp-3 mb-2 font-medium">{activeListing.description}</p>
                <button
                  onClick={() => setLocation(`/listing/${activeListing.id}`)}
                  className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full border border-border/80 hover:border-foreground/30 text-muted-foreground hover:text-foreground transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  View listing
                </button>
              </motion.div>
            </AnimatePresence>

            {/* Up-next queue */}
            <div className="space-y-2">
              <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-4">Up Next</p>
              {videoListings.filter((_, i) => i !== activeIdx).slice(0, 3).map((listing) => {
                const globalIdx = videoListings.indexOf(listing);
                return (
                  <button
                    key={listing.id}
                    onClick={() => goTo(globalIdx, videoListings.length)}
                    className="w-full flex items-center gap-4 p-3.5 rounded-2xl border border-border/40 hover:border-border hover:bg-muted/30 transition-all text-left group"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-serif italic font-bold text-sm shrink-0 shadow-inner"
                      style={{ backgroundColor: listing.color }}
                    >
                      {listing.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-bold truncate transition-colors mb-0.5">
                        {listing.video!.dish}
                      </p>
                      <p className="text-muted-foreground text-xs font-medium truncate">{listing.name}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-background border border-transparent group-hover:border-border transition-colors">
                      <Play className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 translate-x-[1px]" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
