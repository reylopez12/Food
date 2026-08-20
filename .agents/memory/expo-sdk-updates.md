---
name: Expo SDK dependency updates
description: Safe dependency-refresh workflow for the Expo mobile artifact
---

When updating Expo SDK dependencies, change the mobile package manifest first, keep `expo` and `expo-constants` on the compatibility pair reported by Expo, then synchronize the workspace from the mobile importer and run Expo’s compatibility check before committing.

**Why:** The generic package-install helper targets the workspace root rather than the mobile importer, while a workspace synchronization can also introduce unrelated metadata changes that should not ship with an SDK update.

**How to apply:** Inspect `git status` after dependency synchronization, remove unrelated configuration changes through the repository’s validated config flow, and verify the mobile typecheck, static build, and Expo Web tab smoke test.