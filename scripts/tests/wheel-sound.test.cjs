const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function load(path, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, ...globals });
  return module.exports;
}

const { WheelSound, WHEEL_SOUND_KEY, readWheelSoundPreference } =
  load("artifacts/web/src/lib/wheelSound.ts");

function audioHarness() {
  const tones = [];
  const gains = [];
  let opened = 0;
  let failures = 0;
  const context = {
    currentTime: 0, state: "running", destination: {},
    createGain() {
      const values = [];
      gains.push(values);
      return {
        gain: {
          setValueAtTime(value) { values.push(value); },
          exponentialRampToValueAtTime(value) { values.push(value); },
        },
        connect() {}, disconnect() {},
      };
    },
    createOscillator() {
      const tone = {
        frequency: { setValueAtTime(value) { tone.pitch = value; } },
        connect() {}, disconnect() {},
        start(time) { tone.startTime = time; },
        stop(time) { tone.stopTime = time; },
      };
      tones.push(tone);
      return tone;
    },
    resume() { this.state = "running"; return Promise.resolve(); },
    close() { this.state = "closed"; return Promise.resolve(); },
  };
  const player = new WheelSound(() => { opened++; return context; }, () => { failures++; });
  return { player, context, tones, gains, opened: () => opened, failures: () => failures };
}

test("sound defaults on, preserves off, and tolerates blocked browser storage", () => {
  assert.equal(readWheelSoundPreference({ getItem: () => null }), true);
  assert.equal(readWheelSoundPreference({ getItem: () => "on" }), true);
  assert.equal(readWheelSoundPreference({ getItem: () => "off" }), false);
  assert.equal(readWheelSoundPreference({ getItem() { throw Error("blocked"); } }), true);
});

test("audio opens on spin, ticks at segment boundaries with a rate limit, and chimes at completion", () => {
  const h = audioHarness();
  assert.equal(h.opened(), 0);
  h.player.start(0, 6);
  assert.equal(h.opened(), 1);
  h.player.tick(0.5);
  assert.equal(h.tones.length, 0);
  h.player.tick(1.1);
  assert.equal(h.tones.length, 1);
  h.context.currentTime = 0.01;
  h.player.tick(2.2);
  assert.equal(h.tones.length, 1);
  h.context.currentTime = 0.1;
  h.player.tick(3.3);
  assert.equal(h.tones.length, 2);
  h.player.finish();
  assert.deepEqual(h.tones.slice(-3).map(tone => tone.pitch), [523.25, 659.25, 783.99]);
  assert.equal(h.failures(), 0);
});

test("muting silences active audio immediately and prevents ticks/chimes; re-enabling works", () => {
  const h = audioHarness();
  h.player.start(0, 6);
  h.player.tick(1.1);
  h.player.setEnabled(false);
  assert.equal(h.gains[0].at(-1), 0);
  h.context.currentTime = 0.1;
  h.player.tick(2.2);
  h.player.finish();
  assert.equal(h.tones.length, 1);
  h.player.setEnabled(true);
  assert.equal(h.gains[0].at(-1), 1);
  h.player.tick(3.3);
  assert.equal(h.tones.length, 2);
  h.player.dispose();
  assert.equal(h.context.state, "closed");
});

test("saved-off spins never open audio; unavailable audio does not interrupt spinning", () => {
  const h = audioHarness();
  h.player.setEnabled(false);
  h.player.start(0, 6);
  h.player.tick(3);
  h.player.finish();
  assert.equal(h.opened(), 0);
  let unavailable = false;
  const broken = new WheelSound(() => { throw Error("unsupported"); }, () => { unavailable = true; });
  assert.doesNotThrow(() => { broken.start(0, 6); broken.tick(3); broken.finish(); broken.dispose(); });
  assert.equal(unavailable, true);
});

test("toggle persists across page loads and shares its setting between wheel instances", () => {
  const storage = new Map();
  const listeners = new Map();
  const window = {
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    addEventListener: (name, fn) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(fn);
    },
    removeEventListener: (name, fn) => listeners.get(name)?.delete(fn),
    dispatchEvent: event => listeners.get(event.type)?.forEach(fn => fn()),
  };
  function mount() {
    let cursor = 0;
    const slots = [];
    const cleanups = [];
    const react = {
      useState(initial) {
        const i = cursor++;
        if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
        return [slots[i], value => { slots[i] = value; }];
      },
      useRef(initial) {
        const i = cursor++;
        if (!(i in slots)) slots[i] = { current: initial };
        return slots[i];
      },
      useCallback: fn => fn,
      useEffect(fn) {
        const i = cursor++;
        if (!(i in slots)) { slots[i] = true; cleanups.push(fn()); }
      },
    };
    const { useWheelSound } = load("artifacts/web/src/hooks/useWheelSound.ts", {
      window, Event: class { constructor(type) { this.type = type; } },
      require: name => name === "react" ? react : { WheelSound, WHEEL_SOUND_KEY, readWheelSoundPreference },
    });
    return {
      render() { cursor = 0; return useWheelSound(); },
      unmount() { cleanups.forEach(fn => fn?.()); },
    };
  }
  const home = mount();
  const page = mount();
  assert.equal(home.render().enabled, true);
  assert.equal(page.render().enabled, true);
  home.render().toggle();
  assert.equal(storage.get(WHEEL_SOUND_KEY), "off");
  assert.equal(page.render().enabled, false);
  home.unmount();
  const reloaded = mount();
  assert.equal(reloaded.render().enabled, false);
  page.unmount();
  reloaded.unmount();
});
