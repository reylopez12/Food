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
  const [neighborhoodQuery, setNeighborhoodQuery] = useState("");
  const { data: listings = [], isLoading } = useListings();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.append("q", searchQuery.trim());
    if (neighborhoodQuery.trim()) params.append("neighborhood", neighborhoodQuery.trim());

    if (params.toString()) {
      setLocation(`/explore?${params.toString()}`);
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
      <section className="bg-background border-b shadow-sm relative z-20 -mt-6">
        <div className="container mx-auto px-4 py-6">
          <form onSubmit={handleSearch} className="w-full max-w-4xl mx-auto bg-card border rounded-2xl p-2 flex flex-col sm:flex-row items-center shadow-lg shadow-black/5 gap-2">
            <div className="flex-1 w-full flex items-center px-4 gap-3 border-b sm:border-b-0 sm:border-r border-border pb-2 sm:pb-0">
              <Search className="w-5 h-5 text-muted-foreground shrink-0" />
              <Input
                type="text"
                placeholder="Tacos, sourdough, bao, pasta..."
                className="border-0 focus-visible:ring-0 px-0 shadow-none h-12 text-base bg-transparent font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex-1 w-full flex items-center px-4 gap-3 border-b sm:border-b-0 sm:border-r border-border pb-2 sm:pb-0">
              <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
              <Input
                type="text"
                placeholder="Neighborhood (e.g. Mission)"
                className="border-0 focus-visible:ring-0 px-0 shadow-none h-12 text-base bg-transparent font-medium"
                value={neighborhoodQuery}
                onChange={(e) => setNeighborhoodQuery(e.target.value)}
              />
            </div>
            <Button type="submit" size="lg" className="w-full sm:w-auto rounded-xl h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 font-bold shadow-md">
              Find Places
            </Button>
          </form>
        </div>
      </section>

      {/* Video Showcases */}
      <VideoShowcase />

      {/* Categories Grid */}
      <section className="py-20 md:py-28 container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="max-w-xl">
            <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mb-4 text-foreground">Curated Categories</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">Whether you are looking for a lively dinner spot or a quick bite from a beloved local truck, explore exactly what you are craving.</p>
          </div>
          <Button variant="outline" className="hidden md:inline-flex rounded-full px-6 border-border hover:bg-accent hover:text-accent-foreground hover:border-accent transition-all font-semibold" onClick={() => setLocation('/explore')}>
            View all categories <span className="ml-2">&rarr;</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
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
      <section className="py-20 md:py-28 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mb-4">The Essentials</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">Iconic spots that define the Bay Area dining scene. From storied institutions to modern classics, these are the places you simply cannot miss.</p>
            </div>
          </div>

          {featuredListings.length > 0 ? (
            <div className="flex overflow-x-auto pb-10 -mx-4 px-4 gap-6 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {featuredListings.map(listing => (
                <div key={listing.id} className="snap-start shrink-0">
                  <FeaturedCard listing={listing} />
                </div>
              ))}
            </div>
          ) : !isLoading ? (
            <div className="rounded-2xl border border-dashed bg-card/60 px-6 py-12 text-center">
              <p className="font-serif text-2xl font-bold">New favorites are on their way.</p>
              <p className="mt-2 text-muted-foreground">Browse the directory to find a place that feels essential to you.</p>
              <Button variant="outline" className="mt-5 rounded-full" onClick={() => setLocation("/explore")}>
                Browse the directory
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      {/* Recent Listings */}
      <section className="py-20 md:py-28 container mx-auto px-4 mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mb-4">Neighborhood Gems</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">Discover your next go-to spot. A hand-picked selection of fresh arrivals and local favorites waiting to be explored.</p>
          </div>
          <Button variant="outline" className="rounded-full px-6 border-border hover:bg-accent hover:text-accent-foreground hover:border-accent transition-all font-semibold" onClick={() => setLocation('/explore')}>
            Explore all listings <span className="ml-2">&rarr;</span>
          </Button>
        </div>

        {recentListings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {recentListings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : !isLoading ? (
          <div className="rounded-2xl border border-dashed bg-card/60 px-6 py-12 text-center">
            <p className="font-serif text-2xl font-bold">The directory is waiting for its first place.</p>
            <p className="mt-2 text-muted-foreground">Check back soon for new neighborhood discoveries.</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
