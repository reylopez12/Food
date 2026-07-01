import { Router, type IRouter } from "express";
import { db, followsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

const router: IRouter = Router();

// GET /follows — list venue IDs the current user follows
router.get("/follows", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = req.user.id;
  try {
    const rows = await db
      .select({ venueId: followsTable.venueId })
      .from(followsTable)
      .where(eq(followsTable.userId, userId));
    res.json({ following: rows.map((r) => r.venueId) });
  } catch {
    res.status(500).json({ error: "Failed to fetch follows" });
  }
});

// POST /follows/:venueId — atomic toggle follow/unfollow using a transaction
// with a locking SELECT to prevent race-condition duplicate inserts.
router.post("/follows/:venueId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = req.user.id;
  const { venueId } = req.params;

  try {
    const nowFollowing = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: followsTable.id })
        .from(followsTable)
        .where(and(eq(followsTable.userId, userId), eq(followsTable.venueId, venueId)))
        .for("update");

      if (existing) {
        await tx
          .delete(followsTable)
          .where(and(eq(followsTable.userId, userId), eq(followsTable.venueId, venueId)));
        return false;
      }

      await tx.insert(followsTable).values({ userId, venueId });
      return true;
    });

    res.json({ following: nowFollowing });
  } catch {
    res.status(500).json({ error: "Failed to toggle follow" });
  }
});

export default router;
