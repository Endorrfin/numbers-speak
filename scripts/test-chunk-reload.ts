// test-chunk-reload.ts — recovery from a stale deploy: one reload, then hand over to the error boundary.
// CHANGED (S3-bdd2): new. Run: npm test.
import assert from 'node:assert/strict';
import { RELOAD_KEY, RELOAD_WINDOW_MS, installChunkReload, shouldReload } from '../src/lib/chunkReload';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`✖ chunk-reload: ${name}\n`, e);
    process.exit(1);
  }
}

type Handler = (event: { preventDefault: () => void }) => void;
function harness(stored: string | null, now = 1_000_000, throwOn: 'none' | 'get' | 'set' = 'none') {
  const state = { value: stored, reloads: 0, prevented: 0, events: [] as string[] };
  const store = {
    getItem: (k: string): string | null => {
      if (throwOn === 'get') throw new Error('blocked');
      assert.equal(k, RELOAD_KEY);
      return state.value;
    },
    setItem: (k: string, v: string): void => {
      if (throwOn === 'set') throw new Error('blocked');
      assert.equal(k, RELOAD_KEY);
      state.value = v;
    },
  };
  let handler: Handler = () => {};
  const target = {
    addEventListener: (type: string, fn: EventListenerOrEventListenerObject): void => {
      state.events.push(type);
      handler = fn as unknown as Handler;
    },
  };
  installChunkReload(target as unknown as Window, store, () => state.reloads++, () => now);
  const fire = (): void => handler({ preventDefault: () => state.prevented++ });
  return { state, fire };
}

test('shouldReload: first failure yes, a second one inside the window no', () => {
  assert.equal(shouldReload(null, 1000), true);
  assert.equal(shouldReload('', 1000), true);
  assert.equal(shouldReload('not-a-number', 1000), true);
  assert.equal(shouldReload(String(1000), 1000 + RELOAD_WINDOW_MS - 1), false);
  assert.equal(shouldReload(String(1000), 1000 + RELOAD_WINDOW_MS + 1), true);
});

test('listens for vite:preloadError and reloads once, marking the attempt', () => {
  const { state, fire } = harness(null);
  assert.deepEqual(state.events, ['vite:preloadError']);
  fire();
  assert.equal(state.reloads, 1);
  assert.equal(state.prevented, 1);
  assert.equal(state.value, '1000000');
  fire(); // same window: the boundary shows its message instead of a reload loop
  assert.equal(state.reloads, 1);
});

test('a failure long after the last attempt reloads again', () => {
  const { state, fire } = harness(String(1_000_000 - RELOAD_WINDOW_MS - 1));
  fire();
  assert.equal(state.reloads, 1);
});

test('blocked storage never reloads (no loop in private mode)', () => {
  for (const throwOn of ['get', 'set'] as const) {
    const { state, fire } = harness(null, 1_000_000, throwOn);
    fire();
    assert.equal(state.reloads, 0, throwOn);
    assert.equal(state.prevented, 0, throwOn);
  }
});

console.log(`✓ chunk-reload — ${passed} tests passed.`);
