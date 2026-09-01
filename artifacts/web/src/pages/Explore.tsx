import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, Filter, X, List, Map as MapIcon, Navigation, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useListings } from "@workspace/api-client-react";
import { ListingCard } from "../components/ListingCard";
import { ExploreAllMap } from "../components/ExploreAllMap";
import { useNearMe, haversineDistanceMi, RADIUS_OPTIONS } from "../hooks/useNearMe";
import { SearchModeChooser, type SearchMode } from "../components/SearchModeChooser";

const CATEGORIES = [
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'food-trucks', label: 'Food Trucks' },
];

const PRICE_RANGES = ['$', '$$', '$$$', '$$$$'];

const VIEW_MODE_KEY = 'bay-bites-explore-view';

function getSearchMode(params: URLSearchParams): SearchMode {
  const mode = params.get("mode");
  if (mode === "city" || mode === "neighborhood" || mode === "near-me") return mode;
  if (params.has("city")) return "city";
  if (params.has("neighborhood")) return "neighborhood";
  return "food";
}

/** Venues seeded without coordinates default to 0,0 — treat as no-data. */
function hasValidCoords(lat: number, lng: number): boolean {
  return !(lat === 0 && lng === 0);
}

export default function Explore() {
  const [locationStr] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const { data: allListings = [] } = useListings();

  const { status, userLat, userLng, radius, requestLocation, clearLocation, setRadius } = useNearMe();

  const [searchMode, setSearchMode] = useState<SearchMode>(() => getSearchMode(searchParams));
  const [searchQuery, setSearchQuery] = useState(() => {
    const mode = getSearchMode(searchParams);
    return mode === "city"
      ? searchParams.get("city") || ""
      : mode === "neighborhood"
        ? searchParams.get("neighborhood") || ""
        : mode === "food"
          ? searchParams.get("q") || ""
          : "";
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get("category") ? [searchParams.get("category")!] : []
  );
  const [selectedPrices, setSelectedPrices] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number[]>([0]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(
    searchParams.get("neighborhood") || null
  );
  const [selectedCity, setSelectedCity] = useState<string>(searchParams.get("city") || "");

  // Task #15: persist List/Map preference in localStorage
  const [viewMode, setViewMode] = useState<'list' | 'map'>(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_KEY);
      return saved === 'map' ? 'map' : 'list';
    } catch {
      return 'list';
    }
  });

  const handleViewMode = (mode: 'list' | 'map') => {
    setViewMode(mode);
    try { localStorage.setItem(VIEW_MODE_KEY, mode); } catch {}
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = getSearchMode(params);
    const q = params.get("q");
    const cat = params.get("category");
    const neighborhood = params.get("neighborhood");
    const city = params.get("city");
    setSearchMode(mode);
    setSearchQuery(
      mode === "city" ? city || "" :
      mode === "neighborhood" ? neighborhood || "" :
      mode === "food" ? q || "" : ""
    );
    setSelectedCategories(cat ? [cat] : []);
    setSelectedNeighborhood(mode === "neighborhood" ? neighborhood || null : null);
    setSelectedCity(mode === "city" ? city || "" : "");
  }, [locationStr]);

  const distanceActive = status === 'granted' && userLat !== null && userLng !== null && radius !== null;

  const filteredListings = useMemo(() => {
    return allListings.filter(listing => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchMode !== "food" ||
        searchQuery === "" ||
        listing.name.toLowerCase().includes(q) ||
        listing.description.toLowerCase().includes(q) ||
        listing.tags.some(t => t.toLowerCase().includes(q)) ||
        listing.category.toLowerCase().includes(q);

      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(listing.category);

      const matchesPrice =
        selectedPrices.length === 0 ||
        selectedPrices.includes(listing.priceRange);

      const matchesRating = listing.rating >= minRating[0];
      const matchesVerified = !verifiedOnly || listing.verified;
      const normalizedNeighborhood = selectedNeighborhood?.trim().toLowerCase();
      const matchesNeighborhood =
        !normalizedNeighborhood ||
        listing.neighborhood?.toLowerCase().includes(normalizedNeighborhood) ||
        listing.city.toLowerCase().includes(normalizedNeighborhood);
      const normalizedCity = selectedCity.trim().toLowerCase();
      const matchesCity =
        searchMode !== "city" ||
        !normalizedCity ||
        listing.city.toLowerCase().includes(normalizedCity);

      let matchesDistance = true;
      if (distanceActive) {
        if (!hasValidCoords(listing.lat, listing.lng)) {
          matchesDistance = false;
        } else {
          const dist = haversineDistanceMi(userLat!, userLng!, listing.lat, listing.lng);
          matchesDistance = dist <= radius!;
        }
      }

      return matchesSearch && matchesCategory && matchesPrice && matchesRating &&
        matchesVerified && matchesNeighborhood && matchesCity && matchesDistance;
    });
  }, [allListings, searchMode, searchQuery, selectedCategories, selectedPrices, minRating,
    verifiedOnly, selectedNeighborhood, selectedCity, distanceActive, userLat, userLng, radius]);

  /** Distance from user to each visible listing (only when location is active). */
  const distanceMap = useMemo(() => {
    const map = new Map<string, number>();
    if (status !== 'granted' || userLat === null || userLng === null) return map;
    for (const l of filteredListings) {
      if (hasValidCoords(l.lat, l.lng)) {
        map.set(l.id, haversineDistanceMi(userLat, userLng, l.lat, l.lng));
      }
    }
    return map;
  }, [filteredListings, status, userLat, userLng]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId) ? prev.filter(c => c !== categoryId) : [...prev, categoryId]
    );
  };

  const togglePrice = (price: string) => {
    setSelectedPrices(prev =>
      prev.includes(price) ? prev.filter(p => p !== price) : [...prev, price]
    );
  };

  const updateSearchUrl = (mode: SearchMode, query: string) => {
    const params = new URLSearchParams(window.location.search);
    params.delete("q");
    params.delete("city");
    params.delete("neighborhood");
    params.delete("mode");
    if (mode !== "food" || query.trim()) params.set("mode", mode);
    if (query.trim()) {
      params.set(mode === "food" ? "q" : mode, query.trim());
    }
    const serialized = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${serialized ? `?${serialized}` : ""}`);
  };

  const handleSearchModeChange = (mode: SearchMode) => {
    const nextQuery = mode === "near-me" ? "" : searchQuery;
    setSearchMode(mode);
    setSearchQuery(nextQuery);
    setSelectedCity(mode === "city" ? nextQuery : "");
    setSelectedNeighborhood(mode === "neighborhood" ? nextQuery : null);
    updateSearchUrl(mode, nextQuery);
  };

  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value);
    setSelectedCity(searchMode === "city" ? value : "");
    setSelectedNeighborhood(searchMode === "neighborhood" ? value : null);
    updateSearchUrl(searchMode, value);
  };

  const handleMapNeighborhoodChange = (neighborhood: string | null) => {
    const mode: SearchMode = neighborhood ? "neighborhood" : "food";
    setSearchMode(mode);
    setSearchQuery(neighborhood || "");
    setSelectedNeighborhood(neighborhood);
    setSelectedCity("");
    updateSearchUrl(mode, neighborhood || "");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSearchMode("food");
    setSelectedCategories([]);
    setSelectedPrices([]);
    setMinRating([0]);
    setVerifiedOnly(false);
    setSelectedNeighborhood(null);
    setSelectedCity("");
    clearLocation();
    setRadius(null);
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState({}, '', url);
  };

  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    selectedCategories.length +
    selectedPrices.length +
    (minRating[0] > 0 ? 1 : 0) +
    (verifiedOnly ? 1 : 0) +
    (selectedNeighborhood ? 1 : 0) +
    (selectedCity ? 1 : 0) +
    (distanceActive ? 1 : 0);

  const FilterContent = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Filters</h3>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs">
            Clear all
          </Button>
        )}
      </div>

      {/* ── Distance / Near Me ── */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground">Distance</h4>

        {(status === 'idle' || status === 'denied' || status === 'unavailable') && (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full flex items-center gap-2"
              onClick={requestLocation}
              disabled={status === 'unavailable'}
            >
              <Navigation className="w-4 h-4" />
              {status === 'denied'
                ? 'Location access denied'
                : status === 'unavailable'
                ? 'Geolocation unavailable'
                : 'Use my location'}
            </Button>
            {status === 'denied' && (
              <p className="text-xs text-muted-foreground">
                Enable location in your browser settings and try again.
              </p>
            )}
          </div>
        )}

        {status === 'requesting' && (
          <Button variant="outline" size="sm" className="w-full flex items-center gap-2" disabled>
            <Loader2 className="w-4 h-4 animate-spin" />
            Getting location…
          </Button>
        )}

        {status === 'granted' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
                <Navigation className="w-3.5 h-3.5" />
                Location active
              </div>
              <button
                onClick={clearLocation}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
              >
                Clear
              </button>
            </div>

            {/* Preferred radius */}
            <div className="flex flex-wrap gap-2">
              {RADIUS_OPTIONS.map(r => (
                <Badge
                  key={r}
                  variant={radius === r ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1 text-sm font-medium select-none"
                  onClick={() => setRadius(radius === r ? null : r)}
                >
                  {r} mi
                </Badge>
              ))}
            </div>
            {!radius && (
              <p className="text-xs text-muted-foreground">Select a radius to filter by distance.</p>
            )}
          </div>
        )}
      </div>

      {/* ── Categories ── */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground">Categories</h4>
        <div className="space-y-3">
          {CATEGORIES.map(category => (
            <div key={category.id} className="flex items-center space-x-2">
              <Checkbox
                id={`cat-${category.id}`}
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={() => toggleCategory(category.id)}
              />
              <Label htmlFor={`cat-${category.id}`} className="font-normal cursor-pointer">
                {category.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* ── Price Range ── */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground">Price Range</h4>
        <div className="flex flex-wrap gap-2">
          {PRICE_RANGES.map(price => (
            <Badge
              key={price}
              variant={selectedPrices.includes(price) ? "default" : "outline"}
              className="cursor-pointer px-3 py-1 text-sm font-medium"
              onClick={() => togglePrice(price)}
            >
              {price}
            </Badge>
          ))}
        </div>
      </div>

      {/* ── Minimum Rating ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm text-muted-foreground">Minimum Rating</h4>
          <span className="text-sm font-medium">{minRating[0]} stars</span>
        </div>
        <Slider
          defaultValue={[0]}
          max={5}
          step={0.5}
          value={minRating}
          onValueChange={setMinRating}
          className="py-4"
        />
      </div>

      {/* ── Verified Only ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="font-medium text-sm">Verified Only</h4>
            <p className="text-xs text-muted-foreground">Show only verified listings</p>
          </div>
          <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col gap-6 md:flex-row md:items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Explore Bay Area Food</h1>
          <p className="text-muted-foreground">
            Search and filter the best restaurants, cafes, bars, and more across the Bay.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={
                searchMode === "food"
                  ? "Search food, name, or tags..."
                  : searchMode === "city"
                    ? "Search by city..."
                    : searchMode === "neighborhood"
                      ? "Search by neighborhood..."
                      : "Use the button below to find nearby places"
              }
              disabled={searchMode === "near-me"}
              value={searchQuery}
              onChange={(e) => handleSearchQueryChange(e.target.value)}
              className="pl-9 bg-card"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchQueryChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="w-full sm:w-40">
            <SearchModeChooser value={searchMode} onValueChange={handleSearchModeChange} />
          </div>

          {searchMode === "near-me" && (
            <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 sm:w-auto">
              {status === "granted" ? (
                <>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                    <Navigation className="h-3.5 w-3.5" /> Location active
                  </span>
                  {RADIUS_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRadius(radius === option ? null : option)}
                      className={`rounded-full border px-2 py-1 text-xs font-medium ${
                        radius === option
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {option} mi
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={clearLocation}
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    Clear
                  </button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={requestLocation}
                    disabled={status === "requesting" || status === "unavailable"}
                    className="gap-2"
                  >
                    {status === "requesting" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Navigation className="h-3.5 w-3.5" />
                    )}
                    {status === "requesting"
                      ? "Getting location…"
                      : status === "denied"
                        ? "Try location again"
                        : status === "unavailable"
                          ? "Geolocation unavailable"
                          : "Use my location"}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {status === "denied"
                      ? "Enable location in browser settings to continue."
                      : "Your browser will ask before sharing your location."}
                  </span>
                </>
              )}
            </div>
          )}

          {/* List / Map toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden shrink-0 bg-card">
            <button
              onClick={() => handleViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => handleViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Map</span>
            </button>
          </div>

          {/* Mobile filter sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="md:hidden shrink-0 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 min-w-[20px] justify-center">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] overflow-y-auto">
              <SheetHeader className="mb-6 text-left">
                <SheetTitle>Filter Listings</SheetTitle>
                <SheetDescription>Refine your search results</SheetDescription>
              </SheetHeader>
              <FilterContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {viewMode === 'map' ? (
        <ExploreAllMap
          listings={filteredListings}
          allListings={allListings}
          selectedCategories={selectedCategories}
          onCategoryToggle={toggleCategory}
          selectedNeighborhood={selectedNeighborhood}
          onNeighborhoodChange={handleMapNeighborhoodChange}
        />
      ) : (
        <div className="flex flex-col md:flex-row gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-64 shrink-0">
            <div className="sticky top-24 bg-card border rounded-xl p-6 shadow-sm">
              <FilterContent />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="mb-6 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing{' '}
                <span className="font-medium text-foreground">{filteredListings.length}</span>{' '}
                {filteredListings.length === 1 ? 'place' : 'places'}
                {distanceActive && (
                  <> within <span className="font-medium text-foreground">{radius} mi</span></>
                )}
              </div>
            </div>

            {filteredListings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.map(listing => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    distanceMi={distanceMap.get(listing.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl bg-card/50 border-dashed">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No places found</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  {distanceActive
                    ? `No listings with location data found within ${radius} miles. Try a larger radius or clear the distance filter.`
                    : "We couldn't find anything matching your filters. Try adjusting your search or clearing the filters."}
                </p>
                <Button onClick={clearFilters}>Clear all filters</Button>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
