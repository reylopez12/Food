const { mkdtempSync, writeFileSync, readdirSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');

// Exercise the real Orval configuration without rewriting checked-in clients.
const specDir = path.resolve('lib/api-spec');
const specRequire = createRequire(path.join(specDir, 'package.json'));
const orvalRequire = createRequire(specRequire.resolve('orval'));
const temp = mkdtempSync(path.join(tmpdir(), 'orval-security-'));
try {
  const config = path.join(temp, 'config.cjs');
  writeFileSync(config, `
    const { createJiti } = require(${JSON.stringify(orvalRequire.resolve('jiti'))});
    const jiti = createJiti(__filename);
    const imported = jiti(${JSON.stringify(path.join(specDir, 'orval.config.ts'))});
    const projects = imported.default || imported;
    for (const [name, project] of Object.entries(projects)) {
      project.input.target = ${JSON.stringify(path.join(specDir, 'openapi.yaml'))};
      project.output.workspace = require('node:path').join(${JSON.stringify(temp)}, name);
    }
    module.exports = projects;
  `);
  const result = spawnSync('pnpm', ['exec', 'orval', '--config', config], {
    cwd: specDir, stdio: 'inherit',
  });
  if (result.error || result.status !== 0) throw result.error || new Error('Orval smoke generation failed');
  for (const project of ['api-client-react', 'zod']) {
    if (!readdirSync(path.join(temp, project, 'generated')).length) {
      throw new Error(`No generated output for ${project}`);
    }
  }
  console.log('Both real Orval projects generated successfully into temporary directories.');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
