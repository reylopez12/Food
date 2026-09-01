import { useState } from "react";
import { useLocation } from "wouter";
import { Search, UtensilsCrossed, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListings } from "@workspace/api-client-react";
import { FeaturedCard } from "../components/FeaturedCard";
import { CategoryCard } from "../components/CategoryCard";
import { ListingCard } from "../components/ListingCard";
import { VideoShowcase } from "../components/VideoShowcase";
import { HomeSpin } from "../components/HomeSpin";
import { SearchModeChooser, type SearchMode } from "../components/SearchModeChooser";

const CATEGORIES = [
  { id: 'restaurants', label: 'Restaurants', icon: <UtensilsCrossed className="w-6 h-6" /> },
  { id: 'food-trucks', label: 'Food Trucks', icon: <Truck className="w-6 h-6" /> },
];

export default function Home() {
  const [_, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("food");
  const { data: listings = [], isLoading } = useListings();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchMode === "near-me") {
      params.set("mode", "near-me");
    } else if (searchQuery.trim()) {
      params.set("mode", searchMode);
      params.set(
        searchMode === "food" ? "q" : searchMode,
        searchQuery.trim(),
      );
    }

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
      {/* Hero Section */}
      <section className="bg-[#1E232E] text-[#F7F4F0] pt-12 pb-24 md:pt-20 md:pb-32 relative overflow-hidden -mt-16">
        <div className="container mx-auto px-4 relative z-10 pt-16">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-[#F7F4F0]/70">
                INDEPENDENT FOOD, CLOSE BY
              </span>
            </div>

            <h1 className="text-6xl md:text-7xl lg:text-[110px] font-serif font-bold tracking-tight leading-[0.95] mb-8">
              good food,<br />
              <span className="text-primary">close to home.</span>
            </h1>

            <p className="text-lg md:text-xl text-[#F7F4F0]/80 mb-12 max-w-2xl font-medium">
              Find the family-run counters, late-night windows, and neighborhood gems that make the city taste like itself.
            </p>

            <form onSubmit={handleSearch} className="w-full max-w-5xl bg-[#F7F4F0] rounded-2xl p-2.5 flex flex-col lg:flex-row items-center shadow-2xl shadow-black/20 gap-2 mb-6">
              <div className="w-full lg:w-[190px] flex items-center px-4 border-b lg:border-b-0 lg:border-r border-[#1E232E]/10 pb-3 lg:pb-0 h-14">
                <SearchModeChooser
                  value={searchMode}
                  onValueChange={setSearchMode}
                  className="text-[#1E232E]"
                />
              </div>
              <div className="flex-1 w-full flex items-center px-4 gap-3 border-b lg:border-b-0 lg:border-r border-[#1E232E]/10 pb-3 lg:pb-0 h-14">
                <Search className="w-5 h-5 text-[#1E232E]/40 shrink-0" />
                <Input
                  type="text"
                  placeholder={
                    searchMode === "food"
                      ? 'Try "tacos" or "open late"'
                      : searchMode === "city"
                        ? "Try Oakland or San Francisco"
                        : searchMode === "neighborhood"
                          ? "Try Mission or Sunset"
                          : "Choose Near me to browse nearby"
                  }
                  disabled={searchMode === "near-me"}
                  className="border-0 focus-visible:ring-0 px-0 shadow-none h-full text-base bg-transparent font-medium text-[#1E232E] placeholder:text-[#1E232E]/40"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button type="submit" size="lg" className="w-full md:w-auto rounded-xl h-14 px-10 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 font-bold text-lg">
                Find food
              </Button>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-mono uppercase tracking-widest text-[#F7F4F0]/50 w-full">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                <span>Searching around</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground font-bold text-xs" onClick={() => { setSearchMode("near-me"); setSearchQuery(""); }}>Near you</button>
                <button type="button" className="px-3 py-1 rounded-full hover:bg-white/10 transition-colors text-xs" onClick={() => { setSearchMode("neighborhood"); setSearchQuery("Mission"); }}>Mission</button>
                <button type="button" className="px-3 py-1 rounded-full hover:bg-white/10 transition-colors text-xs" onClick={() => { setSearchMode("neighborhood"); setSearchQuery("Sunset"); }}>Sunset</button>
                <button type="button" className="px-3 py-1 rounded-full hover:bg-white/10 transition-colors text-xs" onClick={() => { setSearchMode("city"); setSearchQuery("San Francisco"); }}>San Francisco</button>
                <button type="button" className="px-3 py-1 rounded-full hover:bg-white/10 transition-colors text-xs" onClick={() => { setSearchMode("city"); setSearchQuery("Oakland"); }}>Oakland</button>
                <button type="button" className="px-3 py-1 rounded-full text-secondary hover:text-secondary/80 flex items-center gap-1 transition-colors text-xs ml-2" onClick={() => { setSearchMode("food"); setSearchQuery(""); }}>
                  Reset &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] border-[40px] border-white/5 rounded-full opacity-50" />
          <div className="absolute bottom-[-20%] right-[-5%] w-[50%] h-[80%] border-[60px] border-white/5 rounded-full opacity-50" />
        </div>
      </section>

      {/* Ticker Tape */}
      <div className="w-full bg-[#1E232E] border-t border-white/10 overflow-hidden py-3">
        <div className="flex whitespace-nowrap animate-[marquee_20s_linear_infinite]">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-6 mx-6">
              <span className="text-[#F7F4F0]/40 font-mono text-xs uppercase tracking-widest">BAY AREA / FOR THE CURIOUS</span>
              <span className="w-1 h-1 rounded-full bg-primary" />
              <span className="text-[#F7F4F0]/40 font-mono text-xs uppercase tracking-widest">NO CHAINS, NO GATEKEEPING.</span>
              <span className="w-1 h-1 rounded-full bg-secondary" />
              <span className="text-[#F7F4F0]/40 font-mono text-xs uppercase tracking-widest">GO WHERE THE GOOD STUFF IS</span>
              <span className="w-1 h-1 rounded-full bg-primary" />
            </div>
          ))}
        </div>
      </div>

      {/* Spin Hero — second section now */}
      <HomeSpin />

      {/* Local food video showcase */}
      <VideoShowcase />

      {/* Categories Grid */}
      <section className="py-20 md:py-28 container mx-auto px-4 border-t border-border/40">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="max-w-xl">
            <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mb-4 text-foreground">Curated Categories</h2>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium">Whether you are looking for a lively dinner spot or a quick bite from a beloved local truck, explore exactly what you are craving.</p>
          </div>
          <Button variant="outline" className="hidden md:inline-flex rounded-full px-6 border-border hover:bg-muted hover:text-foreground hover:border-foreground/30 transition-all font-semibold" onClick={() => setLocation('/explore')}>
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
      <section className="py-20 md:py-28 bg-[#1E232E] text-[#F7F4F0] border-y border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mb-4">The Essentials</h2>
              <p className="text-lg text-[#F7F4F0]/70 leading-relaxed font-medium">Iconic spots that define the Bay Area dining scene. From storied institutions to modern classics, these are the places you simply cannot miss.</p>
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
            <div className="rounded-2xl border border-white/20 bg-white/5 px-6 py-12 text-center">
              <p className="font-serif text-2xl font-bold">New favorites are on their way.</p>
              <p className="mt-2 text-[#F7F4F0]/60">Browse the directory to find a place that feels essential to you.</p>
              <Button variant="outline" className="mt-5 rounded-full border-white/20 text-white hover:bg-white/10 hover:text-white" onClick={() => setLocation("/explore")}>
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
            <p className="text-lg text-muted-foreground leading-relaxed font-medium">Discover your next go-to spot. A hand-picked selection of fresh arrivals and local favorites waiting to be explored.</p>
          </div>
          <Button variant="outline" className="rounded-full px-6 border-border hover:bg-muted hover:text-foreground hover:border-foreground/30 transition-all font-semibold" onClick={() => setLocation('/explore')}>
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
