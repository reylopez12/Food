import { useState } from "react";
import { useLocation } from "wouter";
import { Search, MapPin, UtensilsCrossed, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LISTINGS } from "../data/listings";
import { FeaturedCard } from "../components/FeaturedCard";
import { CategoryCard } from "../components/CategoryCard";
import { ListingCard } from "../components/ListingCard";
import { VideoShowcase } from "../components/VideoShowcase";

const CATEGORIES = [
  { id: 'restaurants', label: 'Restaurants', icon: <UtensilsCrossed className="w-6 h-6" /> },
  { id: 'food-trucks', label: 'Food Trucks', icon: <Truck className="w-6 h-6" /> },
];

export default function Home() {
  const [_, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      setLocation('/explore');
    }
  };

  const featuredListings = LISTINGS.filter(l => l.featured);
  const recentListings = [...LISTINGS].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-primary overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)]" />

        <div className="container mx-auto px-4 py-24 md:py-32 relative z-10 flex flex-col items-center text-center">
          <Badge className="mb-6 bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-sm px-4 py-1.5 text-sm font-medium">
            🌉 The definitive guide to Bay Area food
          </Badge>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white max-w-4xl tracking-tight mb-6">
            The best food in the<br className="hidden md:block" /> San Francisco Bay Area
          </h1>

          <p className="text-primary-foreground/80 text-lg md:text-xl max-w-2xl mb-10">
            From legendary taquerias to beloved bao trucks — discover where the Bay Area eats, drinks, and lingers.
          </p>

          <form onSubmit={handleSearch} className="w-full max-w-3xl bg-background rounded-full p-2 flex items-center shadow-xl shadow-black/10">
            <div className="flex-1 flex items-center px-4 gap-3 border-r">
              <Search className="w-5 h-5 text-muted-foreground shrink-0" />
              <Input
                type="text"
                placeholder="Tacos, sourdough, bao, pasta..."
                className="border-0 focus-visible:ring-0 px-0 shadow-none h-12 text-base bg-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="hidden sm:flex flex-1 items-center px-4 gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
              <Input
                type="text"
                placeholder="Neighborhood (e.g. Mission)"
                className="border-0 focus-visible:ring-0 px-0 shadow-none h-12 text-base bg-transparent"
              />
            </div>
            <Button type="submit" size="lg" className="rounded-full h-12 px-8 bg-accent text-accent-foreground hover:bg-accent/90 shrink-0 font-semibold text-base">
              Search
            </Button>
          </form>

          {/* Quick pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            <span className="text-primary-foreground/70 text-sm mr-2">Popular:</span>
            {['Oysters', 'Sourdough', 'Michelin Stars', 'Tacos', 'Bao'].map((pill) => (
              <Button key={pill} variant="outline" size="sm" className="rounded-full bg-white/5 border-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => setLocation(`/explore?q=${pill}`)}>
                {pill}
              </Button>
            ))}
          </div>
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
