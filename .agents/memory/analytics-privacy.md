---
name: Analytics privacy
description: Privacy boundaries when extending Spotted Eats custom event tracking
---

Track curated actions, public listing identifiers and aggregate counts—not
emails, search terms, precise locations, custom wheel entries, uploaded CSV
contents or import approval tokens.

**Why:** Searches, custom wheel choices and administrator uploads can contain
private information. Analytics should measure usage, not become an additional
store of that content.

**How to apply:** Select metadata fields explicitly when adding events; never
spread whole forms, files, requests or responses into event properties. Record
successful submissions/imports only after the server confirms them, and ensure
tracking failures cannot interrupt application actions.
