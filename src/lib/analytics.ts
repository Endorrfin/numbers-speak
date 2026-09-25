/*
 * analytics.ts — anonymous page counts with GoatCounter. CHANGED (S3-an): new.
 *
 * Own small client (≈ 0.85 kB gzip in the initial chunk) instead of GoatCounter's count.js: count.js counts
 * location.pathname (our routes live in the hash), has no Do Not Track / Global Privacy Control check, writes
 * console warnings and can show alert(). The /count endpoint is GoatCounter's documented pixel
 * (goatcounter.com/help/pixel) and also takes the POST that navigator.sendBeacon makes — count.js sends it the
 * same way.
 *
 * Kept in the initial chunk on purpose: as a lazy chunk (a file named analytics-*.js) an ad blocker could block
 * it, Vite would fire `vite:preloadError`, and chunkReload.ts would reload the visitor's page.
 *
 * Zero inconvenience for visitors (PROJECT-BRIEF §4, CLAUDE.md §2):
 *  - no cookies, no identifiers in storage — the only key is the owner's own opt-out flag;
 *  - sent after the page is shown (idle callback), never retried, every failure silent;
 *  - not counted: the dev build, any host but the production one (localhost, LAN, forks, file://),
 *    automated browsers (navigator.webdriver, headless, jsdom), Do Not Track, Global Privacy Control,
 *    the owner's opt-out (#/about?no-count=1);
 *  - one view per real navigation: the path is counted, the settings query (?region=…) never is.
 */
import { getViz } from '../catalog';
import { isVisible } from '../catalog/filter';
import { IS_DEV } from './env';
import { parseHash } from './hashRouter';
import { COUNT_HOSTS, GOATCOUNTER_COUNT_URL } from './links';

export const NO_COUNT_KEY = 'numbers-speak.no-count';

/** What GoatCounter records: path (`p`) and title (`t`). */
export type Hit = { p: string; t: string };

/**
 * Router path ('/v/gdp-by-country' — no query) → hit. An unknown id, a draft outside dev and any
 * unmatched route all become '/#/404', so the dashboard never collects junk paths.
 */
export function hitFor(path: string, titleOf: (id: string) => string | undefined): Hit {
  const { route } = parseHash(path);
  if (route.name === 'catalog') {
    return route.tab === 'all' ? { p: '/#/', t: 'Gallery' } : { p: `/#/t/${route.tab}`, t: `Gallery · ${route.tab}` };
  }
  if (route.name === 'about') return { p: '/#/about', t: 'About' };
  if (route.name === 'viz') {
    const title = titleOf(route.id);
    if (title !== undefined) return { p: `/#/v/${route.id}`, t: title };
  }
  return { p: '/#/404', t: 'Not found' };
}

/** Everything the "count or not" decision reads, captured at send time so the decision stays pure. */
export type Probe = {
  dev: boolean;
  protocol: string;
  hostname: string;
  userAgent: string;
  webdriver: boolean;
  doNotTrack: string | null | undefined;
  gpc: boolean | undefined;
  optedOut: boolean;
};

export type SkipReason = 'dev' | 'host' | 'automation' | 'dnt' | 'gpc' | 'opted-out';

/** Why this visit is not counted, or null when it is. */
export function skipReason(p: Probe, hosts: readonly string[] = COUNT_HOSTS): SkipReason | null {
  if (p.dev) return 'dev';
  if (p.protocol !== 'https:' || !hosts.includes(p.hostname)) return 'host';
  if (p.webdriver || /headless|jsdom/i.test(p.userAgent)) return 'automation';
  if (p.doNotTrack === '1' || p.doNotTrack === 'yes') return 'dnt';
  if (p.gpc === true) return 'gpc';
  if (p.optedOut) return 'opted-out';
  return null;
}

/** The external page that brought the visitor, or '' — our own pages are never a referrer. */
export function externalReferrer(referrer: string, ownBase: string): string {
  return referrer && !referrer.startsWith(ownBase) ? referrer : '';
}

/** Hit → request URL. Only p, t, r (first view only), s (screen width) and a cache buster; never `q`. */
export function countUrl(hit: Hit, ref: string, width: number | undefined, rnd: string, endpoint = GOATCOUNTER_COUNT_URL): string {
  const q = new URLSearchParams(hit);
  if (ref) q.set('r', ref);
  if (width) q.set('s', String(width));
  q.set('rnd', rnd);
  return `${endpoint}?${q}`;
}

/**
 * Fire and forget: sendBeacon; only when the browser refuses to queue it (returns false or throws), a
 * detached pixel instead. No retries, no promise, never throws.
 */
export function send(url: string, nav: { sendBeacon?: (url: string) => boolean } | undefined, pixel: (url: string) => void): void {
  try {
    if (nav?.sendBeacon?.(url)) return;
  } catch {
    /* not queued: fall back to the pixel */
  }
  try {
    pixel(url);
  } catch {
    /* silent by design */
  }
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const storage = (store?: Store): Store => store ?? localStorage; // a throwing getter is caught by callers

/** The owner's flag, stored in this browser only. */
export function storedOptOut(store?: Store): boolean {
  try {
    return storage(store).getItem(NO_COUNT_KEY) === '1';
  } catch {
    return false;
  }
}

/** `?no-count=1` sets the flag, `?no-count=0` clears it; any other value leaves it alone. */
export function applyOptOut(value: string | undefined, store?: Store): void {
  if (value !== '1' && value !== '0') return;
  try {
    if (value === '1') storage(store).setItem(NO_COUNT_KEY, '1');
    else storage(store).removeItem(NO_COUNT_KEY);
  } catch {
    /* storage blocked: the hash check in the probe still covers the visit that carries the flag */
  }
}

export type TrackerDeps = {
  probe: () => Probe;
  titleOf: (id: string) => string | undefined;
  referrer: () => string;
  width: () => number | undefined;
  later: (fn: () => void) => void;
  send: (url: string) => void;
  rnd?: () => string;
};

/**
 * One call per real navigation (App calls it when the router path changes). The first call carries the
 * external referrer; the same path twice in a row (StrictMode, remount) counts once.
 */
export function createTracker(d: TrackerDeps): (path: string) => void {
  let last: string | undefined;
  let first = true;
  const rnd = d.rnd ?? (() => Math.random().toString(36).slice(2, 7));
  return (path) => {
    if (path === last) return;
    last = path;
    const ref = first ? d.referrer() : '';
    first = false;
    d.later(() => {
      try {
        if (skipReason(d.probe()) === null) d.send(countUrl(hitFor(path, d.titleOf), ref, d.width(), rnd()));
      } catch {
        /* silent by design */
      }
    });
  };
}

// ── Browser wiring ───────────────────────────────────────────────────────────────────────────────

type Nav = Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };

function browserProbe(): Probe {
  const n = navigator as Nav;
  return {
    dev: IS_DEV,
    protocol: location.protocol,
    hostname: location.hostname,
    userAgent: n.userAgent,
    webdriver: n.webdriver === true,
    doNotTrack: n.doNotTrack ?? (window as Window & { doNotTrack?: string }).doNotTrack ?? n.msDoNotTrack,
    gpc: n.globalPrivacyControl,
    optedOut: storedOptOut() || parseHash(location.hash).params['no-count'] === '1',
  };
}

/** After the page is shown: wait out a prerender, then the browser's idle time (Safari: a timeout). */
function later(fn: () => void): void {
  const doc = document as Document & { prerendering?: boolean };
  if (doc.prerendering) {
    doc.addEventListener('prerenderingchange', () => later(fn), { once: true });
    return;
  }
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fn, { timeout: 5000 });
  else setTimeout(fn, 1000);
}

let track: ((path: string) => void) | undefined;

/** Count one view of a router path. No-op under SSR and in tests that don't create a window. */
export function trackPageview(path: string): void {
  if (typeof window === 'undefined') return;
  track ??= createTracker({
    probe: browserProbe,
    titleOf: (id) => {
      const meta = getViz(id);
      return meta && isVisible(meta, IS_DEV) ? meta.title.en : undefined;
    },
    referrer: () => externalReferrer(document.referrer, location.origin + location.pathname),
    width: () => window.screen?.width,
    later,
    send: (url) =>
      send(url, navigator, (u) => {
        new Image().src = u;
      }),
  });
  track(path);
}
