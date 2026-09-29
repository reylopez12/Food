import { Router, type IRouter } from "express";
import { db, venuesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { isAdmin } from "../lib/access";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// GET /broadcaster/status/:venueId — public
// Returns whether a venue has an active Broadcaster subscription, plus
// whether the authenticated caller is permitted to post announcements.
// canPost = broadcasterActive AND caller is in ADMIN_EMAILS (ownership check
// will be added when venue ownership lands as a follow-up task).
// ---------------------------------------------------------------------------
router.get("/broadcaster/status/:venueId", async (req, res) => {
  try {
    const { venueId } = req.params;
    const [venue] = await db
      .select({ broadcasterActive: venuesTable.broadcasterActive })
      .from(venuesTable)
      .where(eq(venuesTable.id, venueId))
      .limit(1);

    if (!venue) {
      res.status(404).json({ error: "Venue not found" });
      return;
    }

    res.json({
      active: venue.broadcasterActive,
      canPost: venue.broadcasterActive && isAdmin(req),
    });
  } catch (err) {
    console.error("broadcaster status:", err);
    res.status(500).json({ error: "Failed to fetch broadcaster status" });
  }
});

// ---------------------------------------------------------------------------
// POST /broadcaster/checkout — auth required
// Stub: Stripe is not yet connected. Returns a 503 with instructions.
// ---------------------------------------------------------------------------
router.post("/broadcaster/checkout", (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  res.status(503).json({
    error: "Stripe not configured",
    message:
      "Paid Broadcaster subscriptions require Stripe. Connect the Stripe integration in your Replit project to enable checkout.",
  });
});

export default router;
