import { EventEmitter } from "events";

/**
 * In-process pub/sub for SSE notification delivery.
 * Emits on channel `user:<userId>` when a new announcement is fanned out.
 * The payload is always `{ type: "refresh" }` so clients just re-fetch
 * rather than trying to reconstruct state from partial data.
 */
export const notifEmitter = new EventEmitter();
// Allow many concurrent SSE connections without Node.js leakMemory warnings
notifEmitter.setMaxListeners(10_000);
