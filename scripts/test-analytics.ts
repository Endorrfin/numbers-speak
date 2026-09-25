// test-analytics.ts — GoatCounter page counts: route → path, every "do not count" rule, the request URL, the
// silent transport, the owner's opt-out, one view per navigation, and no request under SSR or jsdom.
// CHANGED (S3-an): new. Run: npm test.
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  NO_COUNT_KEY,
  applyOptOut,
  countUrl,
  createTracker,
  externalReferrer,
  hitFor,
  send,
  skipReason,
  storedOptOut,
  trackPageview,
} from '../src/lib/analytics';
import type { Probe, TrackerDeps } from '../src/lib/analytics';
import { CATALOG } from '../src/catalog';
import { parseHash } from '../src/lib/hashRouter';
import { COUNT_HOSTS, GOATCOUNTER_COUNT_URL } from '../src/lib/links';

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
  } catch (e) {
    console.error(`✖ analytics: ${name}\n`, e);
    process.exit(1);
  }
}

const PROD: Probe = {
  dev: false,
  protocol: 'https:',
  hostname: 'endorrfin.github.io',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
  webdriver: false,
  doNotTrack: null,
  gpc: undefined,
  optedOut: false,
};
const titles = new Map(CATALOG.map((m) => [m.id, m.title.en]));
const titleOf = (id: string): string | undefined => titles.get(id);
const first = CATALOG[0]!;

// ── Route → path ─────────────────────────────────────────────────────────────────────────────────
await test('hitFor: gallery, tabs, about', () => {
  assert.deepEqual(hitFor('/', titleOf), { p: '/#/', t: 'Gallery' });
  assert.deepEqual(hitFor('/t/ukraine', titleOf), { p: '/#/t/ukraine', t: 'Gallery · ukraine' });
  assert.deepEqual(hitFor('/t/new', titleOf), { p: '/#/t/new', t: 'Gallery · new' });
  assert.deepEqual(hitFor('/about', titleOf), { p: '/#/about', t: 'About' });
});

await test('hitFor: every catalog entry → /#/v/<id> with its English title', () => {
  for (const m of CATALOG) assert.deepEqual(hitFor(`/v/${m.id}`, titleOf), { p: `/#/v/${m.id}`, t: m.title.en });
});

await test('hitFor: unknown id, hidden draft, invalid id and unmatched routes → /#/404', () => {
  const notFound = { p: '/#/404', t: 'Not found' };
  for (const path of ['/v/no-such-entry', '/v/NOT_VALID', '/t/bogus', '/nope/deeper', '/about/x', '/v']) {
    assert.deepEqual(hitFor(path, titleOf), notFound, path);
  }
  // A draft is hidden in production: the browser wiring's titleOf returns undefined for it.
  assert.deepEqual(hitFor(`/v/${first.id}`, () => undefined), notFound);
});

await test('settings in the query are not pages: every settings variant has the same router path', () => {
  const paths = [`#/v/${first.id}`, `#/v/${first.id}?region=europe`, `#/v/${first.id}?page=2&view=table`, `#/v/${first.id}?show=ratio`];
  const set = new Set(paths.map((h) => parseHash(h).path));
  assert.equal(set.size, 1);
  assert.equal(hitFor([...set][0]!, titleOf).p, `/#/v/${first.id}`);
});

// ── Count or not ─────────────────────────────────────────────────────────────────────────────────
await test('skipReason: the production visit is counted', () => {
  assert.equal(skipReason(PROD), null);
  assert.deepEqual(COUNT_HOSTS, ['endorrfin.github.io']);
});

await test('skipReason: dev build, localhost, 127.0.0.1, LAN, forks, http and file are not counted', () => {
  assert.equal(skipReason({ ...PROD, dev: true }), 'dev');
  for (const hostname of ['localhost', '127.0.0.1', '[::1]', '192.168.1.20', '10.0.0.5', 'someone.github.io', 'endorrfin.github.io.evil.com', '']) {
    assert.equal(skipReason({ ...PROD, hostname }), 'host', hostname);
  }
  assert.equal(skipReason({ ...PROD, protocol: 'http:' }), 'host');
  assert.equal(skipReason({ ...PROD, protocol: 'file:', hostname: '' }), 'host');
});

await test('skipReason: automated browsers are not counted (webdriver, headless, jsdom)', () => {
  assert.equal(skipReason({ ...PROD, webdriver: true }), 'automation');
  assert.equal(skipReason({ ...PROD, userAgent: 'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/140.0 Safari/537.36' }), 'automation');
  assert.equal(skipReason({ ...PROD, userAgent: 'Mozilla/5.0 (linux) AppleWebKit/537.36 (KHTML, like Gecko) jsdom/30.1.0' }), 'automation');
});

await test('skipReason: Do Not Track and Global Privacy Control are respected; "0"/unset/false are counted', () => {
  assert.equal(skipReason({ ...PROD, doNotTrack: '1' }), 'dnt');
  assert.equal(skipReason({ ...PROD, doNotTrack: 'yes' }), 'dnt');
  assert.equal(skipReason({ ...PROD, gpc: true }), 'gpc');
  for (const doNotTrack of ['0', 'unspecified', null, undefined]) assert.equal(skipReason({ ...PROD, doNotTrack }), null);
  assert.equal(skipReason({ ...PROD, gpc: false }), null);
  assert.equal(skipReason({ ...PROD, optedOut: true }), 'opted-out');
});

// ── Request ──────────────────────────────────────────────────────────────────────────────────────
await test('externalReferrer: our own pages are dropped, other sites (incl. the portfolio) are kept', () => {
  const own = 'https://endorrfin.github.io/numbers-speak/';
  assert.equal(externalReferrer('', own), '');
  assert.equal(externalReferrer(own, own), '');
  assert.equal(externalReferrer(`${own}index.html`, own), '');
  assert.equal(externalReferrer('https://endorrfin.github.io/', own), 'https://endorrfin.github.io/');
  assert.equal(externalReferrer('https://www.google.com/', own), 'https://www.google.com/');
});

await test('countUrl: https endpoint, p/t/r/s/rnd only — never q; values round-trip', () => {
  const endpoint = new URL(GOATCOUNTER_COUNT_URL);
  assert.equal(endpoint.protocol, 'https:');
  assert.equal(endpoint.hostname, 'numbers-speak.goatcounter.com');
  assert.equal(endpoint.pathname, '/count');

  const u = new URL(countUrl({ p: '/#/t/new', t: 'Gallery · new' }, 'https://www.google.com/', 390, 'ab12c'));
  assert.equal(`${u.origin}${u.pathname}`, GOATCOUNTER_COUNT_URL);
  assert.deepEqual([...u.searchParams.keys()].sort(), ['p', 'r', 'rnd', 's', 't']);
  assert.equal(u.searchParams.get('p'), '/#/t/new');
  assert.equal(u.searchParams.get('t'), 'Gallery · new');
  assert.equal(u.searchParams.get('r'), 'https://www.google.com/');
  assert.equal(u.searchParams.get('s'), '390');
  assert.equal(u.hash, '', 'the # of the path is encoded, not a URL fragment');

  const bare = new URL(countUrl({ p: '/#/', t: 'Gallery' }, '', undefined, 'x'));
  assert.deepEqual([...bare.searchParams.keys()].sort(), ['p', 'rnd', 't']);
  assert.equal(new URL(countUrl({ p: '/#/', t: 'Gallery' }, '', 0, 'x')).searchParams.has('s'), false);
});

await test('send: one beacon; the pixel only when the beacon is not queued; never throws', () => {
  const run = (beacon: ((u: string) => boolean) | undefined, pixelThrows = false) => {
    const calls = { beacon: 0, pixel: 0 };
    const nav = beacon
      ? {
          sendBeacon: (u: string) => {
            calls.beacon++;
            return beacon(u);
          },
        }
      : {};
    send('https://x/count?p=%2F', nav, () => {
      calls.pixel++;
      if (pixelThrows) throw new Error('blocked');
    });
    return calls;
  };
  assert.deepEqual(run(() => true), { beacon: 1, pixel: 0 });
  assert.deepEqual(run(() => false), { beacon: 1, pixel: 1 });
  assert.deepEqual(
    run(() => {
      throw new TypeError('invalid');
    }),
    { beacon: 1, pixel: 1 },
  );
  assert.deepEqual(run(undefined), { beacon: 0, pixel: 1 });
  assert.deepEqual(run(() => false, true), { beacon: 1, pixel: 1 }, 'a failing pixel stays silent');
  assert.doesNotThrow(() => send('u', undefined, () => {}));
});

await test('opt-out flag: =1 sets, =0 clears, anything else leaves it; blocked storage never throws', () => {
  const data = new Map<string, string>();
  const store = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
  applyOptOut('1', store);
  assert.equal(data.get(NO_COUNT_KEY), '1');
  assert.equal(storedOptOut(store), true);
  for (const v of [undefined, '', 'yes', 'true']) applyOptOut(v, store);
  assert.equal(storedOptOut(store), true);
  applyOptOut('0', store);
  assert.equal(data.size, 0);
  assert.equal(storedOptOut(store), false);

  const blocked = {
    getItem: (): string | null => {
      throw new Error('SecurityError');
    },
    setItem: (): void => {
      throw new Error('QuotaExceededError');
    },
    removeItem: (): void => {
      throw new Error('SecurityError');
    },
  };
  assert.doesNotThrow(() => applyOptOut('1', blocked));
  assert.doesNotThrow(() => applyOptOut('0', blocked));
  assert.equal(storedOptOut(blocked), false);
  assert.equal(storedOptOut(), false, 'no localStorage under Node: false, no throw');
});

// ── Tracker ──────────────────────────────────────────────────────────────────────────────────────
function harness(over: Partial<TrackerDeps> = {}) {
  const queue: Array<() => void> = [];
  const sent: URL[] = [];
  const track = createTracker({
    probe: () => PROD,
    titleOf,
    referrer: () => 'https://www.google.com/',
    width: () => 1280,
    later: (fn) => queue.push(fn),
    send: (u) => sent.push(new URL(u)),
    rnd: () => 'r0',
    ...over,
  });
  const flush = (): void => {
    while (queue.length) queue.shift()!();
  };
  return { track, queue, sent, flush };
}

await test('tracker: nothing is sent during the navigation itself — only when `later` runs', () => {
  const h = harness();
  h.track('/');
  assert.equal(h.sent.length, 0);
  assert.equal(h.queue.length, 1);
  h.flush();
  assert.equal(h.sent.length, 1);
});

await test('tracker: one view per navigation; the same path twice in a row counts once', () => {
  const h = harness();
  for (const p of ['/', '/', `/v/${first.id}`, `/v/${first.id}`, '/about', `/v/${first.id}`]) h.track(p);
  h.flush();
  assert.deepEqual(
    h.sent.map((u) => u.searchParams.get('p')),
    ['/#/', `/#/v/${first.id}`, '/#/about', `/#/v/${first.id}`],
  );
});

await test('tracker: the external referrer goes with the first view only', () => {
  const h = harness();
  h.track('/');
  h.track('/about');
  h.flush();
  assert.equal(h.sent[0]!.searchParams.get('r'), 'https://www.google.com/');
  assert.equal(h.sent[1]!.searchParams.has('r'), false);
  assert.equal(h.sent[1]!.searchParams.get('s'), '1280');
});

await test('tracker: a skipped visit sends nothing; the decision is taken at send time', () => {
  let probe: Probe = { ...PROD, doNotTrack: '1' };
  const h = harness({ probe: () => probe });
  h.track('/');
  h.flush();
  assert.equal(h.sent.length, 0);
  h.track('/about');
  probe = PROD; // e.g. the opt-out flag was cleared before the idle callback ran
  h.flush();
  assert.equal(h.sent.length, 1);
});

await test('tracker: a throwing probe, lookup or transport stays silent', () => {
  const boom = (): never => {
    throw new Error('boom');
  };
  for (const over of [{ probe: boom }, { titleOf: boom }, { send: boom }, { width: boom }] as Partial<TrackerDeps>[]) {
    const h = harness(over);
    assert.doesNotThrow(() => {
      h.track(`/v/${first.id}`);
      h.flush();
    });
  }
});

// ── Browser wiring: no window, then jsdom ────────────────────────────────────────────────────────
await test('SSR (no window): trackPageview is a no-op', () => {
  assert.equal(typeof (globalThis as { window?: unknown }).window, 'undefined');
  assert.doesNotThrow(() => trackPageview('/'));
});

type Spy = { beacons: string[]; images: number; fetches: number };
function installDom(url: string, opts: { userAgent?: string; referrer?: string; idleCallback?: boolean } = {}): Spy {
  const dom = new JSDOM('<!doctype html><p>x</p>', { url, referrer: opts.referrer });
  const w = dom.window;
  const spy: Spy = { beacons: [], images: 0, fetches: 0 };
  // jsdom has no requestIdleCallback, which exercises the setTimeout fallback (Safari); the other cases add a
  // fast one so the suite stays quick.
  if (opts.idleCallback) Object.defineProperty(w, 'requestIdleCallback', { value: (fn: () => void) => setTimeout(fn, 0) });
  if (opts.userAgent) Object.defineProperty(w.navigator, 'userAgent', { get: () => opts.userAgent });
  Object.defineProperty(w.navigator, 'sendBeacon', {
    value: (u: string) => {
      spy.beacons.push(u);
      return true;
    },
  });
  const def = (k: string, v: unknown): void => {
    Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  };
  def('window', w);
  def('document', w.document);
  def('navigator', w.navigator);
  def('location', w.location);
  def('localStorage', w.localStorage);
  def('Image', function Image() {
    spy.images++;
    return {};
  });
  def('fetch', () => {
    spy.fetches++;
    return Promise.reject(new Error('no network in tests'));
  });
  return spy;
}
const fallbackIdle = (): Promise<void> => new Promise((r) => setTimeout(r, 1200)); // the 1 s setTimeout fallback
const idle = (): Promise<void> => new Promise((r) => setTimeout(r, 20));
const CHROME = PROD.userAgent;
const SITE = 'https://endorrfin.github.io/numbers-speak/';

await test('jsdom on the production URL with a browser UA: one beacon per navigation, sent after idle', async () => {
  const spy = installDom(`${SITE}#/v/${first.id}`, { userAgent: CHROME, referrer: 'https://www.google.com/' });
  trackPageview(`/v/${first.id}`);
  assert.equal(spy.beacons.length, 0, 'not sent synchronously');
  await idle();
  assert.equal(spy.beacons.length, 0, 'no requestIdleCallback: waits for the 1 s fallback timeout');
  await fallbackIdle();
  assert.equal(spy.beacons.length, 1);
  const u = new URL(spy.beacons[0]!);
  assert.equal(u.searchParams.get('p'), `/#/v/${first.id}`);
  assert.equal(u.searchParams.get('t'), first.title.en);
  assert.equal(u.searchParams.get('r'), 'https://www.google.com/');
  trackPageview(`/v/${first.id}`); // a settings change: App does not call again, and a repeat is ignored anyway
  trackPageview('/about');
  await fallbackIdle();
  assert.equal(spy.beacons.length, 2);
  assert.equal(new URL(spy.beacons[1]!).searchParams.has('r'), false);
  assert.equal(spy.images + spy.fetches, 0);
  assert.equal(localStorage.length, 0, 'the counter writes nothing to storage');
});

await test('jsdom: the owner opt-out (stored flag or ?no-count=1 in the hash) sends nothing', async () => {
  const spy = installDom(`${SITE}#/about?no-count=1`, { userAgent: CHROME, idleCallback: true });
  trackPageview('/t/world');
  await idle();
  assert.equal(spy.beacons.length, 0, 'hash flag, storage empty');
  applyOptOut('1');
  location.hash = '#/';
  trackPageview('/t/economy');
  await idle();
  assert.equal(spy.beacons.length, 0, 'stored flag');
  applyOptOut('0');
  trackPageview('/t/security');
  await idle();
  assert.equal(spy.beacons.length, 1, 'flag cleared → counted again');
});

await test('jsdom with its own UA (smoke/tests) and on localhost: no request of any kind', async () => {
  let spy = installDom(`${SITE}#/`, { idleCallback: true }); // default jsdom UA
  trackPageview('/t/knowledge');
  await idle();
  assert.deepEqual(spy, { beacons: [], images: 0, fetches: 0 });
  spy = installDom('http://localhost:5173/#/', { userAgent: CHROME, idleCallback: true });
  trackPageview('/t/ukraine');
  await idle();
  assert.deepEqual(spy, { beacons: [], images: 0, fetches: 0 });
});

console.log(`✓ analytics — ${passed} tests passed.`);
