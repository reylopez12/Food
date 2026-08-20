import { useState } from "react";
import { useListings } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import type { Venue as Listing } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Pencil, Trash2, Plus, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * Resolve the theme's primary color to a concrete hex-like string for use as
 * the default value of the native <input type="color"> (which cannot accept
 * CSS custom properties). Falls back to the light-mode primary hex.
 *
 * Note: `getComputedStyle` returns raw HSL components ("224 78% 48%") that
 * browsers accept inside hsl() but not as a standalone color string, so we
 * keep the hardcoded light-mode hex as a safe concrete fallback here. The
 * persisted listing colors entered by admins are always concrete hex values
 * from the color picker and are never changed by this constant.
 */
const PRIMARY_DEFAULT = "#1B4FD8"; // light-mode --primary concrete value

const BLANK: Partial<Listing> = {
  name: "", category: "restaurants", rating: 4.5, reviewCount: 0,
  address: "", city: "San Francisco", neighborhood: "", phone: "",
  website: "", hours: "", description: "", tags: [], featured: false,
  verified: false, priceRange: "$$", color: PRIMARY_DEFAULT, initials: "",
  hasVideo: false, lat: 37.7749, lng: -122.4194,
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
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
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
        <div className="col-span-2">
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
        <div className="col-span-2">
          <Label>Hours</Label>
          <Input value={form.hours ?? ""} onChange={(e) => set("hours", e.target.value)} placeholder="Mon–Fri 11am–10pm" />
        </div>
        <div className="col-span-2">
          <Label>Description</Label>
          <Textarea rows={3} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="col-span-2">
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

export default function Admin() {
  const { isAuthenticated, login } = useAuth();
  const { data: listings = [], isLoading } = useListings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Listing | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);
  const [saving, setSaving] = useState(false);

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

  // Show a friendly gate while we check admin access on first write attempt
  // (the server returns 403 if the user's email isn't in ADMIN_EMAILS)

  async function handleSave(data: FormData) {
    setSaving(true);
    try {
      const method = editTarget ? "PUT" : "POST";
      const url = editTarget
        ? `${BASE}/api/admin/listings/${editTarget.id}`
        : `${BASE}/api/admin/listings`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Request failed");
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
      const res = await fetch(`${BASE}/api/admin/listings/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Listings Admin</h1>
          <p className="text-muted-foreground mt-1">{listings.length} venues in the directory</p>
        </div>
        <Button
          className="gap-2"
          onClick={() => { setEditTarget(null); setFormOpen(true); }}
        >
          <Plus className="w-4 h-4" /> Add listing
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Venue</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Neighborhood</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Rating</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Price</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Flags</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {listings.map((listing) => (
                <tr key={listing.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: listing.color }}
                      >
                        {listing.initials}
                      </div>
                      <div>
                        <div className="font-medium leading-tight">{listing.name}</div>
                        <div className="text-xs text-muted-foreground">{listing.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize hidden md:table-cell">{listing.category}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{listing.neighborhood}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="font-medium">★ {listing.rating.toFixed(1)}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">{listing.priceRange}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {listing.featured && <Badge variant="secondary" className="text-xs px-1.5">Featured</Badge>}
                      {listing.verified && <Badge variant="outline" className="text-xs px-1.5">✓ Verified</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { setEditTarget(listing); setFormOpen(true); }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(listing)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) { setFormOpen(false); setEditTarget(null); } }}>
        <DialogContent className="max-w-2xl">
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
        <AlertDialogContent>
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
