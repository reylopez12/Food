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

Distinguish SQL syntax errors from query-transport limits when checking large
embedded directory payloads.

**Why:** The SQL callback can fail with an OS process-argument limit (`E2BIG`)
before PostgreSQL receives a large query. That is not a database syntax error.

**How to apply:** Use the app's existing development database client for a
read-only EXPLAIN check when the callback transport cannot carry the query.
Never use that alternative to bypass production read-only access. If the
generated statement parses but the user's console still errors, obtain the
exact editor contents and error position before producing more variants.
