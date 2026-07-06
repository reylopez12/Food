import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { Venue as Listing } from '@workspace/api-client-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon broken by Vite's asset handling
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Amber pin to match the app's accent color
const amberIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='25' height='41' viewBox='0 0 25 41'%3E%3Cpath d='M12.5 0C5.596 0 0 5.596 0 12.5c0 9.375 12.5 28.5 12.5 28.5S25 21.875 25 12.5C25 5.596 19.404 0 12.5 0z' fill='%23F59E0B'/%3E%3Ccircle cx='12.5' cy='12.5' r='5' fill='white'/%3E%3C/svg%3E",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
});

const CATEGORIES = [
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'food-trucks', label: 'Food Trucks' },
];

interface NeighborhoodCluster {
  name: string;
  count: number;
  lat: number;
  lng: number;
}

interface ExploreAllMapProps {
  /** Filtered listings — these determine which pins are visible */
  listings: Listing[];
  /** All listings — used to compute neighbourhood clusters and filter chips */
  allListings: Listing[];
  selectedCategories: string[];
  onCategoryToggle: (id: string) => void;
  selectedNeighborhood: string | null;
  onNeighborhoodChange: (n: string | null) => void;
}

// SF center
const SF_CENTER: [number, number] = [37.7749, -122.4194];

export function ExploreAllMap({
  listings,
  allListings,
  selectedCategories,
  onCategoryToggle,
  selectedNeighborhood,
  onNeighborhoodChange,
}: ExploreAllMapProps) {
  // Task #14: compute neighbourhood clusters from all listings
  const neighborhoodClusters = useMemo<NeighborhoodCluster[]>(() => {
    const groups: Record<string, { lats: number[]; lngs: number[]; count: number }> = {};
    for (const l of allListings) {
      const n = l.neighborhood;
      if (!n) continue;
      if (!groups[n]) groups[n] = { lats: [], lngs: [], count: 0 };
      groups[n].lats.push(l.lat);
      groups[n].lngs.push(l.lng);
      groups[n].count++;
    }
    return Object.entries(groups)
      .map(([name, g]) => ({
        name,
        count: g.count,
        lat: g.lats.reduce((a, b) => a + b, 0) / g.count,
        lng: g.lngs.reduce((a, b) => a + b, 0) / g.count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [allListings]);

  const uniqueNeighborhoods = useMemo(
    () => [...new Set(allListings.map(l => l.neighborhood).filter(Boolean))].sort() as string[],
    [allListings],
  );

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden border shadow-sm"
      style={{ height: 'calc(100vh - 280px)', minHeight: 480 }}
    >
      {/* Task #13: Floating filter bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex flex-wrap items-center justify-center gap-1.5 px-3 max-w-[calc(100%-2rem)]">
        {/* Category toggles */}
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => onCategoryToggle(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm transition-colors whitespace-nowrap ${
              selectedCategories.includes(cat.id)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background/90 backdrop-blur-sm text-foreground border-border hover:bg-accent'
            }`}
          >
            {cat.label}
          </button>
        ))}

        {uniqueNeighborhoods.length > 0 && (
          <span className="w-px h-4 bg-border mx-1 hidden sm:block" />
        )}

        {/* Neighbourhood chips */}
        {uniqueNeighborhoods.map(n => (
          <button
            key={n}
            onClick={() => onNeighborhoodChange(selectedNeighborhood === n ? null : n)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border shadow-sm transition-colors whitespace-nowrap ${
              selectedNeighborhood === n
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-background/90 backdrop-blur-sm text-foreground border-border hover:bg-accent'
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <MapContainer
        center={SF_CENTER}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Task #14: Neighbourhood cluster circles with hover tooltip */}
        {neighborhoodClusters.map(({ name, count, lat, lng }) => {
          const isSelected = selectedNeighborhood === name;
          const radius = 12 + count * 8; // scale with venue density
          return (
            <CircleMarker
              key={`cluster-${name}`}
              center={[lat, lng]}
              radius={radius}
              pathOptions={{
                color: isSelected ? '#F59E0B' : '#94a3b8',
                fillColor: isSelected ? '#F59E0B' : '#94a3b8',
                fillOpacity: isSelected ? 0.22 : 0.12,
                weight: isSelected ? 2 : 1,
                opacity: isSelected ? 0.8 : 0.35,
              }}
              eventHandlers={{
                click: () => onNeighborhoodChange(isSelected ? null : name),
              }}
            >
              <Tooltip direction="top" offset={[0, -radius / 2]}>
                <span style={{ fontWeight: 600 }}>{name}</span>
                {' · '}
                {count} {count === 1 ? 'place' : 'places'}
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* Individual venue pins */}
        {listings.map((listing) => (
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
                  <span style={{ color: '#F59E0B', fontSize: 13 }}>★</span>
                  <span style={{ fontWeight: 600, fontSize: 13, color: '#111' }}>{listing.rating}</span>
                  <span style={{ color: '#9ca3af', fontSize: 12 }}>({listing.reviewCount.toLocaleString()})</span>
                </div>
                <a
                  href={`/listing/${listing.id}`}
                  style={{
                    display: 'inline-block',
                    background: '#F59E0B',
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

      {listings.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-[1000] pointer-events-none">
          <div className="text-center">
            <p className="text-lg font-semibold mb-1">No places match your filters</p>
            <p className="text-sm text-muted-foreground">Try clearing some filters to see pins on the map.</p>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm border rounded-lg px-3 py-1.5 text-xs font-medium text-foreground shadow">
        {listings.length} {listings.length === 1 ? 'place' : 'places'} shown
      </div>
    </div>
  );
}
