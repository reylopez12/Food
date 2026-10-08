import { Router, type IRouter } from "express";
import { db, feedbackTable, venuesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { EMAIL_RE, createRateLimiter, text } from "../lib/publicForm";

const router: IRouter = Router();

const TOPICS: Record<string, string[]> = {
  listing_edit: ["hours", "address", "phone", "website", "details", "closed", "other"],
  general: ["idea", "problem", "praise", "other"],
};

// The form is public and unauthenticated: 10 submissions per IP per hour.
const rateLimited = createRateLimiter(10, 60 * 60 * 1000);

// ---------------------------------------------------------------------------
// POST /feedback — public
// A diner suggests a correction to a listing, or shares general feedback.
// ---------------------------------------------------------------------------
router.post("/feedback", async (req, res) => {
  const body = req.body ?? {};

  // Honeypot: real users never see or fill this field.
  if (text(body.company_url, 200)) {
    res.status(201).json({ ok: true });
    return;
  }

  if (rateLimited(req.ip ?? "unknown")) {
    res.status(429).json({ error: "Too many submissions — please try again later." });
    return;
  }

  const category = body.category === "listing_edit" ? "listing_edit" : "general";
  const topic = TOPICS[category].includes(body.topic) ? body.topic : "other";
  const message = text(body.message, 2000);
  const email = text(body.email, 200);

  if (!message) {
    res.status(400).json({ error: "Please tell us a bit more in the message." });
    return;
  }
  if (email && !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "That email doesn't look right." });
    return;
  }

  try {
    let venueId: string | null = null;
    if (category === "listing_edit") {
      const id = text(body.venueId, 200);
      const [venue] = id
        ? await db
            .select({ id: venuesTable.id })
            .from(venuesTable)
            .where(eq(venuesTable.id, id))
            .limit(1)
        : [];
      if (!venue) {
        res.status(400).json({ error: "Pick the listing that needs an edit." });
        return;
      }
      venueId = venue.id;
    }

    await db.insert(feedbackTable).values({
      category,
      venueId,
      topic,
      message,
      name: text(body.name, 120),
      email,
      userId: req.isAuthenticated() ? req.user.id : null,
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("create feedback:", err);
    res.status(500).json({ error: "Failed to submit — please try again." });
  }
});

export default router;
