import { Link } from "wouter";
import type { Venue as Listing } from "@workspace/api-client-react";
import { StarRating } from "./StarRating";
import { MapPin, Bookmark, BookmarkCheck, CheckCircle2, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useSavedListings } from "../hooks/useSavedListings";

interface ListingCardProps {
  listing: Listing;
  /** Distance from the user's current location in miles, if available. */
  distanceMi?: number;
}

export function ListingCard({ listing, distanceMi }: ListingCardProps) {
  const { isSaved, toggleSaved } = useSavedListings();
  const saved = isSaved(listing.id);

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleSaved(listing.id);
  };

  const distanceLabel =
    distanceMi !== undefined
      ? distanceMi < 0.1
        ? '< 0.1 mi'
        : `${distanceMi.toFixed(1)} mi`
      : null;

  return (
    <Link href={`/listing/${listing.id}`} className="group block h-full outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
      <Card className="h-full overflow-hidden transition-all hover:shadow-md dark:hover:border-primary/50 flex flex-col bg-card">
        {/* Top colored band */}
        <div
          className="h-20 w-full relative flex items-center justify-center transition-colors"
          style={{ backgroundColor: listing.color }}
        >
          <div className="text-white font-bold text-3xl opacity-80 tracking-widest">{listing.initials}</div>

          {listing.hasVideo && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm">
              <Play className="w-3 h-3 text-white fill-white" />
              <span className="text-[10px] font-bold text-white tracking-widest uppercase">Video</span>
            </div>
          )}

          <button
            onClick={handleSave}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors text-white"
            aria-label={saved ? "Remove from saved" : "Save listing"}
          >
            {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>

        <CardContent className="p-5 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors flex items-center gap-1.5">
                {listing.name}
                {listing.verified && (
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" aria-label="Verified" />
                )}
              </h3>
              <p className="text-sm text-muted-foreground capitalize mt-1">
                {listing.category}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <StarRating rating={listing.rating} />
            <span className="text-xs font-medium">{listing.rating}</span>
            <span className="text-xs text-muted-foreground">({listing.reviewCount})</span>
            <span className="text-muted-foreground text-xs mx-1">•</span>
            <span className="text-xs font-medium text-muted-foreground">{listing.priceRange}</span>
          </div>

          <div className="flex items-start gap-1.5 text-sm text-muted-foreground mt-auto pt-4 border-t border-border/50">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="line-clamp-1 flex-1">
              {listing.neighborhood
                ? `${listing.neighborhood} · ${listing.city}`
                : `${listing.address}, ${listing.city}`}
            </span>
            {distanceLabel && (
              <span className="ml-2 text-xs font-medium text-primary shrink-0">
                {distanceLabel}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {listing.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {listing.tags.length > 3 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                +{listing.tags.length - 3}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
