# Dependency security maintenance

The dependency refresh replaces the vulnerable Orval release and upgrades the
affected runtime/build dependencies. The Expo SDK remains on 54, with its
compatible CLI patch release. The one-day minimum package release age is retained.

## Local fixes awaiting upstream releases

The latest releases of these three packages still have advisories. pnpm applies
committed, hash-verified patches on installation; package versions are **not**
renamed, and audit findings are **not** hidden:

| Advisory | Package | Local fix |
| --- | --- | --- |
| GHSA-86w9-cpqp-85rv | node-forge 1.4.0 | RSA PKCS#1 v1.5 verification rejects extra nested DigestAlgorithm elements and nonempty NULL parameters. |
| GHSA-vfj7-8cjw-p6xm | braces 3.0.3 | The parser bounds nesting; all recursive AST walkers first check depth and cycles iteratively, including caller-created ASTs. Inputs beyond 100 levels throw SyntaxError. |
| GHSA-hp3w-g68c-fv3c | sprintf-js 1.0.3 | Floating-point precision is checked against ECMAScript's limits before native formatting; invalid precision throws SyntaxError instead of a native RangeError. |

Invalid patterns and format strings must still be treated as errors by callers.
These fixes do not make arbitrary user-supplied patterns or formats safe in all
contexts, nor do they provide general CPU/memory limits.

Version-only scanners (`pnpm audit` and the workspace dependency scanner) still
report **two high and one moderate** finding because they cannot inspect local
patches. They should remain visible until upstream fixes ship. Do not describe
this as a zero-finding audit.

## Compatibility adjustments

- Metro 0.83.8 removes the vulnerable image-size parser. Its change-event format
  differs from the earlier 0.83 patch; the Expo CLI patch adapts all three watcher
  entry points and TypeScript watching to both formats.
- decode-uri-component 0.5 is ESM; query-string's patch accepts its default export
  while retaining the previous callable CommonJS API.
- uuid 11.1.1 retains the `v4()` API used by xcode and ngrok and supports CommonJS.
- A single React 19.1 type line avoids inconsistent peer resolutions between
  mobile and browser packages. Runtime React remains unchanged.

## Checks

```sh
pnpm install --frozen-lockfile
pnpm run typecheck
node scripts/tests/audit-dependencies.cjs
node scripts/tests/codegen-security-smoke.cjs
pnpm --filter @workspace/mobile exec expo install --check
```

The audit check fails on any advisory other than the three explicitly patched
package/version pairs, prints the residual findings, and runs exploit-regression
tests against the actual dependencies resolved by their consumers. These tests
also require all three patches to remain registered in the workspace, match the
lockfile's SHA-256 hashes, have no unpatched lockfile snapshots, and resolve to
the hash-verified installed modules (including Expo's certificate-signing consumer).
It also tests
ordinary brace expansion/compilation, floating-point formatting, RSA signatures,
URI decoding, uuid generation, and Expo watcher subscription/unsubscription.

When an upstream fix is published, upgrade the dependency, remove its matching
patch and audit exception, and keep the regression tests. After modifying a patch,
run `pnpm patch-commit` and commit both the patch and pnpm lockfile.
