---
name: Production SQL Console compatibility
description: Replit's user-facing SQL Console has editing and transaction controls distinct from PostgreSQL command-line execution.
---

Production import handoffs must match the execution surface, not just valid
PostgreSQL syntax. The user-facing SQL Console starts read-only, requires Edit
mode for writes, and manages the transaction around selected statement batches
itself rather than accepting explicit transaction commands.

**Why:** A directory import passed isolated PostgreSQL tests but the user's
console rejected it first for read-only mode and then for explicit transaction
management. Database-level validity alone did not establish console compatibility.

**How to apply:** Provide console-specific instructions and a compatible handoff.
Keep transaction-dependent setup and import statements selected together as one
batch, preserving atomicity. Do not confuse the user's writable Edit mode with
the agent's production SQL callback, which remains read-only. Confirm actual
production records separately before declaring an import complete.
