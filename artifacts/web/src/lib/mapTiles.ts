import { useEffect, useState } from 'react';

// Esri's street map: clear streets and street names, no API key needed.
// The `map-tiles-muted` class (index.css) drains most of its colour so our
// amber service areas stay the focus, and inverts it in dark mode.
export const STREET_TILE_LAYER = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors',
  maxZoom: 19,
  className: 'map-tiles-muted',
};

/** Tracks the `.dark` class on <html> so the map can follow the app theme. */
export function useIsDarkTheme(): boolean {
  const read = () =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const [dark, setDark] = useState(read);
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return dark;
}
