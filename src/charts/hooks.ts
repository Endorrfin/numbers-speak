// hooks.ts — shared chart hooks: container width (ResizeObserver) and the reduced-motion preference.
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { RefObject } from 'react';

/**
 * Content-box width of an element, updated on resize (rounded, so sub-pixel jitter does not redraw).
 * 0 until measured — and always 0 under SSR, where charts render an empty frame.
 */
export function useElementWidth(ref: RefObject<Element | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let frame = 0;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? 0);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setWidth(w)); // coalesce bursts while dragging a window
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [ref]);
  return width;
}

const REDUCED = '(prefers-reduced-motion: reduce)';

function subscribeReduced(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
const getReduced = (): boolean =>
  typeof window !== 'undefined' && Boolean(window.matchMedia?.(REDUCED).matches);

/** true when the user asked the OS for less motion — charts then skip transitions (standard §3.9). */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, getReduced, () => false);
}
