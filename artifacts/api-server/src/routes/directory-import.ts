import { Router, type IRouter } from "express";
import { db, venuesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  buildImportPlan, digest, directoryDigest, loadImportCandidates, parseImportInput,
} from "@workspace/db/directory-import";
import { PreviewDirectoryImportBody } from "@workspace/api-zod";
import { signImportApproval, verifyImportApproval } from "../lib/import-confirmation";
import { isAdmin } from "../lib/access";

/** Mounted after the admin router's existing authentication + role checks. */
const target = () => process.env.NODE_ENV === "production" ? "live" as const : "development" as const;

export function createDirectoryImportRouter(database = db, getTarget = target): IRouter {
const router: IRouter = Router();
router.use((req, res, next) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!isAdmin(req)) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  // Imports from browser sessions must be same-origin. Native bearer clients do
  // not send Origin; they still pass the enclosing admin authorization gate.
  if (req.get("sec-fetch-site") === "cross-site") {
    res.status(403).json({ error: "Cross-site imports are not allowed" });
    return;
  }
  if (req.headers.origin) {
    try {
      const origin = new URL(req.headers.origin);
      const forwardedHost = req.get("x-forwarded-host")?.split(",")[0].trim();
      if (origin.host !== (forwardedHost || req.get("host"))) {
        res.status(403).json({ error: "Import requests must come from this site's admin page" });
        return;
      }
    } catch {
      res.status(403).json({ error: "Invalid request origin" });
      return;
    }
  }
  next();
});

router.post("/preview", async (req, res) => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const body = PreviewDirectoryImportBody.parse(req.body);
    const input = parseImportInput(body);
    const candidates = loadImportCandidates(input);
    const existing = await database.select().from(venuesTable);
    const plan = buildImportPlan(candidates, existing);
    const expires = Date.now() + 15 * 60 * 1000;
    const previewToken = signImportApproval({
      owner: req.user.id, sourceHash: digest(candidates),
      databaseHash: directoryDigest(existing), target: getTarget(), expires,
    });
    res.setHeader("Cache-Control", "no-store");
    res.json({ previewToken, expiresAt: new Date(expires).toISOString(), target: getTarget(),
      summary: plan.summary, rows: plan.rows });
  } catch (error) {
    req.log.warn("Directory import preview failed");
    res.status(400).json({ error: error instanceof Error ? error.message : "Could not preview this import" });
  }
});

router.post("/confirm", async (req, res) => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  let committed = false;
  try {
    const input = parseImportInput(PreviewDirectoryImportBody.parse(req.body));
    if (!input.previewToken) {
      res.status(400).json({ error: "Preview and explicitly confirm the import before saving" });
      return;
    }
    const approval = verifyImportApproval(input.previewToken, req.user.id);
    const candidates = loadImportCandidates(input);
    if (approval.target !== getTarget() || approval.sourceHash !== digest(candidates)) {
      res.status(409).json({ error: "Import source changed; preview again before saving" });
      return;
    }
    const summary = await database.transaction(async (tx) => {
      // A short lock prevents changes between snapshot verification and writes.
      // It affects only restaurant data and never creates/alters database objects.
      await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
      await tx.execute(sql`LOCK TABLE venues IN SHARE ROW EXCLUSIVE MODE`);
      const existing = await tx.select().from(venuesTable);
      if (approval.databaseHash !== directoryDigest(existing)) {
        throw new Error("The directory changed since your preview; preview again");
      }
      const plan = buildImportPlan(candidates, existing);
      if (plan.summary.blocked) throw new Error("Resolve all duplicate or invalid rows before importing");
      if (plan.additions.length) {
        for (let i = 0; i < plan.additions.length; i += 50) {
          await tx.insert(venuesTable).values(plan.additions.slice(i, i + 50));
        }
      }
      for (const update of plan.updates) {
        await tx.update(venuesTable).set(update.values).where(eq(venuesTable.id, update.id));
      }
      return plan.summary;
    });
    committed = true;
    req.log.info({ summary, target: getTarget(), adminId: req.user.id }, "Restaurant import completed");
    res.setHeader("Cache-Control", "no-store");
    res.json({ target: getTarget(), summary });
  } catch (error) {
    // The transaction rolls back every restaurant write on ANY failure.
    req.log.warn({ committed }, "Restaurant import confirmation failed");
    res.status(409).json({ error: error instanceof Error ? error.message : "Import failed; nothing was saved" });
  }
});

return router;
}
export default createDirectoryImportRouter();
