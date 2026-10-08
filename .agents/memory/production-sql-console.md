---
name: Production SQL Console compatibility
description: Replit's user-facing SQL Console has editing and transaction controls distinct from PostgreSQL command-line execution.
---

Production import handoffs must match the execution surface, not just valid
PostgreSQL syntax. The user-facing SQL Console starts read-only and requires
Edit mode for writes. Prefer one atomic SQL statement for this console rather
than requiring the user to manage a transaction or select a statement batch.

**Why:** A directory import passed isolated PostgreSQL tests but the user's
console rejected transaction management, including the batch-dependent setup
after explicit BEGIN/COMMIT were removed. Database-level validity alone did not
establish console compatibility.

**How to apply:** Provide console-specific instructions and a single-statement
handoff when possible; prove its atomic rollback behavior in isolated tests. If
dropping standalone lock setup, disclose that directory imports/edits must not
run concurrently; retain stronger locked transactions for command-line use.
Do not confuse the user's writable Edit mode with the agent's production SQL
callback, which remains read-only. Confirm actual production records separately
before declaring an import complete.
