# Dependency security maintenance

The dependency refresh replaces the vulnerable Orval release and upgrades the
affected runtime/build dependencies. The mobile app is on Expo SDK 57 (React
Native 0.86, Metro 0.84). The one-day minimum package release age is retained.

## Local fixes awaiting upstream releases

The latest releases of these two packages still have advisories. pnpm applies
committed, hash-verified patches on installation; package versions are **not**
renamed, and audit findings are **not** hidden:

| Advisory | Package | Local fix |
| --- | --- | --- |
| GHSA-86w9-cpqp-85rv | node-forge 1.4.0 | RSA PKCS#1 v1.5 verification rejects extra nested DigestAlgorithm elements and nonempty NULL parameters. |
| GHSA-vfj7-8cjw-p6xm | braces 3.0.3 | The parser bounds nesting; all recursive AST walkers first check depth and cycles iteratively, including caller-created ASTs. Inputs beyond 100 levels throw SyntaxError. |

sprintf-js (GHSA-hp3w-g68c-fv3c) previously needed a local patch too. Expo SDK 57
no longer depends on it, so the package, its patch, and the finding are gone.

### Upstream status checked October 20, 2026

The npm registry and GitHub advisories still offer no fixed release for these
findings:

- [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv):
  latest release 1.4.0; affected versions `<=1.4.0`.
- [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm):
  latest release 3.0.3; affected versions `<=3.0.3`.

Retain the existing patches rather than performing an ineffective version
upgrade. Recheck each advisory's fixed-version field before replacing a patch.

Invalid patterns and format strings must still be treated as errors by callers.
These fixes do not make arbitrary user-supplied patterns or formats safe in all
contexts, nor do they provide general CPU/memory limits.

Version-only scanners (`pnpm audit` and the workspace dependency scanner) still
report **two high** findings because they cannot inspect local
patches. They should remain visible until upstream fixes ship. Do not describe
this as a zero-finding audit.

## Compatibility adjustments

- Metro 0.84 (Expo SDK 57) no longer depends on the vulnerable image-size parser,
  so the SDK 54-era Expo CLI watcher patch was removed. The `metro@0.83` override
  only applies if an 0.83 release returns to the tree.
- decode-uri-component 0.5 is ESM; query-string's patch accepts its default export
  while retaining the previous callable CommonJS API.
- uuid 11.1.1 retains the `v4()` API used by xcode and ngrok and supports CommonJS.
- A single React 19.2 type line avoids inconsistent peer resolutions between
  mobile and browser packages.

## Checks

```sh
pnpm install --frozen-lockfile
pnpm run typecheck
node scripts/tests/audit-dependencies.cjs
node scripts/tests/codegen-security-smoke.cjs
pnpm --filter @workspace/mobile exec expo install --check
```

The audit check fails on any advisory other than the two explicitly patched
package/version pairs, prints the residual findings, and runs exploit-regression
tests against the actual dependencies resolved by their consumers. These tests
also require both patches to remain registered in the workspace, match the
lockfile's SHA-256 hashes, have no unpatched lockfile snapshots, and resolve to
the hash-verified installed modules (including Expo's certificate-signing consumer).
It also tests
ordinary brace expansion/compilation, floating-point formatting, RSA signatures,
URI decoding, uuid generation, and Expo watcher subscription/unsubscription.

When an upstream fix is published, upgrade the dependency, remove its matching
patch and audit exception, and keep the regression tests. After modifying a patch,
run `pnpm patch-commit` and commit both the patch and pnpm lockfile.
