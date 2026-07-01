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
    <Link href={`/listing/${listing.id}`} className="group block shrink-0 w-[300px] outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
      <Card className="h-full overflow-hidden transition-all hover:shadow-md flex flex-col bg-card border-border/50">
        <div 
          className="h-24 w-full relative flex items-center justify-center"
          style={{ backgroundColor: listing.color }}
        >
          <div className="text-white/80 font-bold text-4xl tracking-widest">{listing.initials}</div>
          <Badge className="absolute bottom-2 left-2 bg-black/40 hover:bg-black/40 text-white backdrop-blur-sm border-none shadow-none text-xs capitalize">
            {listing.category}
          </Badge>
        </div>
        
        <CardContent className="p-4 flex flex-col gap-2">
          <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
            {listing.name}
          </h3>
          
          <div className="flex items-center gap-1.5">
            <StarRating rating={listing.rating} className="scale-90 origin-left" />
            <span className="text-xs font-medium text-muted-foreground">({listing.reviewCount})</span>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{listing.neighborhood || listing.city}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
