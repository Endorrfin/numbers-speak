/*
 * scatterZoom.ts — d3-zoom gestures for renderScatter's opt-in zoom. CHANGED (S3-ai1): new.
 *
 * A separate module so d3-zoom and d3-drag load only with a page that zooms (ai-models, angle B); renderScatter itself
 * imports neither. Gestures:
 *   - computer: Ctrl/⌘ + wheel and a trackpad pinch (it arrives as Ctrl + wheel) zoom; a plain wheel keeps scrolling the
 *     page (no scroll trap on a long page); drag pans; double-click zooms in;
 *   - phone: two fingers pinch; one finger scrolls the page until the plot is zoomed in, then pans it;
 *   - buttons (keyboard path): `controls.zoomBy(f)` / `controls.reset()`, animated unless reduced motion.
 * The zoom survives a redraw (a highlight change): the transform kept on the element is applied again.
 */
import { select } from 'd3';
// From its own package, not the `d3` umbrella — so the bundler keeps it in the page's chunk (vite.config.ts).
import { zoom, zoomIdentity, zoomTransform } from 'd3-zoom';
import type { ScatterZoomControls, ZoomHost } from './renderScatter';

export const MAX_SCALE = 40;
const DURATION = 250;

/** Which events start a gesture (exported for tests). `k` = the current zoom factor. */
export function zoomFilter(event: Event, k: number): boolean {
  if (event.type === 'wheel') return (event as WheelEvent).ctrlKey || (event as WheelEvent).metaKey;
  if (event.type === 'touchstart') return (event as TouchEvent).touches.length > 1 || k > 1;
  return !(event as MouseEvent).ctrlKey && !(event as MouseEvent).button;
}

export function attachScatterZoom(host: ZoomHost): { controls: ScatterZoomControls; detach: () => void } {
  const svg = select(host.svg);
  const behavior = zoom<SVGSVGElement, unknown>()
    .scaleExtent([1, MAX_SCALE])
    .extent(host.extent)
    .translateExtent(host.extent)
    .filter((event: Event) => zoomFilter(event, zoomTransform(host.svg).k))
    .on('zoom.sc', (event: { transform: Parameters<ZoomHost['onZoom']>[0] }) => host.onZoom(event.transform));
  svg.call(behavior);
  const kept = zoomTransform(host.svg);
  if (kept.k !== 1) host.onZoom(kept);
  const ms = host.reducedMotion ? 0 : DURATION;
  return {
    controls: {
      zoomBy: (factor) => {
        svg.transition().duration(ms).call(behavior.scaleBy, factor);
      },
      reset: () => {
        svg.transition().duration(ms).call(behavior.transform, zoomIdentity);
      },
    },
    detach: () => {
      svg.interrupt();
      svg.on('.zoom', null);
    },
  };
}
