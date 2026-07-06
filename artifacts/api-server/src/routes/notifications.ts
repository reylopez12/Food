import { Router, type IRouter } from "express";
import { db, notificationsTable, announcementsTable, venuesTable } from "@workspace/db";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { notifEmitter } from "../lib/notificationEmitter";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// GET /notifications/stream — auth required, Server-Sent Events
// Pushes { type: "refresh" } whenever a new announcement is fanned out to
// this user. Client re-fetches the full notification list on receipt.
// ---------------------------------------------------------------------------
router.get("/notifications/stream", (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const userId = req.user!.id;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
  res.flushHeaders();

  // Initial heartbeat so the client knows the stream is alive
  res.write(": connected\n\n");

  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 25_000);

  const handler = (payload: object) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  notifEmitter.on(`user:${userId}`, handler);

  req.on("close", () => {
    clearInterval(heartbeat);
    notifEmitter.off(`user:${userId}`, handler);
  });
});

// ---------------------------------------------------------------------------
// GET /notifications — auth required
// Returns the current user's notifications with announcement + venue details.
// ---------------------------------------------------------------------------
router.get("/notifications", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const userId = req.user!.id;

    // Join notifications → announcements → venues in a single query
    const rows = await db
      .select({
        id: notificationsTable.id,
        readAt: notificationsTable.readAt,
        createdAt: notificationsTable.createdAt,
        announcement: {
          id: announcementsTable.id,
          venueId: announcementsTable.venueId,
          venueName: venuesTable.name,
          title: announcementsTable.title,
          body: announcementsTable.body,
          type: announcementsTable.type,
          createdAt: announcementsTable.createdAt,
        },
      })
      .from(notificationsTable)
      .innerJoin(
        announcementsTable,
        eq(notificationsTable.announcementId, announcementsTable.id),
      )
      .innerJoin(venuesTable, eq(announcementsTable.venueId, venuesTable.id))
      .where(eq(notificationsTable.userId, userId))
      .orderBy(sql`${notificationsTable.createdAt} DESC`)
      .limit(100);

    res.json(rows);
  } catch (err) {
    console.error("get notifications:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// ---------------------------------------------------------------------------
// GET /notifications/unread-count — auth required, lightweight badge endpoint
// ---------------------------------------------------------------------------
router.get("/notifications/unread-count", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.json({ count: 0 });
    return;
  }
  try {
    const userId = req.user!.id;
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, userId),
          isNull(notificationsTable.readAt),
        ),
      );
    res.json({ count: row?.count ?? 0 });
  } catch {
    res.json({ count: 0 });
  }
});

// ---------------------------------------------------------------------------
// POST /notifications/read — auth required
// Body: { ids?: string[] } — empty / missing ids means mark ALL as read.
// ---------------------------------------------------------------------------
router.post("/notifications/read", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const userId = req.user!.id;
    const { ids } = req.body as { ids?: string[] };
    const now = new Date();

    if (Array.isArray(ids) && ids.length > 0) {
      await db
        .update(notificationsTable)
        .set({ readAt: now })
        .where(
          and(
            eq(notificationsTable.userId, userId),
            inArray(notificationsTable.id, ids),
          ),
        );
    } else {
      // Mark all unread notifications for this user as read
      await db
        .update(notificationsTable)
        .set({ readAt: now })
        .where(
          and(
            eq(notificationsTable.userId, userId),
            isNull(notificationsTable.readAt),
          ),
        );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("mark read:", err);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

export default router;
