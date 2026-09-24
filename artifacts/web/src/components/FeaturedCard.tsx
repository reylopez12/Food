import { Link } from "wouter";
import type { Venue as Listing } from "@workspace/api-client-react";
import { StarRating } from "./StarRating";
import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FeaturedCardProps {
  listing: Listing;
}

export function FeaturedCard({ listing }: FeaturedCardProps) {
  return (
    <Link href={`/listing/${listing.id}`} className="group block shrink-0 w-[320px] outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
      <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col bg-card border-border">
        <div 
          className="h-36 w-full relative flex items-center justify-center transition-colors overflow-hidden group-hover:bg-opacity-90"
          style={{ backgroundColor: listing.color }}
        >
          <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105 opacity-20 mix-blend-overlay bg-noise pointer-events-none"></div>
          <div className="text-white font-serif italic font-bold text-6xl opacity-90 tracking-widest drop-shadow-sm z-10 transition-transform duration-500 group-hover:scale-110">{listing.initials}</div>
          <Badge className="absolute bottom-3 left-3 bg-black/40 hover:bg-black/40 text-white backdrop-blur-md border-none shadow-none text-xs capitalize font-semibold z-10 px-2.5 py-1">
            {listing.category.replace("-", " ")}
          </Badge>
        </div>
        
        <CardContent className="p-6 flex flex-col gap-3 relative z-20 bg-card">
          <h3 className="font-serif font-bold text-2xl line-clamp-1 group-hover:text-primary transition-colors text-card-foreground">
            {listing.name}
          </h3>
          
          <div className="flex items-center gap-2">
            {listing.reviewCount > 0 ? (
              <>
                <StarRating rating={listing.rating} className="scale-90 origin-left" />
                <span className="text-sm font-bold text-card-foreground">{listing.rating}</span>
                <span className="text-sm font-medium text-muted-foreground">({listing.reviewCount})</span>
              </>
            ) : <span className="text-sm text-muted-foreground">No ratings yet</span>}
          </div>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2 border-t border-border/60 pt-4 font-medium">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate">{listing.neighborhood || listing.city}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
