import { Link } from "wouter";
import { Bookmark, Search } from "lucide-react";
import { LISTINGS } from "../data/listings";
import { useSavedListings } from "../hooks/useSavedListings";
import { ListingCard } from "../components/ListingCard";
import { Button } from "@/components/ui/button";

export default function Saved() {
  const { savedIds } = useSavedListings();
  
  const savedListings = LISTINGS.filter(listing => savedIds.includes(listing.id));

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 flex items-center gap-3">
          <Bookmark className="w-8 h-8 text-primary" />
          Saved Places
        </h1>
        <p className="text-muted-foreground text-lg">
          Your personal collection of {savedListings.length} favorite {savedListings.length === 1 ? 'place' : 'places'}.
        </p>
      </div>

      {savedListings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {savedListings.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 text-center border rounded-2xl bg-card/30 border-dashed max-w-3xl mx-auto">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary">
            <Bookmark className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold mb-3">No saved places yet</h2>
          <p className="text-muted-foreground max-w-md mb-8 text-lg">
            Save your favorite Bay Area spots — from Michelin-starred restaurants to beloved neighborhood cafes — and find them here anytime.
          </p>
          <Button asChild size="lg" className="px-8 font-medium">
            <Link href="/explore">
              <Search className="w-5 h-5 mr-2" />
              Explore Bay Area Food
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
