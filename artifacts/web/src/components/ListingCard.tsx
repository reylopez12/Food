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
    <Card className="group relative h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:hover:border-primary/50 flex flex-col bg-card border-border/60">
      <Link
        href={`/listing/${listing.id}`}
        className="absolute inset-0 z-10 block rounded-2xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`View ${listing.name}`}
      >
        <span className="sr-only">View {listing.name}</span>
      </Link>
        {/* Top colored band */}
        <div
          className="h-32 w-full relative flex items-center justify-center transition-colors overflow-hidden"
          style={{ backgroundColor: listing.color }}
        >
          <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105 opacity-20 mix-blend-overlay bg-noise pointer-events-none"></div>
          <div className="text-white font-serif italic font-bold text-5xl opacity-90 tracking-widest drop-shadow-sm transition-transform duration-500 group-hover:scale-110">{listing.initials}</div>

          {listing.hasVideo && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/50 backdrop-blur-md">
              <Play className="w-3 h-3 text-white fill-white" />
              <span className="text-[10px] font-bold text-white tracking-widest uppercase">Video</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            className="absolute top-3 right-3 z-20 p-2.5 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md transition-colors text-white"
            aria-label={saved ? "Remove from saved" : "Save listing"}
          >
            {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>

        <CardContent className="p-6 flex-1 flex flex-col bg-card relative z-20">
          <div className="flex justify-between items-start mb-3">
            <div className="w-full">
              <h3 className="font-serif font-bold text-2xl leading-tight group-hover:text-primary transition-colors flex items-center gap-2 text-card-foreground">
                <span className="truncate">{listing.name}</span>
                {listing.verified && (
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" aria-label="Verified" />
                )}
              </h3>
              <p className="text-sm text-muted-foreground capitalize mt-1.5 font-medium">
                {listing.category.replace("-", " ")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            {listing.reviewCount > 0 ? (
              <>
                <StarRating rating={listing.rating} className="scale-90 origin-left" />
                <span className="text-sm font-bold text-card-foreground">{listing.rating}</span>
                <span className="text-sm text-muted-foreground font-medium">({listing.reviewCount})</span>
              </>
            ) : <span className="text-sm text-muted-foreground">No ratings yet</span>}
            {listing.priceRange && <>
              <span className="text-muted-foreground text-sm mx-1.5">•</span>
              <span className="text-sm font-bold text-muted-foreground">{listing.priceRange}</span>
            </>}
          </div>

          <div className="flex items-start gap-2 text-sm text-muted-foreground mt-auto pt-4 border-t border-border/60 font-medium">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="line-clamp-1 flex-1 leading-relaxed">
              {listing.neighborhood
                ? `${listing.neighborhood} · ${listing.city}`
                : `${listing.address}, ${listing.city}`}
            </span>
            {distanceLabel && (
              <span className="ml-2 text-[10px] font-bold text-primary shrink-0 bg-primary/10 px-2 py-1 rounded-full uppercase tracking-widest">
                {distanceLabel}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {listing.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-[11px] px-2 py-0.5 font-semibold bg-secondary/50 hover:bg-secondary/80 text-secondary-foreground/80">
                {tag}
              </Badge>
            ))}
            {listing.tags.length > 3 && (
              <Badge variant="secondary" className="text-[11px] px-2 py-0.5 font-semibold bg-secondary/50 text-secondary-foreground/80">
                +{listing.tags.length - 3}
              </Badge>
            )}
          </div>
        </CardContent>
    </Card>
  );
}
