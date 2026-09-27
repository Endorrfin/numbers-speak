/*
 * renderPointMap.ts — pure D3 renderer for a world map of points (cities). CHANGED (S3-re): new.
 *
 *   renderPointMap(svg, points, options) → cleanup
 *
 * The land is one pre-projected SVG path (Equal Earth, fixed frame — see LandFrame), scaled to the container; the
 * points go through the same projection at pixel scale, so dots and labels keep their size on every screen. Each
 * dot is 8 px with a surface ring; the caller orders points (drawn first = underneath) and colours them (e.g. a
 * sequential ramp). Emphasised dots get an accent ring and a direct label; the rest are named by the tooltip, which
 * snaps to the nearest dot within 24 px.
 *
 * The projection is Equal Earth (Šavrič, Patterson & Jenny, 2018) written out below — the same formula as d3-geo's
 * geoEqualEarth (a test pins them together), so the page does not load d3-geo just to place ~500 dots.
 *
 * Safety: text is written with `.text()` / `textContent` only; the land path is validated by the dataset parser.
 * Motion: none (a map does not animate between measures — colours change in place).
 */
import { pointer, select } from 'd3';
import { nearestPoint, placeLabels } from './renderScatter';
import type { LabelBox } from './renderScatter';
import { hideTip, showTip } from './tooltip';
import type { TipContent } from './tooltip';

export type MapPoint = {
  key: string;
  lat: number;
  lon: number;
  color: string;
  /** Dot radius in px (default 4 = an 8 px dot), e.g. by class of a sequential scale. */
  r?: number;
  emphasis?: boolean;
  label: string;
  tooltip: TipContent;
};

/** A land outline projected once into a `width` × `height` frame with these Equal Earth parameters. */
export type LandFrame = { width: number; height: number; scale: number; translate: [number, number]; d: string };

export type PointMapOptions = {
  width: number;
  tooltip: HTMLElement | null;
  land: LandFrame;
  /** Keys of the points to zoom to (e.g. one region's cities); omitted or fewer than two = the whole frame. */
  focus?: readonly string[];
};

const R = 4;
const SNAP = 24;

type Placed = MapPoint & { cx: number; cy: number };

const A1 = 1.340264;
const A2 = -0.081106;
const A3 = 0.000893;
const A4 = 0.003796;
const M = Math.sqrt(3) / 2;
const RAD = Math.PI / 180;

/** Equal Earth at d3's defaults (no rotation, y down): degrees → [x, y] for the given scale and translate. */
export function equalEarth(lon: number, lat: number, scale: number, translate: readonly [number, number]): [number, number] {
  const l = Math.asin(M * Math.sin(lat * RAD));
  const l2 = l * l;
  const l6 = l2 * l2 * l2;
  const x = (lon * RAD * Math.cos(l)) / (M * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2)));
  const y = l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2));
  return [translate[0] + scale * x, translate[1] - scale * y];
}

export type MapView = { height: number; placed: Placed[]; k: number; dx: number; dy: number };

/**
 * Pixel positions of points on a map `width` px wide (exported for tests). With `focus`, the view is the padded box
 * around those points (at most 1.1 × the width tall, 320 px at least), so a region fills a phone screen; the land
 * path is then drawn with `translate(dx, dy) scale(k)`.
 */
export function projectPoints(points: readonly MapPoint[], land: LandFrame, width: number, focus?: readonly string[]): MapView {
  const base = points.map((p) => equalEarth(p.lon, p.lat, land.scale, land.translate));
  let vx = 0;
  let vy = 0;
  let vw = land.width;
  let vh = land.height;
  const keys = new Set(focus ?? []);
  const inFocus = base.filter((_, i) => keys.has(points[i]!.key));
  if (inFocus.length >= 2) {
    const xs = inFocus.map((p) => p[0]);
    const ys = inFocus.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const padX = Math.max(30, (x1 - x0) * 0.08);
    const padY = Math.max(20, (y1 - y0) * 0.08);
    vx = x0 - padX;
    vy = y0 - padY;
    vw = x1 - x0 + 2 * padX;
    vh = y1 - y0 + 2 * padY;
  }
  let k = width / vw;
  let height = vh * k;
  const maxHeight = Math.max(320, width * 1.1);
  if (inFocus.length >= 2 && height > maxHeight) {
    k = maxHeight / vh;
    height = maxHeight;
  }
  const dx = (width - vw * k) / 2 - vx * k;
  const dy = -vy * k;
  const placed = points.map((p, i): Placed => ({ ...p, cx: base[i]![0] * k + dx, cy: base[i]![1] * k + dy }));
  return { height: Math.ceil(height), placed, k, dx, dy };
}

export function renderPointMap(svgEl: SVGSVGElement, points: readonly MapPoint[], options: PointMapOptions): () => void {
  const { width, tooltip, land } = options;
  const { height, placed, k, dx, dy } = projectPoints(points, land, width, options.focus);
  const ordered = [...placed].sort((a, b) => Number(Boolean(a.emphasis)) - Number(Boolean(b.emphasis)));
  const svg = select(svgEl);
  svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);
  const layer = (cls: string) =>
    svg
      .selectAll<SVGGElement, null>(`g.${cls}`)
      .data([null])
      .join((enter) => enter.append('g').attr('class', cls));

  layer('pm-land')
    .selectAll<SVGPathElement, string>('path.pm-land-path')
    .data([land.d])
    .join('path')
    .attr('class', 'pm-land-path')
    .attr('transform', `translate(${dx},${dy}) scale(${k})`)
    .attr('d', (d) => d);

  layer('pm-dots')
    .selectAll<SVGCircleElement, Placed>('circle.pm-dot')
    .data(ordered, (d) => d.key)
    .join('circle')
    .order()
    .attr('class', 'pm-dot')
    .classed('is-emphasis', (d) => Boolean(d.emphasis))
    .attr('cx', (d) => d.cx)
    .attr('cy', (d) => d.cy)
    .attr('r', (d) => (d.r ?? R) + (d.emphasis ? 1.5 : 0))
    .style('fill', (d) => d.color);

  const labels = placeLabels(
    ordered.filter((d) => d.emphasis).map((d) => ({ key: d.key, cx: d.cx, cy: d.cy, text: d.label })),
    0,
    width,
    R + 2,
  );
  layer('pm-labels')
    .selectAll<SVGTextElement, LabelBox>('text.pm-label')
    .data(labels, (d) => d.key)
    .join('text')
    .attr('class', 'pm-label')
    .attr('x', (d) => d.x)
    .attr('y', (d) => d.y)
    .attr('dy', '0.35em')
    .attr('text-anchor', (d) => d.anchor)
    .text((d) => d.text);

  const ring = layer('pm-hover')
    .selectAll<SVGCircleElement, null>('circle.pm-ring')
    .data([null])
    .join('circle')
    .attr('class', 'pm-ring')
    .attr('r', R + 5)
    .attr('display', 'none');
  const xs = ordered.map((d) => d.cx);
  const ys = ordered.map((d) => d.cy);
  const hide = (): void => {
    ring.attr('display', 'none');
    hideTip(tooltip);
  };
  const overlay = layer('pm-overlay')
    .selectAll<SVGRectElement, null>('rect.pm-hit')
    .data([null])
    .join('rect')
    .attr('class', 'pm-hit')
    .attr('width', width)
    .attr('height', height)
    .on('pointermove.pm pointerdown.pm', (event: PointerEvent) => {
      const [mx, my] = pointer(event, svgEl);
      const d = ordered[nearestPoint(xs, ys, mx, my, SNAP)];
      if (!d) return hide();
      ring.attr('cx', d.cx).attr('cy', d.cy).attr('display', null);
      showTip(tooltip, svgEl, event, d.tooltip);
    })
    .on('pointerleave.pm', hide);

  return () => {
    overlay.on('.pm', null);
    hide();
  };
}
