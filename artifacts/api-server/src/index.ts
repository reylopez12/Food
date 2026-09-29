import { ensureDatabase, isEmbeddedDatabase } from "@workspace/db";
import app from "./app";
import { isLocalDevAuth } from "./lib/access";
import { logger } from "./lib/logger";

// Replit always provides PORT; default for running on your own machine.
const rawPort = process.env["PORT"] ?? "5000";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await ensureDatabase();
if (isEmbeddedDatabase) {
  logger.info("Using embedded local database (.local/pglite). Set DATABASE_URL to use Postgres.");
}
if (isLocalDevAuth) {
  logger.info("Local demo login enabled: 'Log in' signs you in as an admin demo user.");
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
