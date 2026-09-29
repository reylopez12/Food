import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, UtensilsCrossed, Truck, Store, Megaphone, BadgeCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListings } from "@workspace/api-client-react";
import { FeaturedSlides } from "../components/FeaturedSlides";
import { CategoryCard } from "../components/CategoryCard";
import { ListingCard } from "../components/ListingCard";
import { VideoShowcase } from "../components/VideoShowcase";
import { HomeSpin } from "../components/HomeSpin";
import { SearchModeChooser, type SearchMode } from "../components/SearchModeChooser";
import { usePageMeta } from "../hooks/usePageMeta";

const CATEGORIES = [
  { id: 'restaurants', label: 'Restaurants', icon: <UtensilsCrossed className="w-6 h-6" /> },
  { id: 'food-trucks', label: 'Food Trucks', icon: <Truck className="w-6 h-6" /> },
];

type QuickPick = { mode: SearchMode; query: string };

/** Most common values, used to build quick-pick chips from real data. */
function topValues(values: string[], n: number): string[] {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([v]) => v);
}

/** A stable-for-today selection so returning visitors see a fresh set daily. */
function dailyPicks<T extends { id: string }>(items: T[], n: number): T[] {
  const day = new Date().toISOString().slice(0, 10);
  const score = (id: string) => {
    let h = 2166136261;
    for (const ch of day + id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
  };
  return [...items].sort((a, b) => score(a.id) - score(b.id)).slice(0, n);
}

export default function Home() {
  usePageMeta();
  const [_, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("food");
  const { data: listings = [], isLoading } = useListings();

  const quickPicks = useMemo<QuickPick[]>(() => {
    const cities = topValues(listings.map((l) => l.city.replace(/,\s*CA$/, "")), 2);
    const hoods = topValues(
      listings.map((l) => l.neighborhood).filter((n) => n.length <= 18),
      2,
    );
    return [
      ...hoods.map((query) => ({ mode: "neighborhood" as const, query })),
      ...cities.map((query) => ({ mode: "city" as const, query })),
    ];
  }, [listings]);

  const stats = useMemo(() => {
    const cities = new Set(listings.map((l) => l.city.replace(/,\s*CA$/, "")));
    const hoods = new Set(listings.map((l) => l.neighborhood).filter(Boolean));
    return { places: listings.length, cities: cities.size, hoods: hoods.size };
  }, [listings]);

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

  const featured = listings.filter(l => l.featured);
  const featuredListings = featured.length ? featured : listings.slice(0, 6);
  const gemListings = useMemo(() => dailyPicks(listings, 6), [listings]);

  const cityCards = useMemo(() => {
    const byCity = new Map<string, { count: number; hoods: string[] }>();
    for (const l of listings) {
      const name = l.city.replace(/,\s*CA$/, "");
      const entry = byCity.get(name) ?? { count: 0, hoods: [] };
      entry.count++;
      entry.hoods.push(l.neighborhood);
      byCity.set(name, entry);
    }
    return [...byCity.entries()]
      .filter(([, v]) => v.count >= 3)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 6)
      .map(([name, v]) => ({
        name,
        count: v.count,
        hoods: topValues(v.hoods.filter((n) => n.length <= 18), 3),
      }));
  }, [listings]);

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

            <h1 className="text-[2.75rem] leading-[0.95] sm:text-6xl md:text-7xl lg:text-[110px] font-serif font-bold tracking-tight mb-8">
              good food,<br />
              <span className="text-primary">close to home.</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-[#F7F4F0]/80 mb-10 md:mb-12 max-w-2xl font-medium">
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
                        ? "Try Oakland or Berkeley"
                        : searchMode === "neighborhood"
                          ? `Try ${quickPicks.find((p) => p.mode === "neighborhood")?.query ?? "Rockridge"}`
                          : "Hit Find food to browse nearby"
                  }
                  disabled={searchMode === "near-me"}
                  className="border-0 focus-visible:ring-0 px-0 shadow-none h-full text-base bg-transparent font-medium text-[#1E232E] placeholder:text-[#1E232E]/40"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button type="submit" size="lg" className="w-full lg:w-auto rounded-xl h-14 px-10 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 font-bold text-lg">
                Find food
              </Button>
            </form>

            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 text-sm font-mono uppercase tracking-widest text-[#F7F4F0]/50 w-full">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                <span>Searching around</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button type="button" className={`px-3 py-1.5 rounded-full font-bold text-xs transition-colors ${searchMode === "near-me" ? "bg-secondary text-secondary-foreground" : "border border-secondary/60 text-secondary hover:bg-secondary/10"}`} onClick={() => { setSearchMode("near-me"); setSearchQuery(""); }}>Near you</button>
                {quickPicks.map((pick) => {
                  const active = searchMode === pick.mode && searchQuery === pick.query;
                  return (
                    <button
                      key={pick.query}
                      type="button"
                      className={`px-3 py-1.5 rounded-full transition-colors text-xs ${active ? "bg-white/15 text-[#F7F4F0]" : "hover:bg-white/10"}`}
                      onClick={() => { setSearchMode(pick.mode); setSearchQuery(pick.query); }}
                    >
                      {pick.query}
                    </button>
                  );
                })}
                <button type="button" className="px-3 py-1.5 rounded-full text-secondary hover:text-secondary/80 flex items-center gap-1 transition-colors text-xs" onClick={() => { setSearchMode("food"); setSearchQuery(""); }}>
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
        <div className="flex whitespace-nowrap animate-[marquee_20s_linear_infinite] motion-reduce:animate-none" aria-hidden="true">
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

      {/* Browse by city & category */}
      <section className="py-20 md:py-28 container mx-auto px-4 border-t border-border/40">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 md:mb-12 gap-4">
          <div className="max-w-xl">
            <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mb-4 text-foreground">Start exploring</h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed font-medium">
              {stats.places > 0
                ? `${stats.places} independent spots across ${stats.hoods} neighborhoods. Pick a city and dig in.`
                : "Pick a city and dig in."}
            </p>
          </div>
          <Button variant="outline" className="hidden md:inline-flex rounded-full px-6 border-border hover:bg-muted hover:text-foreground hover:border-foreground/30 transition-all font-semibold" onClick={() => setLocation('/explore')}>
            View the full directory <span className="ml-2">&rarr;</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {cityCards.map((city) => (
            <Link
              key={city.name}
              href={`/explore?mode=city&city=${encodeURIComponent(city.name)}`}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 md:p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {city.count} {city.count === 1 ? "spot" : "spots"}
              </p>
              <p className="mt-2 font-serif text-3xl md:text-4xl font-bold text-card-foreground transition-colors group-hover:text-primary">
                {city.name}
              </p>
              <p className="mt-3 line-clamp-1 text-sm text-muted-foreground">{city.hoods.join(" · ")}</p>
              <ArrowRight className="absolute right-6 top-6 h-5 w-5 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          ))}
          {CATEGORIES.filter((cat) => listings.some((l) => l.category === cat.id)).map((cat) => (
            <CategoryCard
              key={cat.id}
              title={cat.label}
              icon={cat.icon}
              category={cat.id}
            />
          ))}
        </div>
      </section>

      {/* Local places carousel */}
      <section className="py-10 md:py-14 bg-[#1E232E] text-[#F7F4F0] border-y border-white/10">
        <div className="container mx-auto px-4">
          {featuredListings.length > 0 ? (
            <FeaturedSlides listings={featuredListings} />
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
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed font-medium">Discover your next go-to spot. A fresh handful of local favorites, rotating every day.</p>
          </div>
          <Button variant="outline" className="self-start md:self-auto rounded-full px-6 border-border hover:bg-muted hover:text-foreground hover:border-foreground/30 transition-all font-semibold" onClick={() => setLocation('/explore')}>
            Explore all listings <span className="ml-2">&rarr;</span>
          </Button>
        </div>

        {gemListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {gemListings.map(listing => (
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

      {/* For business */}
      <section className="container mx-auto px-4 pb-20 md:pb-28">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-12 text-primary-foreground sm:px-10 md:px-14 md:py-16">
          <div className="pointer-events-none absolute inset-0 bg-noise opacity-10 mix-blend-overlay" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border-[36px] border-white/10" />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="mb-4 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-primary-foreground/70">
                <Store className="h-4 w-4" /> For restaurant owners
              </p>
              <h2 className="mb-4 font-serif text-4xl font-bold leading-tight tracking-tight md:text-5xl">
                Run a local spot? Let's get you found.
              </h2>
              <p className="mb-8 max-w-xl text-base font-medium text-primary-foreground/85 md:text-lg">
                Listings are free for independent, locally owned businesses. Claim yours, keep it accurate, and send specials straight to the people who follow you.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 rounded-xl bg-[#1E232E] px-7 font-bold text-[#F7F4F0] hover:bg-[#1E232E]/90">
                  <Link href="/partners#apply">
                    Get listed free <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-white/40 bg-transparent px-7 font-bold text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
                  <Link href="/partners">How partnering works</Link>
                </Button>
              </div>
            </div>
            <ul className="grid gap-3">
              {[
                { icon: BadgeCheck, text: "Verified owner badge on your listing" },
                { icon: Megaphone, text: "Announcements sent to your followers" },
                { icon: Search, text: "Found by city, neighborhood & cravings" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-4 rounded-2xl bg-white/10 px-5 py-4 font-semibold backdrop-blur-sm">
                  <Icon className="h-5 w-5 shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
