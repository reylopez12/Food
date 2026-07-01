import { useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'wouter';
import { Star } from 'lucide-react';
import type { Listing } from '../data/listings';

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

interface ExploreAllMapProps {
  listings: Listing[];
}

// SF center
const SF_CENTER: [number, number] = [37.7749, -122.4194];

export function ExploreAllMap({ listings }: ExploreAllMapProps) {
  return (
    <div className="relative w-full rounded-xl overflow-hidden border shadow-sm" style={{ height: 'calc(100vh - 280px)', minHeight: 480 }}>
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
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-[1000]">
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
