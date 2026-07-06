import { Router, type IRouter } from "express";
import { db, venuesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Authorization: require both authentication AND admin email membership.
// Set ADMIN_EMAILS to a comma-separated list of allowed email addresses.
// Example: ADMIN_EMAILS=alice@example.com,bob@example.com
// ---------------------------------------------------------------------------
router.use((req, res, next) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length === 0) {
    // ADMIN_EMAILS not configured — lock down completely rather than open up
    res.status(403).json({ error: "Admin access not configured (set ADMIN_EMAILS)" });
    return;
  }

  const userEmail = (req.user?.email ?? "").toLowerCase();
  if (!userEmail || !adminEmails.includes(userEmail)) {
    res.status(403).json({ error: "Admin access denied" });
    return;
  }

  next();
});

// ---------------------------------------------------------------------------
// Payload validation helpers
// ---------------------------------------------------------------------------
function validateUrl(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") return undefined;
  try {
    const u = new URL(value);
    if (!["http:", "https:"].includes(u.protocol)) return undefined;
    return value;
  } catch {
    return undefined;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// ---------------------------------------------------------------------------
// POST /admin/listings — create a new venue listing
// ---------------------------------------------------------------------------
router.post("/admin/listings", async (req, res) => {
  try {
    const {
      name, category, rating, reviewCount, address, city, neighborhood,
      phone, website, hours, description, tags, featured, verified,
      priceRange, color, initials, hasVideo, video, lat, lng,
    } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    if (!address || typeof address !== "string") {
      res.status(400).json({ error: "address is required" });
      return;
    }
    if (!city || typeof city !== "string") {
      res.status(400).json({ error: "city is required" });
      return;
    }

    const safeWebsite = validateUrl(website);
    if (safeWebsite === undefined) {
      res.status(400).json({ error: "website must be a valid http/https URL or empty" });
      return;
    }

    const safeLat = clamp(Number(lat) || 37.7749, -90, 90);
    const safeLng = clamp(Number(lng) || -122.4194, -180, 180);
    const safeRating = clamp(Number(rating) || 4.0, 0, 5);
    const safeReviewCount = Math.max(0, Math.floor(Number(reviewCount) || 0));

    const id =
      name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      + "-"
      + randomUUID().slice(0, 6);

    const [venue] = await db
      .insert(venuesTable)
      .values({
        id,
        name: name.trim(),
        category: String(category || "restaurants"),
        rating: safeRating,
        reviewCount: safeReviewCount,
        address: address.trim(),
        city: city.trim(),
        neighborhood: String(neighborhood || "").trim(),
        phone: String(phone || "").trim(),
        website: safeWebsite,
        hours: String(hours || "").trim(),
        description: String(description || "").trim(),
        tags: Array.isArray(tags) ? tags.map(String) : [],
        featured: Boolean(featured),
        verified: Boolean(verified),
        priceRange: String(priceRange || "$"),
        color: /^#[0-9a-fA-F]{6}$/.test(String(color)) ? String(color) : "#3B82F6",
        initials: String(initials || name.trim()).slice(0, 3).toUpperCase(),
        hasVideo: Boolean(hasVideo),
        video: video ?? null,
        lat: safeLat,
        lng: safeLng,
      })
      .returning();

    res.status(201).json(venue);
  } catch (err) {
    console.error("admin create listing:", err);
    res.status(500).json({ error: "Failed to create listing" });
  }
});

// ---------------------------------------------------------------------------
// PUT /admin/listings/:id — update an existing venue listing
// ---------------------------------------------------------------------------
router.put("/admin/listings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const update: Partial<typeof venuesTable.$inferInsert> = {};

    if (body.name !== undefined) {
      if (!body.name || typeof body.name !== "string") {
        res.status(400).json({ error: "name must be a non-empty string" });
        return;
      }
      update.name = body.name.trim();
    }
    if (body.category !== undefined) update.category = String(body.category);
    if (body.rating !== undefined) update.rating = clamp(Number(body.rating), 0, 5);
    if (body.reviewCount !== undefined) update.reviewCount = Math.max(0, Math.floor(Number(body.reviewCount)));
    if (body.address !== undefined) update.address = String(body.address).trim();
    if (body.city !== undefined) update.city = String(body.city).trim();
    if (body.neighborhood !== undefined) update.neighborhood = String(body.neighborhood).trim();
    if (body.phone !== undefined) update.phone = String(body.phone).trim();
    if (body.website !== undefined) {
      const safe = validateUrl(body.website);
      if (safe === undefined) {
        res.status(400).json({ error: "website must be a valid http/https URL or empty" });
        return;
      }
      update.website = safe;
    }
    if (body.hours !== undefined) update.hours = String(body.hours).trim();
    if (body.description !== undefined) update.description = String(body.description).trim();
    if (body.tags !== undefined) update.tags = Array.isArray(body.tags) ? body.tags.map(String) : [];
    if (body.featured !== undefined) update.featured = Boolean(body.featured);
    if (body.verified !== undefined) update.verified = Boolean(body.verified);
    if (body.priceRange !== undefined) update.priceRange = String(body.priceRange);
    if (body.color !== undefined) {
      update.color = /^#[0-9a-fA-F]{6}$/.test(String(body.color)) ? String(body.color) : "#3B82F6";
    }
    if (body.initials !== undefined) update.initials = String(body.initials).slice(0, 3).toUpperCase();
    if (body.hasVideo !== undefined) update.hasVideo = Boolean(body.hasVideo);
    if (body.video !== undefined) update.video = body.video;
    if (body.lat !== undefined) update.lat = clamp(Number(body.lat), -90, 90);
    if (body.lng !== undefined) update.lng = clamp(Number(body.lng), -180, 180);

    if (Object.keys(update).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    const [updated] = await db
      .update(venuesTable)
      .set(update)
      .where(eq(venuesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    console.error("admin update listing:", err);
    res.status(500).json({ error: "Failed to update listing" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /admin/listings/:id — remove a venue listing
// ---------------------------------------------------------------------------
router.delete("/admin/listings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [deleted] = await db
      .delete(venuesTable)
      .where(eq(venuesTable.id, id))
      .returning({ id: venuesTable.id });

    if (!deleted) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    res.json({ deleted: deleted.id });
  } catch (err) {
    console.error("admin delete listing:", err);
    res.status(500).json({ error: "Failed to delete listing" });
  }
});

export default router;
