import { useEffect, useState } from "react";
import type { Venue } from "@workspace/api-client-react";
import { FeaturedCard } from "./FeaturedCard";

export function FeaturedSlides({ listings }: { listings: Venue[] }) {
  const [slide, setSlide] = useState(0);
  const [moving, setMoving] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (listings.length < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setSlide((index) => index + 1), 4200);
    return () => window.clearInterval(timer);
  }, [listings.length, paused]);

  useEffect(() => {
    if (slide > listings.length) {
      setMoving(false);
      setSlide(0);
    }
  }, [slide, listings.length]);

  if (!listings.length) return null;

  return (
    <div
      className="mx-auto w-[min(100%,360px)] overflow-hidden"
      aria-label="Local places"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className={`flex w-full ${moving ? "motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-in-out" : ""}`}
        style={{ transform: `translateX(-${slide * 100}%)` }}
        onTransitionEnd={(event) => {
          if (event.target !== event.currentTarget) return;
          if (slide === listings.length) {
            setMoving(false);
            setSlide(0);
            requestAnimationFrame(() => requestAnimationFrame(() => setMoving(true)));
          }
        }}
      >
        {[...listings, ...(listings.length > 1 ? [listings[0]] : [])].map((listing, index) => (
          <div key={`${listing.id}-${index}`} className="w-full shrink-0 flex justify-center px-2" aria-hidden={index === listings.length ? true : undefined} inert={index === listings.length}>
            <FeaturedCard listing={listing} />
          </div>
        ))}
      </div>
    </div>
  );
}