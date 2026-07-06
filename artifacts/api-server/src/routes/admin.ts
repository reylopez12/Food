import { Router, type IRouter } from "express";
import { db, venuesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

// All admin routes require authentication
router.use((req, res, next) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
});

// POST /admin/listings — create a new venue listing
router.post("/admin/listings", async (req, res) => {
  try {
    const {
      name, category, rating, reviewCount, address, city, neighborhood,
      phone, website, hours, description, tags, featured, verified,
      priceRange, color, initials, hasVideo, video, lat, lng,
    } = req.body;

    if (!name || !category || !address || !city) {
      res.status(400).json({ error: "name, category, address, and city are required" });
      return;
    }

    // Generate slug-style ID from name
    const id = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      + "-" + randomUUID().slice(0, 6);

    const [venue] = await db
      .insert(venuesTable)
      .values({
        id,
        name,
        category,
        rating: Number(rating) || 4.0,
        reviewCount: Number(reviewCount) || 0,
        address,
        city,
        neighborhood: neighborhood || "",
        phone: phone || "",
        website: website || "",
        hours: hours || "",
        description: description || "",
        tags: Array.isArray(tags) ? tags : [],
        featured: Boolean(featured),
        verified: Boolean(verified),
        priceRange: priceRange || "$",
        color: color || "#3B82F6",
        initials: initials || name.slice(0, 2).toUpperCase(),
        hasVideo: Boolean(hasVideo),
        video: video || null,
        lat: Number(lat) || 37.7749,
        lng: Number(lng) || -122.4194,
      })
      .returning();

    res.status(201).json(venue);
  } catch (err) {
    console.error("admin create listing:", err);
    res.status(500).json({ error: "Failed to create listing" });
  }
});

// PUT /admin/listings/:id — update an existing venue listing
router.put("/admin/listings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, category, rating, reviewCount, address, city, neighborhood,
      phone, website, hours, description, tags, featured, verified,
      priceRange, color, initials, hasVideo, video, lat, lng,
    } = req.body;

    const update: Partial<typeof venuesTable.$inferInsert> = {};
    if (name !== undefined) update.name = name;
    if (category !== undefined) update.category = category;
    if (rating !== undefined) update.rating = Number(rating);
    if (reviewCount !== undefined) update.reviewCount = Number(reviewCount);
    if (address !== undefined) update.address = address;
    if (city !== undefined) update.city = city;
    if (neighborhood !== undefined) update.neighborhood = neighborhood;
    if (phone !== undefined) update.phone = phone;
    if (website !== undefined) update.website = website;
    if (hours !== undefined) update.hours = hours;
    if (description !== undefined) update.description = description;
    if (tags !== undefined) update.tags = Array.isArray(tags) ? tags : [];
    if (featured !== undefined) update.featured = Boolean(featured);
    if (verified !== undefined) update.verified = Boolean(verified);
    if (priceRange !== undefined) update.priceRange = priceRange;
    if (color !== undefined) update.color = color;
    if (initials !== undefined) update.initials = initials;
    if (hasVideo !== undefined) update.hasVideo = Boolean(hasVideo);
    if (video !== undefined) update.video = video;
    if (lat !== undefined) update.lat = Number(lat);
    if (lng !== undefined) update.lng = Number(lng);

    if (Object.keys(update).length === 0) {
      res.status(400).json({ error: "No fields to update" });
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

// DELETE /admin/listings/:id — remove a venue listing
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
