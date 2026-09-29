import { Router, type IRouter } from "express";
import { db, partnerInquiriesTable, venuesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const INTERESTS = ["listing", "claim", "broadcaster", "featured", "other"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Simple per-IP limiter — the form is public and unauthenticated.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  if (recent.size > 10_000) recent.clear();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > MAX_PER_WINDOW;
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

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
