---
name: Dependency security patches
description: Handling unpublished dependency fixes and compatibility bridges without hiding security findings
---

Code generation must target the app's runtime Zod version, not the generator's
transitive dependency version.

**Why:** After the Orval security upgrade, automatic detection emitted Zod 4
helpers although the application still consumed Zod 3; fresh generation then
failed type checks even though the previously checked-in client compiled.

**How to apply:** Configure the generator's intended consumer version explicitly
until an intentional runtime migration. Validate freshly generated output
against the actual consumer types instead of hand-editing generated files.

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

After a merged dependency refresh, an ordinary frozen-lockfile install can
report “Already up to date” while installed patch contents remain stale. Verify
the actual consumer-resolved modules rather than trusting that message.

**Why:** A merged security patch initially failed its exploit regression in this
workspace; a forced frozen-lockfile reinstall restored the patched dependency.
React type errors also persisted in an incremental cache after the dependency
graph was corrected.

**How to apply:** If consumer regression tests contradict the committed patches,
try a forced frozen-lockfile reinstall without changing package versions. Stop
Metro before reinstalling to avoid watcher crashes on temporary package folders.
If a clean TypeScript check passes but an incremental check fails, force-refresh
the affected build cache rather than changing application types.
