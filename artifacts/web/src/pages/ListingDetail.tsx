import { useRoute, Link } from "wouter";
import { ArrowLeft, Phone, Globe, Navigation, Share2, MapPin, Clock, CheckCircle2, Bookmark, BookmarkCheck } from "lucide-react";
import { useListing } from "@workspace/api-client-react";
import { StarRating } from "../components/StarRating";
import { VideoSpot } from "../components/VideoSpot";
import { ListingMap } from "../components/ListingMap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useSavedListings } from "../hooks/useSavedListings";
import { useToast } from "@/hooks/use-toast";
import "leaflet/dist/leaflet.css";

export default function ListingDetail() {
  const [match, params] = useRoute("/listing/:id");
  const { isSaved, toggleSaved } = useSavedListings();
  const { toast } = useToast();
  
  const id = params?.id ?? "";
  const { data: listing, isLoading, isError } = useListing(id, {
    query: { enabled: !!id },
  });

  if (!match) return null;

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !listing) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-3xl font-bold mb-4">Listing not found</h1>
        <p className="text-muted-foreground mb-8">The directory listing you're looking for doesn't exist or has been removed.</p>
        <Button asChild>
          <Link href="/explore">Browse Directory</Link>
        </Button>
      </div>
    );
  }

  const saved = isSaved(listing.id);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied!",
      description: "Listing link has been copied to your clipboard.",
    });
  };

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Hero Block */}
      <div 
        className="w-full h-[280px] md:h-[360px] relative flex flex-col items-center justify-center transition-colors"
        style={{ backgroundColor: listing.color }}
      >
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10 container mx-auto">
          <Button variant="secondary" size="icon" asChild className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm">
            <Link href="/explore">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="icon" onClick={handleShare} className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm">
              <Share2 className="w-5 h-5" />
            </Button>
            <Button variant="secondary" size="icon" onClick={() => toggleSaved(listing.id)} className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm">
              {saved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        <div className="text-white/80 font-bold text-6xl md:text-8xl tracking-widest drop-shadow-lg">{listing.initials}</div>
      </div>

      <div className="container mx-auto px-4 -mt-16 relative z-10 max-w-4xl">
        {/* Main Info Card */}
        <Card className="shadow-lg border-muted">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="capitalize bg-background">
                    {listing.category}
                  </Badge>
                  <Badge variant="secondary" className="bg-muted">
                    {listing.priceRange}
                  </Badge>
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-2 mb-4">
                  {listing.name}
                  {listing.verified && (
                    <CheckCircle2 className="w-6 h-6 text-primary shrink-0" aria-label="Verified" />
                  )}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-sm mb-6">
                  <div className="flex items-center gap-2 bg-accent/10 px-3 py-1.5 rounded-full">
                    <span className="font-bold text-base text-accent-foreground">{listing.rating}</span>
                    <StarRating rating={listing.rating} />
                    <span className="text-muted-foreground font-medium">({listing.reviewCount} reviews)</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{listing.neighborhood ? `${listing.neighborhood}, ${listing.city}` : listing.city}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Row - Desktop right, Mobile below */}
              <div className="flex flex-row md:flex-col gap-3 w-full md:w-auto shrink-0 overflow-x-auto pb-2 md:pb-0">
                <Button size="lg" className="flex-1 md:w-full gap-2" asChild>
                  <a href={`tel:${listing.phone.replace(/[^0-9]/g, '')}`}>
                    <Phone className="w-4 h-4" />
                    <span>Call Now</span>
                  </a>
                </Button>
                <Button size="lg" variant="outline" className="flex-1 md:w-full gap-2" asChild>
                  <a href={listing.website} target="_blank" rel="noreferrer">
                    <Globe className="w-4 h-4" />
                    <span>Website</span>
                  </a>
                </Button>
                <Button size="lg" variant="secondary" className="flex-1 md:w-full gap-2" asChild>
                  <a href={`https://maps.google.com/maps?q=${listing.lat},${listing.lng}`} target="_blank" rel="noreferrer">
                    <Navigation className="w-4 h-4" />
                    <span>Directions</span>
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Video Showcase */}
        {listing.hasVideo && listing.video && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Dish Showcase</h2>
            <VideoSpot listing={listing} playing={true} />
          </div>
        )}

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">About</h2>
              <div className="prose dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                <p>{listing.description}</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Tags & Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {listing.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="px-3 py-1.5 text-sm font-medium">
                    {tag}
                  </Badge>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:col-span-1">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Location
                  </h3>
                  <p className="text-sm text-muted-foreground">{listing.address}</p>
                  <p className="text-sm text-muted-foreground">{listing.city}</p>
                  <div className="mt-4">
                    <ListingMap lat={listing.lat} lng={listing.lng} name={listing.name} address={listing.address} />
                  </div>
                  <a
                    href={`https://maps.google.com/maps?q=${listing.lat},${listing.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-2"
                  >
                    <Navigation className="w-3 h-3" />
                    Open in Maps
                  </a>
                </div>

                <div className="h-px bg-border" />

                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Hours
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Today</span>
                      <span className="font-medium text-foreground">{listing.hours}</span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div>
                  <h3 className="font-semibold mb-4">Contact Info</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <a href={`tel:${listing.phone.replace(/[^0-9]/g, '')}`} className="font-medium hover:text-primary transition-colors">{listing.phone}</a>
                    </div>
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <a href={listing.website} target="_blank" rel="noreferrer" className="font-medium hover:text-primary transition-colors text-primary overflow-hidden text-ellipsis whitespace-nowrap">
                        {listing.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
