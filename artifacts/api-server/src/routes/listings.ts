import { Router, type IRouter } from "express";
import { db, venuesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/listings", async (_req, res) => {
  try {
    const listings = await db.select().from(venuesTable);
    // 5-minute browser/CDN cache; stale-while-revalidate for snappy repeat visits
    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

router.get("/listings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const results = await db
      .select()
      .from(venuesTable)
      .where(eq(venuesTable.id, id));
    if (!results[0]) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch listing" });
  }
});

export default router;
