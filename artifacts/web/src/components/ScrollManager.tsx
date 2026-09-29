import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Wouter keeps the scroll position between pages. Reset to the top on
 * navigation, or scroll to the #anchor when the link has one.
 */
export function ScrollManager() {
  const [location] = useLocation();

  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) {
      window.scrollTo({ top: 0, left: 0 });
      return;
    }
    // The target page may still be rendering; retry briefly.
    let tries = 0;
    const timer = window.setInterval(() => {
      const el = document.getElementById(id);
      if (el || ++tries > 20) {
        window.clearInterval(timer);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [location]);

  return null;
}
