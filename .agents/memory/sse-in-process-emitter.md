---
name: SSE in-process emitter scope
description: The notification SSE uses a Node.js EventEmitter singleton — real-time push only works within a single API server process.
---

# SSE real-time notifications use an in-process emitter

**Rule:** The `notifEmitter` singleton in `artifacts/api-server/src/lib/notificationEmitter.ts` is a plain `EventEmitter`. It only propagates events within the same Node.js process.

**Why:** This is intentional for the current single-instance deployment. It keeps the implementation dependency-free (no Redis, no WebSocket broker). When the API server scales to multiple instances, events posted to one instance won't reach SSE clients connected to another.

**How to apply:**
- For single-instance Replit deployments: current approach is correct and complete.
- If horizontal scaling is ever needed: replace `notifEmitter` with a Redis pub/sub adapter (e.g. `ioredis` subscriber in the SSE route, publisher in the announcements route). The EventEmitter API surface stays the same — only the transport changes.
- The web `useNotifications` hook gracefully falls back to manual refresh if the EventSource connection drops, so a future migration is non-breaking for clients.
