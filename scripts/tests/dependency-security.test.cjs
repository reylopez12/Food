const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const { test } = require('node:test');

// Follow real consumer dependency edges; never test a stale pnpm-store copy.
const mobileRequire = createRequire(path.resolve('artifacts/mobile/package.json'));
const cliRequire = createRequire(mobileRequire.resolve('@expo/cli'));
const forge = cliRequire('node-forge');
const metroRequire = createRequire(cliRequire.resolve('metro'));
const fileMapRequire = createRequire(metroRequire.resolve('metro-file-map'));
const micromatchRequire = createRequire(fileMapRequire.resolve('micromatch'));
const braces = micromatchRequire('braces');
const reactNativeRequire = createRequire(mobileRequire.resolve('react-native'));
const babelJestRequire = createRequire(reactNativeRequire.resolve('babel-jest'));
const istanbulRequire = createRequire(babelJestRequire.resolve('babel-plugin-istanbul'));
const nycRequire = createRequire(istanbulRequire.resolve('@istanbuljs/load-nyc-config'));
const yamlRequire = createRequire(nycRequire.resolve('js-yaml'));
const argparseRequire = createRequire(yamlRequire.resolve('argparse'));
const { sprintf, vsprintf } = argparseRequire('sprintf-js');

test('all three security patches are registered, hash-verified, and used by consumers', () => {
  const root = path.resolve(__dirname, '../..');
  const { load } = cliRequire('js-yaml');
  const workspace = load(fs.readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8'));
  const lock = load(fs.readFileSync(path.join(root, 'pnpm-lock.yaml'), 'utf8'));
  const certificatesRequire = createRequire(cliRequire.resolve('@expo/code-signing-certificates'));
  const mockupRequire = createRequire(path.join(root, 'artifacts/mockup-sandbox/package.json'));
  const globRequire = createRequire(mockupRequire.resolve('fast-glob'));
  const globMicromatchRequire = createRequire(globRequire.resolve('micromatch'));
  const transformRequire = createRequire(babelJestRequire.resolve('@jest/transform'));
  const jestMicromatchRequire = createRequire(transformRequire.resolve('micromatch'));
  for (const [name, version, consumers] of [
    ['node-forge', '1.4.0', [cliRequire, certificatesRequire]],
    ['braces', '3.0.3', [micromatchRequire, globMicromatchRequire, jestMicromatchRequire]],
    ['sprintf-js', '1.0.3', [argparseRequire]],
  ]) {
    const key = `${name}@${version}`;
    const patchPath = `patches/${key}.patch`;
    assert.equal(workspace.patchedDependencies[key], patchPath, `${key} must be patched on install`);
    assert.equal(lock.patchedDependencies[key].path, patchPath);
    const hash = createHash('sha256').update(fs.readFileSync(path.join(root, patchPath))).digest('hex');
    assert.equal(lock.patchedDependencies[key].hash, hash, `${key} patch hash must match the lockfile`);
    const snapshot = `${key}(patch_hash=${hash})`;
    assert.ok(Object.hasOwn(lock.snapshots, snapshot), `${key} must have a patched snapshot`);
    assert.equal(Object.hasOwn(lock.snapshots, key), false, `${key} must not have an unpatched snapshot`);
    for (const consumer of consumers) {
      assert.equal(consumer(`${name}/package.json`).version, version);
      assert.ok(fs.realpathSync(consumer.resolve(name)).includes(`${key}_patch_hash=${hash}`),
        `${key} consumer must resolve the hash-verified patched module`);
    }
  }
});

test('RSA verification rejects surplus nested DigestAlgorithm elements', () => {
  const keys = forge.pki.rsa.generateKeyPair({ bits: 1024, e: 3 });
  const digest = forge.md.sha256.create().update('security regression');
  const hash = digest.digest().getBytes();
  const asn1 = forge.asn1;
  const node = (type, constructed, value) =>
    asn1.create(asn1.Class.UNIVERSAL, type, constructed, value);
  const oid = node(asn1.Type.OID, false, asn1.oidToDer(forge.oids.sha256).getBytes());
  const nullNode = node(asn1.Type.NULL, false, '');
  const signature = elements => keys.privateKey.sign(
    asn1.toDer(node(asn1.Type.SEQUENCE, true, [
      node(asn1.Type.SEQUENCE, true, elements),
      node(asn1.Type.OCTETSTRING, false, hash),
    ])).getBytes(), 'NONE');
  assert.equal(keys.publicKey.verify(hash, keys.privateKey.sign(digest)), true);
  assert.equal(keys.publicKey.verify(hash, signature([oid])), true);
  assert.equal(keys.publicKey.verify(hash, signature([oid, nullNode])), true);
  for (const elements of [
    [oid, nullNode, node(asn1.Type.OCTETSTRING, false, 'garbage')],
    [oid, nullNode, nullNode],
    [oid, node(asn1.Type.SEQUENCE, true, [nullNode])],
    [oid, node(asn1.Type.NULL, false, 'garbage')],
    [oid, node(asn1.Type.OCTETSTRING, false, 'garbage')],
  ]) {
    assert.throws(() => keys.publicKey.verify(hash, signature(elements)), /DigestInfo/);
  }
});

test('brace patterns keep ordinary compilation and expansion', () => {
  assert.deepEqual(braces.expand('x/{a,b}/{1..3}'),
    ['x/a/1', 'x/a/2', 'x/a/3', 'x/b/1', 'x/b/2', 'x/b/3']);
  assert.equal(braces.compile('{a,b}'), '(a|b)');
  assert.equal(braces.stringify(braces.parse('x/{a,b}')), 'x/{a,b}');
});

test('all brace walkers reject deeply nested input and cyclic caller-built ASTs', () => {
  const pattern = '{'.repeat(5000) + 'a,b' + '}'.repeat(5000);
  let ast = { type: 'text', value: 'a' };
  for (let i = 0; i < 5000; i++) ast = { type: 'root', nodes: [ast] };
  const cyclic = { type: 'root', nodes: [] };
  cyclic.nodes.push(cyclic);
  for (const method of ['compile', 'expand', 'stringify']) {
    for (const input of [pattern, ast, cyclic]) {
      assert.throws(() => braces[method](input), { name: 'SyntaxError' });
    }
  }
  assert.throws(() => braces.parse(pattern), { name: 'SyntaxError' });
  assert.throws(() => braces(pattern), { name: 'SyntaxError' });
});

test('sprintf validates precision before native numeric formatters run', () => {
  assert.equal(sprintf('%.2f', 1.234), '1.23');
  assert.equal(vsprintf('%s %d', ['value', 42]), 'value 42');
  for (const format of ['%.101f', '%.101e', '%.101g', '%.0g', '%.9999999999999999999999f']) {
    assert.throws(() => sprintf(format, 1.25), { name: 'SyntaxError' });
    assert.throws(() => vsprintf(format, [1.25]), { name: 'SyntaxError' });
  }
  for (const format of ['%.0f', '%.0e', '%.1g', '%.100f', '%.100e', '%.100g']) {
    assert.equal(typeof sprintf(format, 1.25), 'string');
  }
});

test('malicious sprintf precision never reaches native numeric formatters', () => {
  for (const [specifier, method] of [
    ['f', 'toFixed'], ['e', 'toExponential'], ['g', 'toPrecision'],
  ]) {
    const original = Number.prototype[method];
    let calls = 0;
    Number.prototype[method] = function (...args) {
      calls++;
      return original.apply(this, args);
    };
    try {
      for (const precision of ['101', '999999999999999999999999999999999999']) {
        const format = `%.${precision}${specifier}`;
        assert.throws(() => sprintf(format, 1.25), { name: 'SyntaxError' });
        assert.throws(() => vsprintf(format, [1.25]), { name: 'SyntaxError' });
      }
      if (specifier === 'g') {
        assert.throws(() => sprintf('%.0g', 1.25), { name: 'SyntaxError' });
      }
      assert.equal(calls, 0, `invalid precision must not invoke ${method}`);
      assert.equal(typeof sprintf(`%.2${specifier}`, 1.25), 'string');
      assert.equal(calls, 1, `valid precision must still invoke ${method}`);
    } finally {
      Number.prototype[method] = original;
    }
  }
});

test('upgraded uuid and URI decoder retain their consumers APIs', () => {
  const xcodeRequire = createRequire(cliRequire.resolve('xcode'));
  const ngrokRequire = createRequire(mobileRequire.resolve('@expo/ngrok'));
  for (const consumer of [xcodeRequire, ngrokRequire]) {
    assert.match(consumer('uuid').v4(), /^[0-9a-f-]{36}$/);
  }
  const routerRequire = createRequire(mobileRequire.resolve('expo-router'));
  const query = createRequire(routerRequire.resolve('query-string'))('query-string');
  assert.equal(query.parse('name=Eat%20Local').name, 'Eat Local');
  assert.equal(query.parse('name=%E0%A4%A').name, '%E0%A4%A');
});

test('Expo watchers accept both Metro event formats and unsubscribe', () => {
  const cliRoot = path.dirname(cliRequire.resolve('@expo/cli/package.json'));
  const metroDir = path.join(cliRoot, 'build/src/start/server/metro');
  const { getEventsQueue } = require(path.join(metroDir, 'metroFileMapEvents.js'));
  const oldEvents = [{ type: 'add', filePath: '/app/new.ts' }];
  assert.equal(getEventsQueue({ eventsQueue: oldEvents }), oldEvents);
  const change = {
    rootDir: '/app',
    changes: {
      addedFiles: new Map([['new.ts', []]]),
      modifiedFiles: new Map([['existing.tsx', []]]),
      removedFiles: new Map([['deleted.ts', []]]),
    },
  };
  assert.deepEqual(getEventsQueue(change), [
    { type: 'add', filePath: '/app/new.ts' },
    { type: 'change', filePath: '/app/existing.tsx' },
    { type: 'delete', filePath: '/app/deleted.ts' },
  ]);
  const watcher = new EventEmitter();
  const server = new EventEmitter();
  const metro = { getBundler: () => ({ getBundler: () => ({ getWatcher: () => watcher }) }) };
  const { metroWatchTypeScriptFiles } = require(path.join(metroDir, 'metroWatchTypeScriptFiles.js'));
  const { observeAnyFileChanges, observeFileChanges, waitForMetroToObserveTypeScriptFile } =
    require(path.join(metroDir, 'waitForMetroToObserveTypeScriptFile.js'));
  const received = [];
  const off = metroWatchTypeScriptFiles({
    metro, server, projectRoot: '/app', callback: e => received.push(e),
  });
  watcher.emit('change', change);
  assert.deepEqual(received, getEventsQueue(change));
  off();
  assert.equal(watcher.listenerCount('change'), 0);
  const runner = { metro, server };
  const calls = [];
  const stopWait = waitForMetroToObserveTypeScriptFile('/app', runner, () => calls.push('typescript'));
  const stopFiles = observeFileChanges(runner, ['/app/existing.tsx'], () => calls.push('file'));
  const stopAny = observeAnyFileChanges(runner, events => calls.push(events.length));
  watcher.emit('change', change);
  assert.deepEqual(calls, ['typescript', 'file', 3]);
  stopWait(); stopFiles(); stopAny();
  assert.equal(watcher.listenerCount('change'), 0);
});
