---
name: GitHub access
description: Native Git authentication may work without a listed GitHub integration
---

Do not infer that the private GitHub repository is inaccessible just because the integration connection list is empty. This workspace has successfully fetched it through normal, non-interactive Git authentication.

**Why:** GitHub integration discovery returned no connections, but a standard Git request still accessed the private repository. Treating the empty connector list as an access failure would unnecessarily block updates.

**How to apply:** Try credential-backed `git ls-remote` or `git fetch` against the normal repository URL before requesting a new connection. Never print credentials, inspect secret values, or embed them in remote URLs.
