import { Link } from "wouter";
import { Bookmark, Search } from "lucide-react";
import { useListings } from "@workspace/api-client-react";
import { useSavedListings } from "../hooks/useSavedListings";
import { ListingCard } from "../components/ListingCard";
import { Button } from "@/components/ui/button";

export default function Saved() {
  const { savedIds } = useSavedListings();
  const { data: allListings = [] } = useListings();
  
  const savedListings = allListings.filter(listing => savedIds.includes(listing.id));

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
        <div className="flex flex-col items-center justify-center py-24 text-center border rounded-xl bg-card/50 border-dashed">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
            <Bookmark className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-3">No saved places yet</h2>
          <p className="text-muted-foreground max-w-md mb-8">
            Start bookmarking your favorite spots and they'll appear here for quick access.
          </p>
          <Button asChild>
            <Link href="/explore">
              <Search className="w-4 h-4 mr-2" />
              Explore listings
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
