import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, Filter, X } from "lucide-react";
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

const CATEGORIES = [
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'food-trucks', label: 'Food Trucks' },
];

const PRICE_RANGES = ['$', '$$', '$$$', '$$$$'];

export default function Explore() {
  const [locationStr] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const { data: allListings = [] } = useListings();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get("category") ? [searchParams.get("category")!] : []
  );
  const [selectedPrices, setSelectedPrices] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number[]>([0]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const cat = params.get("category");

    if (q) setSearchQuery(q);
    if (cat && !selectedCategories.includes(cat)) {
      setSelectedCategories([cat]);
    }
  }, [locationStr]);

  const filteredListings = useMemo(() => {
    return allListings.filter(listing => {
      const matchesSearch =
        searchQuery === "" ||
        listing.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        listing.neighborhood?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(listing.category);

      const matchesPrice =
        selectedPrices.length === 0 ||
        selectedPrices.includes(listing.priceRange);

      const matchesRating = listing.rating >= minRating[0];

      const matchesVerified = !verifiedOnly || listing.verified;

      return matchesSearch && matchesCategory && matchesPrice && matchesRating && matchesVerified;
    });
  }, [allListings, searchQuery, selectedCategories, selectedPrices, minRating, verifiedOnly]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const togglePrice = (price: string) => {
    setSelectedPrices(prev =>
      prev.includes(price)
        ? prev.filter(p => p !== price)
        : [...prev, price]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategories([]);
    setSelectedPrices([]);
    setMinRating([0]);
    setVerifiedOnly(false);

    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState({}, '', url);
  };

  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    selectedCategories.length +
    selectedPrices.length +
    (minRating[0] > 0 ? 1 : 0) +
    (verifiedOnly ? 1 : 0);

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

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="font-medium text-sm">Verified Only</h4>
            <p className="text-xs text-muted-foreground">Show only verified listings</p>
          </div>
          <Switch
            checked={verifiedOnly}
            onCheckedChange={setVerifiedOnly}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col gap-6 md:flex-row md:items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Explore Bay Area Food</h1>
          <p className="text-muted-foreground">Search and filter the best restaurants, cafes, bars, and more across the Bay.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, neighborhood, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="md:hidden shrink-0 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 min-w-[20px] justify-center">{activeFilterCount}</Badge>
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
              Showing <span className="font-medium text-foreground">{filteredListings.length}</span> {filteredListings.length === 1 ? 'place' : 'places'}
            </div>
          </div>

          {filteredListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl bg-card/50 border-dashed">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No places found</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                We couldn't find anything matching your filters. Try adjusting your search or clearing the filters.
              </p>
              <Button onClick={clearFilters}>Clear all filters</Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
