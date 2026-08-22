import { useState, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Phone, Globe, Navigation, Share2, MapPin, Clock, CheckCircle2, Bookmark, BookmarkCheck, Heart, HeartOff, Megaphone, Send, Copy, Check } from "lucide-react";
import { useListing } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { StarRating } from "../components/StarRating";
import { VideoSpot } from "../components/VideoSpot";
import { ListingMap } from "../components/ListingMap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useSavedListings } from "../hooks/useSavedListings";
import { useFollows } from "../hooks/useFollows";
import { useAnnouncements, useBroadcasterStatus } from "../hooks/useNotifications";
import { useToast } from "@/hooks/use-toast";
import "leaflet/dist/leaflet.css";

export default function ListingDetail() {
  const [match, params] = useRoute("/listing/:id");
  const { isSaved, toggleSaved } = useSavedListings();
  const { toast } = useToast();
  const { isAuthenticated, login } = useAuth();
  const { isFollowing, toggleFollow } = useFollows(isAuthenticated);
  const [addressCopied, setAddressCopied] = useState(false);

  const copyAddress = useCallback((address: string, city: string) => {
    navigator.clipboard.writeText(`${address}, ${city}`).then(() => {
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
    });
  }, []);

  const id = params?.id ?? "";
  const { announcements, post: postAnnouncement } = useAnnouncements(id);
  const { active: isBroadcaster, canPost } = useBroadcasterStatus(id);
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [postType, setPostType] = useState<"general" | "special" | "closed">("general");
  const [postSaving, setPostSaving] = useState(false);
  // useListing already sets enabled: id !== null && id !== undefined internally
  const { data: listing, isLoading, isError } = useListing(id);

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
  const followed = isFollowing(listing.id);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied!",
      description: "Listing link has been copied to your clipboard.",
    });
  };

  const handleFollow = async () => {
    if (!isAuthenticated) {
      login();
      return;
    }
    try {
      const nowFollowing = await toggleFollow(listing.id);
      toast({
        title: nowFollowing ? `Following ${listing.name}` : `Unfollowed ${listing.name}`,
        description: nowFollowing
          ? "You'll see announcements from this venue."
          : "You won't receive announcements from this venue.",
      });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
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
            <Button variant="secondary" size="icon" onClick={handleFollow} className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm" aria-label={followed ? "Unfollow" : "Follow"}>
              {followed ? <HeartOff className="w-5 h-5" /> : <Heart className="w-5 h-5" />}
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

                {/* Follow CTA */}
                <Button
                  variant={followed ? "secondary" : "default"}
                  size="sm"
                  onClick={handleFollow}
                  className="gap-2 mb-2"
                >
                  <Heart className={`w-4 h-4 ${followed ? "fill-current" : ""}`} />
                  {followed ? "Following" : "Follow venue"}
                </Button>
                {!isAuthenticated && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Log in to follow and get announcements
                  </p>
                )}
              </div>

              {/* Action Buttons Row - Desktop right, Mobile below */}
              <div className="flex flex-row md:flex-col gap-3 w-full md:w-auto shrink-0 overflow-x-auto pb-2 md:pb-0">
                {listing.phone ? (
                  <Button size="lg" className="flex-1 md:w-full gap-2" asChild>
                    <a href={`tel:${listing.phone.replace(/[^0-9]/g, '')}`}>
                      <Phone className="w-4 h-4" />
                      <span>Call Now</span>
                    </a>
                  </Button>
                ) : (
                  <Button size="lg" className="flex-1 md:w-full gap-2" variant="outline" asChild>
                    <a href={`https://www.google.com/search?q=${encodeURIComponent(listing.name + ' ' + listing.city + ' phone number')}`} target="_blank" rel="noreferrer">
                      <Phone className="w-4 h-4" />
                      <span>Find Phone</span>
                    </a>
                  </Button>
                )}
                {listing.website ? (
                  <Button size="lg" variant="outline" className="flex-1 md:w-full gap-2" asChild>
                    <a href={listing.website} target="_blank" rel="noreferrer">
                      <Globe className="w-4 h-4" />
                      <span>Website</span>
                    </a>
                  </Button>
                ) : (
                  <Button size="lg" variant="outline" className="flex-1 md:w-full gap-2" asChild>
                    <a href={`https://www.google.com/search?q=${encodeURIComponent(listing.name + ' ' + listing.city)}`} target="_blank" rel="noreferrer">
                      <Globe className="w-4 h-4" />
                      <span>Search Online</span>
                    </a>
                  </Button>
                )}
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

            {/* Announcements section */}
            {(announcements.length > 0 || isBroadcaster) && (
              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-primary" />
                  Announcements
                </h2>

                {/* Post form — visible when broadcaster active + authenticated */}
                {canPost && (
                  <Card className="mb-4 border-primary/20 bg-primary/5">
                    <CardContent className="p-4 space-y-3">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide">Post an announcement</p>
                      <div className="flex gap-2">
                        {(["general", "special", "closed"] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setPostType(t)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors capitalize ${
                              postType === t
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-muted-foreground hover:border-foreground/30"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <Input
                        placeholder="Title (e.g. Closed for the holiday)"
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                        maxLength={120}
                      />
                      <Textarea
                        placeholder="Message… (up to 280 characters)"
                        value={postBody}
                        onChange={(e) => setPostBody(e.target.value)}
                        maxLength={280}
                        rows={3}
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          className="gap-2"
                          disabled={postSaving || !postTitle.trim() || !postBody.trim()}
                          onClick={async () => {
                            setPostSaving(true);
                            try {
                              await postAnnouncement({ title: postTitle, body: postBody, type: postType });
                              setPostTitle("");
                              setPostBody("");
                              setPostType("general");
                              toast({ title: "Announcement posted!" });
                            } catch (err) {
                              toast({ title: "Failed to post", description: String(err), variant: "destructive" });
                            } finally {
                              setPostSaving(false);
                            }
                          }}
                        >
                          <Send className="w-3.5 h-3.5" />
                          {postSaving ? "Posting…" : "Post"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Get Broadcaster CTA */}
                {!canPost && isAuthenticated && (
                  <Card className="mb-4 border-dashed">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Megaphone className="w-8 h-8 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold text-sm">Broadcaster subscription</p>
                        <p className="text-xs text-muted-foreground">Post announcements to all your followers — specials, closures, and more. $29/month.</p>
                      </div>
                      <Button size="sm" variant="outline" disabled>Coming soon</Button>
                    </CardContent>
                  </Card>
                )}

                {/* Announcement list */}
                {announcements.length > 0 ? (
                  <div className="space-y-3">
                    {announcements.map((a) => {
                      const typeColors: Record<string, string> = {
                        closed: "bg-destructive/10 text-destructive",
                        special: "bg-secondary/30 text-secondary-foreground",
                        general: "bg-primary/15 text-accent-foreground",
                      };
                      const typeLabels: Record<string, string> = { closed: "Closed today", special: "Daily special", general: "Update" };
                      return (
                        <div key={a.id} className="border rounded-xl p-4 bg-card">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[a.type] ?? typeColors.general}`}>
                              {typeLabels[a.type] ?? "Update"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(a.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="font-semibold text-sm">{a.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{a.body}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No announcements yet.</p>
                )}
              </section>
            )}
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
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground">{listing.address}</p>
                      <p className="text-sm text-muted-foreground">{listing.city}</p>
                    </div>
                    <button
                      onClick={() => copyAddress(listing.address, listing.city)}
                      title="Copy address"
                      className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      {addressCopied ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
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
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      {listing.phone ? (
                        <a href={`tel:${listing.phone.replace(/[^0-9]/g, '')}`} className="font-medium hover:text-primary transition-colors">
                          {listing.phone}
                        </a>
                      ) : (
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(listing.name + ' ' + listing.city + ' phone number')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors italic"
                        >
                          Not listed — search Google
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                      {listing.website ? (
                        <a href={listing.website} target="_blank" rel="noreferrer" className="font-medium hover:text-primary transition-colors text-primary overflow-hidden text-ellipsis whitespace-nowrap">
                          {listing.website.replace(/^https?:\/\//, '')}
                        </a>
                      ) : (
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(listing.name + ' ' + listing.city)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors italic"
                        >
                          Not listed — search Google
                        </a>
                      )}
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
