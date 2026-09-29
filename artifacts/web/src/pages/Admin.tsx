import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useListings } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import type { Venue } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Plus, LogIn, Search, ShieldAlert, Megaphone, Mail, Phone, Globe, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "../hooks/useIsAdmin";
import { usePageMeta } from "../hooks/usePageMeta";

/** The listings API returns every column, including the broadcaster flag. */
type Listing = Venue & { broadcasterActive?: boolean };

interface PartnerInquiry {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  website: string;
  venueId: string | null;
  interest: string;
  message: string;
  status: string;
  createdAt: string;
}

const INQUIRY_STATUSES = ["new", "contacted", "approved", "declined"] as const;

const INTEREST_LABELS: Record<string, string> = {
  listing: "New listing",
  claim: "Claim listing",
  broadcaster: "Broadcaster",
  featured: "Featured",
  other: "Other",
};

const STATUS_STYLES: Record<string, string> = {
  new: "bg-primary/15 text-primary border-primary/30",
  contacted: "bg-secondary/30 text-secondary-foreground border-secondary/50",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  declined: "bg-muted text-muted-foreground border-border",
};

// The API is always mounted at /api, independent of the web app's base path.
const API = "/api";

/**
 * Resolve the theme's primary color to a concrete hex-like string for use as
 * the default value of the native <input type="color"> (which cannot accept
 * CSS custom properties). Falls back to the light-mode primary hex.
 *
 * Note: `getComputedStyle` returns raw HSL components ("15 70% 60%") that
 * browsers accept inside hsl() but not as a standalone color string, so we
 * keep the hardcoded light-mode hex as a safe concrete fallback here. The
 * persisted listing colors entered by admins are always concrete hex values
 * from the color picker and are never changed by this constant.
 */
const PRIMARY_DEFAULT = "#E07552"; // light-mode --primary (Coral) concrete value

// Leave rating and coordinates at 0 until real values are known — 0,0 means
// "no pin", so a new listing never lands at a made-up location.
const BLANK: Partial<Listing> = {
  name: "", category: "restaurants", rating: 0, reviewCount: 0,
  address: "", city: "Oakland, CA", neighborhood: "", phone: "",
  website: "", hours: "", description: "", tags: [], featured: false,
  verified: false, priceRange: "$$", color: PRIMARY_DEFAULT, initials: "",
  hasVideo: false, lat: 0, lng: 0, broadcasterActive: false,
};

type FormData = typeof BLANK;

function ListingForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: FormData;
  onSave: (data: FormData) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormData>(initial);
  const set = (k: keyof FormData, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 [&_label:not([for])]:mb-1.5 [&_label:not([for])]:block">
        <div className="sm:col-span-2">
          <Label>Name *</Label>
          <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <Label>Category</Label>
          <Input value={form.category ?? ""} onChange={(e) => set("category", e.target.value)} placeholder="restaurants" />
        </div>
        <div>
          <Label>Price Range</Label>
          <Input value={form.priceRange ?? ""} onChange={(e) => set("priceRange", e.target.value)} placeholder="$$ or $$$" />
        </div>
        <div>
          <Label>Rating (0–5)</Label>
          <Input type="number" min={0} max={5} step={0.1} value={form.rating ?? ""} onChange={(e) => set("rating", parseFloat(e.target.value))} />
        </div>
        <div>
          <Label>Review Count</Label>
          <Input type="number" min={0} value={form.reviewCount ?? ""} onChange={(e) => set("reviewCount", parseInt(e.target.value, 10))} />
        </div>
        <div className="sm:col-span-2">
          <Label>Address *</Label>
          <Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
        </div>
        <div>
          <Label>City *</Label>
          <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
        </div>
        <div>
          <Label>Neighborhood</Label>
          <Input value={form.neighborhood ?? ""} onChange={(e) => set("neighborhood", e.target.value)} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="+1 (415) 555-0100" />
        </div>
        <div>
          <Label>Website</Label>
          <Input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="https://..." />
        </div>
        <div className="sm:col-span-2">
          <Label>Hours</Label>
          <Input value={form.hours ?? ""} onChange={(e) => set("hours", e.target.value)} placeholder="Mon–Fri 11am–10pm" />
        </div>
        <div className="sm:col-span-2">
          <Label>Description</Label>
          <Textarea rows={3} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Tags (comma-separated)</Label>
          <Input
            value={Array.isArray(form.tags) ? form.tags.join(", ") : ""}
            onChange={(e) =>
              set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))
            }
            placeholder="Tacos, Burritos, Late Night"
          />
        </div>
        <div>
          <Label>Color (hex)</Label>
          <div className="flex gap-2 items-center">
            <input type="color" value={form.color ?? PRIMARY_DEFAULT} onChange={(e) => set("color", e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
            <Input value={form.color ?? ""} onChange={(e) => set("color", e.target.value)} className="flex-1" />
          </div>
        </div>
        <div>
          <Label>Initials (2–3 chars)</Label>
          <Input value={form.initials ?? ""} onChange={(e) => set("initials", e.target.value.slice(0, 3).toUpperCase())} maxLength={3} />
        </div>
        <div>
          <Label>Latitude</Label>
          <Input type="number" step="any" value={form.lat ?? ""} onChange={(e) => set("lat", parseFloat(e.target.value))} />
        </div>
        <div>
          <Label>Longitude</Label>
          <Input type="number" step="any" value={form.lng ?? ""} onChange={(e) => set("lng", parseFloat(e.target.value))} />
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={!!form.featured} onCheckedChange={(v) => set("featured", v)} id="featured" />
          <Label htmlFor="featured">Featured</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={!!form.verified} onCheckedChange={(v) => set("verified", v)} id="verified" />
          <Label htmlFor="verified">Verified</Label>
        </div>
        <div className="flex items-start gap-3 sm:col-span-2 rounded-lg border bg-muted/30 p-3">
          <Switch checked={!!form.broadcasterActive} onCheckedChange={(v) => set("broadcasterActive", v)} id="broadcasterActive" className="mt-0.5" />
          <div>
            <Label htmlFor="broadcasterActive">Broadcaster active</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Turn on once the owner has paid for the Broadcaster plan. Enables announcements on this listing.</p>
          </div>
        </div>
      </div>

      <DialogFooter className="pt-2 sticky bottom-0 bg-background">
        <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={saving || !form.name || !form.address}>
          {saving ? "Saving…" : "Save listing"}
        </Button>
      </DialogFooter>
    </div>
  );
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as T;
}

function InquiriesPanel({ listings }: { listings: Listing[] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("open");
  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: ["/api/admin/partner-inquiries"],
    queryFn: () => apiJson<PartnerInquiry[]>(`${API}/admin/partner-inquiries`),
    staleTime: 30_000,
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = { open: 0 };
    for (const i of inquiries) {
      c[i.status] = (c[i.status] ?? 0) + 1;
      if (i.status === "new" || i.status === "contacted") c.open++;
    }
    return c;
  }, [inquiries]);

  const visible = inquiries.filter((i) =>
    filter === "all" ? true : filter === "open" ? i.status === "new" || i.status === "contacted" : i.status === filter,
  );

  async function updateStatus(id: string, status: string) {
    try {
      await apiJson(`${API}/admin/partner-inquiries/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/partner-inquiries"] });
    } catch (err) {
      toast({ title: "Couldn't update status", description: String(err), variant: "destructive" });
    }
  }

  const FILTERS = [
    { id: "open", label: "Open" },
    ...INQUIRY_STATUSES.map((s) => ({ id: s, label: s[0].toUpperCase() + s.slice(1) })),
    { id: "all", label: "All" },
  ];

  return (
    <div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === f.id ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
            <span className="ml-1.5 opacity-70">{f.id === "all" ? inquiries.length : counts[f.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 px-6 py-16 text-center">
          <p className="text-lg font-semibold">No inquiries here yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Applications from the <Link href="/partners" className="underline hover:text-foreground">For Business</Link> page show up here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((inq) => {
            const venue = inq.venueId ? listings.find((l) => l.id === inq.venueId) : undefined;
            return (
              <div key={inq.id} className="flex flex-col rounded-xl border bg-card p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold leading-tight">{inq.businessName}</p>
                    <p className="text-sm text-muted-foreground">
                      {inq.contactName}
                      {inq.city ? ` · ${inq.city}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">{INTEREST_LABELS[inq.interest] ?? inq.interest}</Badge>
                </div>

                <div className="mb-3 space-y-1.5 text-sm">
                  <a href={`mailto:${inq.email}`} className="flex items-center gap-2 text-primary hover:underline">
                    <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{inq.email}</span>
                  </a>
                  {inq.phone && (
                    <a href={`tel:${inq.phone.replace(/[^0-9+]/g, "")}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" /> {inq.phone}
                    </a>
                  )}
                  {inq.website && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{inq.website}</span>
                    </p>
                  )}
                  {venue && (
                    <Link href={`/listing/${venue.id}`} className="flex items-center gap-2 font-medium text-foreground hover:underline">
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" /> Claiming: {venue.name}
                    </Link>
                  )}
                </div>

                {inq.message && (
                  <p className="mb-4 whitespace-pre-line rounded-lg bg-muted/50 p-3 text-sm text-foreground/90">{inq.message}</p>
                )}

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                  <span className="text-xs text-muted-foreground">{new Date(inq.createdAt).toLocaleString()}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {INQUIRY_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => inq.status !== s && updateStatus(inq.id, s)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                          inq.status === s ? STATUS_STYLES[s] : "border-transparent text-muted-foreground hover:border-border"
                        }`}
                        aria-pressed={inq.status === s}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  usePageMeta("Admin");
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin(isAuthenticated);
  const { data: rawListings = [], isLoading } = useListings();
  const listings = rawListings as Listing[];
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [tab, setTab] = useState<"listings" | "inquiries">("listings");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Listing | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter((l) =>
      [l.name, l.neighborhood, l.city, l.id].some((v) => v.toLowerCase().includes(q)),
    );
  }, [listings, query]);

  if (authLoading || (isAuthenticated && adminLoading)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <h1 className="text-2xl font-bold">Admin panel</h1>
        <p className="text-muted-foreground">Sign in to manage listings.</p>
        <Button onClick={login} className="gap-2">
          <LogIn className="w-4 h-4" /> Log in
        </Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <ShieldAlert className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold">No admin access</h1>
        <p className="text-muted-foreground max-w-md">
          Your account isn't on the admin list. Ask the site owner to add your email to <code className="rounded bg-muted px-1.5 py-0.5 text-sm">ADMIN_EMAILS</code>.
        </p>
        <Button asChild variant="outline">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    );
  }

  async function handleSave(data: FormData) {
    setSaving(true);
    try {
      const url = editTarget
        ? `${API}/admin/listings/${editTarget.id}`
        : `${API}/admin/listings`;
      await apiJson(url, { method: editTarget ? "PUT" : "POST", body: JSON.stringify(data) });
      await queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      toast({ title: editTarget ? "Listing updated" : "Listing created" });
      setFormOpen(false);
      setEditTarget(null);
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await apiJson(`${API}/admin/listings/${deleteTarget.id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      toast({ title: "Listing deleted" });
      setDeleteTarget(null);
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
          <p className="text-muted-foreground mt-1">{listings.length} venues in the directory</p>
        </div>
        {tab === "listings" && (
          <Button
            className="gap-2 self-start sm:self-auto"
            onClick={() => { setEditTarget(null); setFormOpen(true); }}
          >
            <Plus className="w-4 h-4" /> Add listing
          </Button>
        )}
      </div>

      <div className="mb-6 inline-flex rounded-full bg-muted p-1" role="tablist">
        {([
          { id: "listings", label: "Listings" },
          { id: "inquiries", label: "Partner inquiries" },
        ] as const).map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 sm:px-5 py-2 text-sm font-semibold transition-all ${
              tab === t.id ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "inquiries" ? (
        <InquiriesPanel listings={listings} />
      ) : isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="relative mb-4 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, neighborhood, city"
              className="pl-9 bg-card"
            />
          </div>
          <div className="border rounded-xl overflow-x-auto bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Venue</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Neighborhood</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">City</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Price</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Flags</th>
                  <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((listing) => (
                  <tr key={listing.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: listing.color }}
                        >
                          {listing.initials}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/listing/${listing.id}`} className="font-medium leading-tight hover:underline">{listing.name}</Link>
                          <div className="text-xs text-muted-foreground truncate max-w-[180px] sm:max-w-none">{listing.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{listing.neighborhood}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{listing.city.replace(/,\s*CA$/, "")}</td>
                    <td className="px-4 py-3 hidden md:table-cell">{listing.priceRange}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {listing.featured && <Badge variant="secondary" className="text-xs px-1.5">Featured</Badge>}
                        {listing.verified && <Badge variant="outline" className="text-xs px-1.5">✓ Verified</Badge>}
                        {listing.broadcasterActive && (
                          <Badge variant="outline" className="text-xs px-1.5 gap-1 border-primary/40 text-primary">
                            <Megaphone className="w-3 h-3" /> Broadcaster
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Edit ${listing.name}`}
                          onClick={() => { setEditTarget(listing); setFormOpen(true); }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          aria-label={`Delete ${listing.name}`}
                          onClick={() => setDeleteTarget(listing)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No listings match "{query}".</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) { setFormOpen(false); setEditTarget(null); } }}>
        <DialogContent className="max-w-2xl w-[calc(100%-2rem)] rounded-xl">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit listing" : "Add new listing"}</DialogTitle>
            <DialogDescription>
              {editTarget ? `Editing ${editTarget.name}` : "Fill in the details for the new venue."}
            </DialogDescription>
          </DialogHeader>
          <ListingForm
            key={editTarget?.id ?? "new"}
            initial={editTarget ? { ...editTarget } : { ...BLANK }}
            onSave={handleSave}
            onCancel={() => { setFormOpen(false); setEditTarget(null); }}
            saving={saving}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="w-[calc(100%-2rem)] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the listing from the directory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? "Deleting…" : "Delete listing"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}