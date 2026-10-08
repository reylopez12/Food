const { spawnSync } = require('node:child_process');
const fs = require('node:fs');

// These releases have no upstream fix. Keep the scanner findings visible;
// accept them only alongside the committed patches and passing exploit tests.
const localFixes = new Map([
  ['GHSA-86w9-cpqp-85rv', ['node-forge', '1.4.0', 'patches/node-forge@1.4.0.patch']],
  ['GHSA-vfj7-8cjw-p6xm', ['braces', '3.0.3', 'patches/braces@3.0.3.patch']],
  ['GHSA-hp3w-g68c-fv3c', ['sprintf-js', '1.0.3', 'patches/sprintf-js@1.0.3.patch']],
]);
const result = spawnSync('pnpm', ['audit', '--json'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
if (result.error || ![0, 1].includes(result.status)) {
  throw result.error || new Error(`Audit failed (${result.status}): ${result.stderr}`);
}
const audit = JSON.parse(result.stdout);
if (audit.error || !audit.metadata || !audit.advisories) {
  throw new Error(`Invalid audit response: ${result.stdout}`);
}
console.log('Version-based audit:', audit.metadata.vulnerabilities);
let unexpected = false;
for (const finding of Object.values(audit.advisories)) {
  const fix = localFixes.get(finding.github_advisory_id);
  if (!fix || finding.module_name !== fix[0] ||
      finding.findings.some(f => f.version !== fix[1]) || !fs.existsSync(fix[2])) {
    console.error('Unaddressed advisory:', finding.github_advisory_id, finding.module_name);
    unexpected = true;
  } else {
    console.log(`Still reported by version scanner; locally patched: ${finding.github_advisory_id} (${fix[2]})`);
  }
}
if (unexpected) process.exit(1);
const tests = spawnSync('pnpm', ['run', 'test:dependency-security'], { stdio: 'inherit' });
if (tests.error || tests.status !== 0) process.exit(1);
console.log('All scanner findings are either removed by upgrades or covered by tested local patches.');
