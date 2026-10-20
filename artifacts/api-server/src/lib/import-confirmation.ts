import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const localKey = randomBytes(32).toString("hex");
function key() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is required for secure import confirmation");
  return localKey;
}
export interface ImportApproval {
  owner: string;
  sourceHash: string;
  databaseHash: string;
  target: "live" | "development";
  expires: number;
}
export function signImportApproval(approval: ImportApproval) {
  const payload = Buffer.from(JSON.stringify(approval)).toString("base64url");
  return `${payload}.${createHmac("sha256", key()).update(payload).digest("base64url")}`;
}
export function verifyImportApproval(token: string, owner: string): ImportApproval {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) throw new Error("Invalid confirmation; preview again");
  const expected = createHmac("sha256", key()).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error("Invalid confirmation; preview again");
  }
  const approval = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ImportApproval;
  if (approval.owner !== owner || !Number.isFinite(approval.expires) || approval.expires < Date.now()) {
    throw new Error("This preview expired or belongs to another administrator; preview again");
  }
  return approval;
}
