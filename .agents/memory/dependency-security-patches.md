---
name: Dependency security patches
description: Handling unpublished dependency fixes and compatibility bridges without hiding security findings
---

When the latest upstream package is still vulnerable, retain honest package
versions and use committed pnpm patches with exploit regressions. Version-only
scanners cannot recognize source patches; keep those residual alerts visible
and report them separately from removed findings.

**Why:** Several tooling dependencies had advisories without published fixes.
Renaming their versions or suppressing scanner output would falsely imply that
the audit was clean.

**How to apply:** Replace local patches with upstream releases when available;
retain the regression cases and remove only the corresponding documented audit
exception. Test the actual consumer-resolved dependency, not stale pnpm-store
copies.

Security patch upgrades within a Metro minor line can change watcher event
contracts. Expo's compatibility check does not detect that mismatch, so test
watcher events and native production bundles as well.

**Why:** A Metro security patch removed a vulnerable image parser but changed
file-change events in a way the SDK's CLI did not understand.

**How to apply:** Preserve both old and new event formats when compatibility
bridges are necessary; cover all watcher entry points.

`pnpm patch-commit` rewrites the workspace YAML and drops comments.

**Why:** The package manager normalizes the file when registering patches.

**How to apply:** Finish patch commits before restoring explanatory comments,
especially the minimum-release-age supply-chain warning.
