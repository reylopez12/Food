import { Router, type IRouter } from "express";
import { db, partnerInquiriesTable, venuesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { EMAIL_RE, createRateLimiter, text } from "../lib/publicForm";

const router: IRouter = Router();

const INTERESTS = ["listing", "claim", "broadcaster", "featured", "other"];

// The form is public and unauthenticated: 5 submissions per IP per hour.
const rateLimited = createRateLimiter(5, 60 * 60 * 1000);

// ---------------------------------------------------------------------------
// POST /partner-inquiries — public
// A business asks to be listed, claim a listing, or upgrade to a paid plan.
// ---------------------------------------------------------------------------
router.post("/partner-inquiries", async (req, res) => {
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

  const businessName = text(body.businessName, 120);
  const contactName = text(body.contactName, 120);
  const email = text(body.email, 200);
  const interest = INTERESTS.includes(body.interest) ? body.interest : "listing";

  if (!businessName) {
    res.status(400).json({ error: "Business name is required" });
    return;
  }
  if (!contactName) {
    res.status(400).json({ error: "Your name is required" });
    return;
  }
  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: "A valid email is required" });
    return;
  }

  try {
    let venueId: string | null = text(body.venueId, 200) || null;
    if (venueId) {
      const [venue] = await db
        .select({ id: venuesTable.id })
        .from(venuesTable)
        .where(eq(venuesTable.id, venueId))
        .limit(1);
      if (!venue) venueId = null;
    }

    await db.insert(partnerInquiriesTable).values({
      businessName,
      contactName,
      email,
      phone: text(body.phone, 40),
      city: text(body.city, 80),
      website: text(body.website, 300),
      venueId,
      interest,
      message: text(body.message, 2000),
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("create partner inquiry:", err);
    res.status(500).json({ error: "Failed to submit — please try again." });
  }
});

export default router;
