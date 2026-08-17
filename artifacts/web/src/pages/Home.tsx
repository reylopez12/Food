import { useState } from "react";
import { useLocation } from "wouter";
import { Search, MapPin, UtensilsCrossed, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListings } from "@workspace/api-client-react";
import { FeaturedCard } from "../components/FeaturedCard";
import { CategoryCard } from "../components/CategoryCard";
import { ListingCard } from "../components/ListingCard";
import { VideoShowcase } from "../components/VideoShowcase";
import { HomeSpin } from "../components/HomeSpin";

const CATEGORIES = [
  { id: 'restaurants', label: 'Restaurants', icon: <UtensilsCrossed className="w-6 h-6" /> },
  { id: 'food-trucks', label: 'Food Trucks', icon: <Truck className="w-6 h-6" /> },
];

export default function Home() {
  const [_, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: listings = [] } = useListings();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      setLocation('/explore');
    }
  };

  const featuredListings = listings.filter(l => l.featured);
  const recentListings = [...listings].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Spin Hero — first thing users see */}
      <HomeSpin />

      {/* Search bar below the spin hero */}
      <section className="bg-background border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <form onSubmit={handleSearch} className="w-full max-w-3xl mx-auto bg-card border rounded-full p-2 flex items-center shadow-sm">
            <div className="flex-1 flex items-center px-4 gap-3 border-r">
              <Search className="w-5 h-5 text-muted-foreground shrink-0" />
              <Input
                type="text"
                placeholder="Tacos, sourdough, bao, pasta..."
                className="border-0 focus-visible:ring-0 px-0 shadow-none h-10 text-base bg-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="hidden sm:flex flex-1 items-center px-4 gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
              <Input
                type="text"
                placeholder="Neighborhood (e.g. Mission)"
                className="border-0 focus-visible:ring-0 px-0 shadow-none h-10 text-base bg-transparent"
              />
            </div>
            <Button type="submit" size="default" className="rounded-full h-10 px-6 bg-accent text-accent-foreground hover:bg-accent/90 shrink-0 font-semibold">
              Search
            </Button>
          </form>
        </div>
      </section>

      {/* Video Showcases */}
      <VideoShowcase />

      {/* Categories Grid */}
      <section className="py-16 md:py-24 container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">Browse by Category</h2>
            <p className="text-muted-foreground">Find exactly the kind of experience you're craving.</p>
          </div>
          <Button variant="ghost" className="hidden md:inline-flex" onClick={() => setLocation('/explore')}>
            View all listings <span className="ml-2">&rarr;</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-sm">
          {CATEGORIES.map((cat) => (
            <CategoryCard
              key={cat.id}
              title={cat.label}
              icon={cat.icon}
              category={cat.id}
            />
          ))}
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-16 md:py-24 bg-muted/50 border-y">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-2">Featured Places</h2>
              <p className="text-muted-foreground">Iconic spots that define Bay Area dining.</p>
            </div>
          </div>

          <div className="flex overflow-x-auto pb-8 -mx-4 px-4 gap-6 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {featuredListings.map(listing => (
              <div key={listing.id} className="snap-start shrink-0">
                <FeaturedCard listing={listing} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Listings */}
      <section className="py-16 md:py-24 container mx-auto px-4 mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">More to Discover</h2>
            <p className="text-muted-foreground">More hidden gems and neighborhood favorites.</p>
          </div>
          <Button variant="outline" onClick={() => setLocation('/explore')}>
            Explore all listings
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentListings.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>
    </div>
  );
}
