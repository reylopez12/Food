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
      <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col bg-card border-border/60">
        <div 
          className="h-32 w-full relative flex items-center justify-center transition-colors overflow-hidden group-hover:bg-opacity-90"
          style={{ backgroundColor: listing.color }}
        >
          <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105 bg-noise opacity-30 mix-blend-overlay"></div>
          <div className="text-white font-serif italic font-bold text-5xl opacity-95 tracking-widest drop-shadow-md z-10 transition-transform duration-500 group-hover:scale-110">{listing.initials}</div>
          <Badge className="absolute bottom-3 left-3 bg-black/50 hover:bg-black/50 text-white backdrop-blur-md border-none shadow-none text-xs capitalize font-semibold z-10 px-2.5 py-1">
            {listing.category.replace("-", " ")}
          </Badge>
        </div>
        
        <CardContent className="p-6 flex flex-col gap-3 relative z-20 bg-card">
          <h3 className="font-serif font-bold text-xl line-clamp-1 group-hover:text-primary transition-colors">
            {listing.name}
          </h3>
          
          <div className="flex items-center gap-2">
            <StarRating rating={listing.rating} className="scale-90 origin-left" />
            <span className="text-sm font-bold">{listing.rating}</span>
            <span className="text-sm font-medium text-muted-foreground">({listing.reviewCount})</span>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2 border-t border-border/50 pt-3">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate font-medium">{listing.neighborhood || listing.city}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
