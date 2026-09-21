/*
 * chunkReload.ts — recovery from "Failed to fetch dynamically imported module" (CHANGED (S3-bdd2)).
 *
 * Why it happens: the site is deployed to GitHub Pages with content-hashed chunk names. A tab that was
 * opened before a deploy (or a cached index.html) asks for a chunk file that the new deploy no longer has,
 * so the lazy import of a visualization page rejects and the error boundary shows "This chart failed to load".
 * Nothing is wrong with the user's network — the page is simply stale.
 *
 * What we do: Vite dispatches `vite:preloadError` when such an import fails. We reload once, which fetches
 * the current index.html and the chunk names it references. The guard makes the reload at most once per
 * window (a real outage then falls through to the error boundary instead of looping).
 */
export const RELOAD_KEY = 'numbers-speak.chunk-reload';
/** A second failure inside this window is a real failure, not a stale deploy. */
export const RELOAD_WINDOW_MS = 30_000;

/** Pure decision, unit-tested: reload only when the last attempt is missing or older than the window. */
export function shouldReload(lastAttempt: string | null, now: number, windowMs = RELOAD_WINDOW_MS): boolean {
  const last = Number(lastAttempt);
  if (!Number.isFinite(last) || last <= 0) return true;
  return now - last > windowMs;
}

type Store = Pick<Storage, 'getItem' | 'setItem'>;

/** Storage and reload are injected, so the browser wiring stays testable and never throws. */
export function installChunkReload(
  target: Pick<Window, 'addEventListener'>,
  store: Store | null,
  reload: () => void,
  now: () => number = Date.now,
): void {
  target.addEventListener('vite:preloadError', (event: Event) => {
    let last: string | null;
    try {
      last = store?.getItem(RELOAD_KEY) ?? null;
    } catch {
      return; // storage blocked: never risk a reload loop
    }
    if (!shouldReload(last, now())) return;
    try {
      store?.setItem(RELOAD_KEY, String(now()));
    } catch {
      return;
    }
    event.preventDefault(); // we handle it: no unhandled rejection in the console
    reload();
  });
}

/** Wires the real browser (no-op under SSR or when sessionStorage is unavailable). */
export function installChunkReloadInBrowser(): void {
  if (typeof window === 'undefined') return;
  let store: Store | null;
  try {
    store = window.sessionStorage;
  } catch {
    store = null;
  }
  installChunkReload(window, store, () => window.location.reload());
}
