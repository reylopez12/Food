import { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Venue as Listing } from '@workspace/api-client-react';
import 'leaflet/dist/leaflet.css';
import { appPath } from '../lib/venue';
import { STREET_TILE_LAYER, useIsDarkTheme } from '../lib/mapTiles';
import { CITY_BOUNDARIES } from '../data/cityBoundaries';

// Fix Leaflet default icon broken by Vite's asset handling
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * Resolve a CSS custom property to a usable hex/hsl string.
 * Falls back to the provided fallback if the property is not available.
 */
function resolveCssVar(property: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(property)
    .trim();
  if (!raw) return fallback;
  // The theme stores raw HSL components like "38 92% 50%"
  const parts = raw.split(/\s+/);
  if (parts.length >= 3) {
    return `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`;
  }
  return `hsl(${raw})`;
}

/**
 * Build a Leaflet pin icon using the resolved accent color.
 * We encode the color into the SVG data URI.
 */
function buildAmberIcon(accentHex: string): L.Icon {
  const encoded = encodeURIComponent(accentHex);
  return new L.Icon({
    iconUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='25' height='41' viewBox='0 0 25 41'%3E%3Cpath d='M12.5 0C5.596 0 0 5.596 0 12.5c0 9.375 12.5 28.5 12.5 28.5S25 21.875 25 12.5C25 5.596 19.404 0 12.5 0z' fill='${encoded}'/%3E%3Ccircle cx='12.5' cy='12.5' r='5' fill='white'/%3E%3C/svg%3E`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    shadowSize: [41, 41],
  });
}

interface ExploreAllMapProps {
  /** Filtered listings — these determine which pins are visible */
  listings: Listing[];
  selectedCategories: string[];
  onCategoryToggle: (id: string) => void;
}

const BAY_CENTER: [number, number] = [37.83, -122.27];

// Bounding box of all four cities' official limits (Census data, see
// ../data/cityBoundaries.ts) — the map opens framed on exactly that area.
const CITIES_BOUNDS = L.latLngBounds(
  CITY_BOUNDARIES.flatMap((city) => city.rings[0]),
);

const BOUNDARY_COLOR = '#f59e0b';

// One polygon covering the whole map with each city cut out as a hole, so
// everything outside the service area is dimmed. Leaflet fills with the
// even-odd rule, so Oakland's Piedmont hole comes back shaded as well.
const OUTSIDE_SERVICE_AREA: [number, number][][] = [
  [[-85, -180], [-85, 180], [85, 180], [85, -180]],
  ...CITY_BOUNDARIES.flatMap((city) => city.rings),
];

// Static fallbacks matching the light-mode theme defaults
const ACCENT_FALLBACK        = '#F3B944';

function FitCitiesOnLoad() {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(CITIES_BOUNDS, { padding: [28, 28] });
  }, [map]);

  return null;
}

export function ExploreAllMap({
  listings,
  selectedCategories,
  onCategoryToggle,
  showPins,
}: ExploreAllMapProps & { showPins: boolean }) {
  // Resolve theme colors for Leaflet (canvas context can't use CSS vars directly).
  // Re-resolve whenever the color scheme changes (dark/light toggle).
  const [accentColor,   setAccentColor]   = useState(() => resolveCssVar('--accent',           ACCENT_FALLBACK));
  useEffect(() => {
    const update = () => {
      setAccentColor(resolveCssVar('--accent', ACCENT_FALLBACK));
    };
    // Re-resolve when .dark is toggled on <html> / <body>
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const isDark = useIsDarkTheme();

  // Build Leaflet icon that uses the resolved accent color
  const amberIcon = useMemo(() => buildAmberIcon(accentColor), [accentColor]);

  const mappedListings = useMemo(
    () => listings.filter(l => Number.isFinite(l.lat) && Number.isFinite(l.lng) && (l.lat !== 0 || l.lng !== 0)),
    [listings],
  );

  const visibleListings = showPins ? mappedListings : [];

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden border shadow-sm"
      style={{ height: 'calc(100vh - 280px)', minHeight: 480 }}
    >
      <MapContainer
        center={BAY_CENTER}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        attributionControl={true}
      >
        <FitCitiesOnLoad />
        <TileLayer {...STREET_TILE_LAYER} />

        {/* Dim everything outside the service area */}
        <Polygon
          positions={OUTSIDE_SERVICE_AREA}
          interactive={false}
          pathOptions={{
            stroke: false,
            fillColor: isDark ? '#000' : '#64748b',
            fillOpacity: isDark ? 0.45 : 0.3,
          }}
        />

        {/* Service areas: tinted and outlined; name shows on hover */}
        {CITY_BOUNDARIES.map((city) => (
          <Polygon
            key={city.geoid}
            positions={city.rings}
            pathOptions={{
              color: BOUNDARY_COLOR,
              weight: 2.5,
              opacity: 1,
              fillColor: BOUNDARY_COLOR,
              fillOpacity: 0.08,
            }}
          >
            <Tooltip sticky>{city.name}</Tooltip>
          </Polygon>
        ))}

        {/* Individual venue pins */}
        {visibleListings.map((listing) => (
          <Marker
            key={listing.id}
            position={[listing.lat, listing.lng]}
            icon={amberIcon}
          >
            <Popup maxWidth={240} className="listing-popup">
              <div style={{ fontFamily: 'sans-serif', minWidth: 180 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: '#111' }}>
                  {listing.name}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                  {listing.neighborhood} · {listing.priceRange}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                  {listing.reviewCount > 0 ? (
                    <>
                      <span style={{ color: accentColor, fontSize: 13 }}>★</span>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#111' }}>{listing.rating}</span>
                      <span style={{ color: '#9ca3af', fontSize: 12 }}>({listing.reviewCount.toLocaleString()})</span>
                    </>
                  ) : <span style={{ color: '#6b7280', fontSize: 12 }}>No ratings yet</span>}
                </div>
                <a
                  href={appPath(`/listing/${listing.id}`)}
                  style={{
                    display: 'inline-block',
                    background: accentColor,
                    color: '#fff',
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  View details →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {showPins && visibleListings.length === 0 && (
        <div className="absolute inset-x-0 top-3 z-[1000] flex justify-center pointer-events-none">
          <div className="rounded-full border bg-background/80 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
            No places match your filters
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm border rounded-lg px-3 py-1.5 text-xs font-medium text-foreground shadow">
        {visibleListings.length} {visibleListings.length === 1 ? 'place' : 'places'} on map
      </div>
    </div>
  );
}
