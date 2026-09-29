import { Router, type IRouter } from "express";
import { db, venuesTable, announcementsTable, followsTable, notificationsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { notifEmitter } from "../lib/notificationEmitter";
import { isAdmin } from "../lib/access";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// GET /listings/:id/announcements — public, newest first
// ---------------------------------------------------------------------------
router.get("/listings/:id/announcements", async (req, res) => {
  try {
    const { id } = req.params;
    const announcements = await db
      .select()
      .from(announcementsTable)
      .where(eq(announcementsTable.venueId, id))
      .orderBy(sql`${announcementsTable.createdAt} DESC`)
      .limit(50);
    res.json(announcements);
  } catch (err) {
    console.error("get announcements:", err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// ---------------------------------------------------------------------------
// POST /listings/:id/announcements — auth + broadcaster required
// Creates the announcement and fans out notifications to all venue followers.
// ---------------------------------------------------------------------------
router.post("/listings/:id/announcements", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const { id: venueId } = req.params;
    const { title, body, type = "general" } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      res.status(400).json({ error: "title is required" });
      return;
    }
    if (!body || typeof body !== "string" || !body.trim()) {
      res.status(400).json({ error: "body is required" });
      return;
    }
    const validTypes = ["general", "special", "closed"];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: "type must be general | special | closed" });
      return;
    }

    // Venue must exist and be a broadcaster
    const [venue] = await db
      .select({ id: venuesTable.id, broadcasterActive: venuesTable.broadcasterActive })
      .from(venuesTable)
      .where(eq(venuesTable.id, venueId))
      .limit(1);

    if (!venue) {
      res.status(404).json({ error: "Venue not found" });
      return;
    }
    if (!venue.broadcasterActive) {
      res.status(403).json({ error: "This venue does not have an active Broadcaster subscription" });
      return;
    }

    // Authorization: user must be in the ADMIN_EMAILS allowlist.
    // (When venue ownership lands in a future task, the check will broaden to include
    // users who own this specific venue.)
    if (!isAdmin(req)) {
      res.status(403).json({
        error: "You are not authorized to post announcements for this venue",
      });
      return;
    }

    const userId = req.user!.id;

    // Insert announcement + fan-out notifications in a single transaction so
    // partial state (announcement without notifications) can never occur.
    const announcement = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(announcementsTable)
        .values({
          venueId,
          postedById: userId,
          title: title.trim().slice(0, 120),
          body: body.trim().slice(0, 280),
          type,
        })
        .returning();

      const followers = await tx
        .select({ userId: followsTable.userId })
        .from(followsTable)
        .where(eq(followsTable.venueId, venueId));

      if (followers.length > 0) {
        await tx.insert(notificationsTable).values(
          followers.map((f) => ({
            userId: f.userId,
            announcementId: created.id,
          })),
        );
      }

      return { created, followerIds: followers.map((f) => f.userId) };
    });

    // Notify connected SSE clients for each follower (fire-and-forget, non-fatal)
    for (const userId of announcement.followerIds) {
      notifEmitter.emit(`user:${userId}`, { type: "refresh" });
    }

    res.status(201).json(announcement.created);
  } catch (err) {
    console.error("post announcement:", err);
    res.status(500).json({ error: "Failed to post announcement" });
  }
});

export default router;
