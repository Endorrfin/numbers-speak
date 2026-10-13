/*
 * renderSpans.ts — pure D3 renderer for a Gantt of stretches on labelled rows, with a total bar per row.
 * CHANGED (S3-ai2): new (ai-models, angle C — who held No. 1 on the LMArena leaderboard and when).
 *
 *   renderSpans(svg, rows, options) → cleanup
 *
 * Each row: its label on the left, its main stretches as solid bars on a UTC time axis, its secondary stretches as a
 * thin strip under them (e.g. "in the top 3"), and on the right a bar of the row's total with the value beside it. An
 * optional marker draws one dated vertical line with a caption (e.g. a change of method). Phones (< 560 px): the
 * label stands above the row, the total is text only.
 *
 * Hover: the stretch under the pointer in that row (pointer only; the table view serves keyboards and screen readers).
 * Safety: text is written with `.text()` / `textContent` only. The whole SVG is redrawn per call (idempotent).
 */
import { pointer, scaleUtc, select } from 'd3';
import { hideTip, showTip } from './tooltip';
import type { TipContent } from './tooltip';

export type Span = { key: string; t0: number; t1: number; tooltip: TipContent };

export type SpanRow = {
  key: string;
  label: string;
  emphasis?: boolean;
  spans: readonly Span[];
  /** Secondary stretches, drawn as a thin strip under the row. */
  minor?: ReadonlyArray<readonly [number, number]>;
  total: number;
  totalLabel: string;
};

export type SpansOptions = {
  width: number;
  tooltip: HTMLElement | null;
  /** UTC ms. */
  domain: [number, number];
  formatTick: (t: number) => string;
  /** The largest total any row could show (the bars' full length). */
  totalMax: number;
  marker?: { t: number; label: string };
};

export type SpansLayout = {
  phone: boolean;
  left: number;
  right: number;
  totalX: number;
  totalW: number;
  rowH: number;
  top: number;
  rowY: number[];
  bottom: number;
  height: number;
};

const BAR = 14;
const MINOR = 4;

export function layoutSpans(width: number, rows: number): SpansLayout {
  const phone = width < 560;
  const rowH = phone ? 46 : 34;
  const top = 22;
  const left = phone ? 8 : 104;
  const totalW = phone ? 44 : 132;
  const right = width - totalW - 12;
  const rowY = Array.from({ length: rows }, (_, i) => top + i * rowH + (phone ? 28 : rowH / 2));
  const bottom = top + rows * rowH;
  return { phone, left, right, totalX: right + 12, totalW, rowH, top, rowY, bottom, height: bottom + 24 };
}

export function renderSpans(svgEl: SVGSVGElement, rows: readonly SpanRow[], options: SpansOptions): () => void {
  const { width, tooltip } = options;
  const L = layoutSpans(width, rows.length);
  const svg = select(svgEl);
  svg.selectAll('*').remove();
  svg.attr('width', width).attr('height', L.height).attr('viewBox', `0 0 ${width} ${L.height}`);
  const x = scaleUtc().domain(options.domain).range([L.left, L.right]).clamp(true);
  const ticks = x.ticks(L.phone ? 3 : 6).map((d) => d.getTime());

  // ── Grid and axis ─────────────────────────────────────────────────────────────────────────────────
  const grid = svg.append('g').attr('class', 'gs-grid');
  grid
    .selectAll('line')
    .data(ticks)
    .join('line')
    .attr('x1', (t) => x(t))
    .attr('x2', (t) => x(t))
    .attr('y1', L.top)
    .attr('y2', L.bottom);
  grid
    .selectAll('text')
    .data(ticks)
    .join('text')
    .attr('class', 'gs-tick')
    .attr('x', (t) => x(t))
    .attr('y', L.bottom + 16)
    .attr('text-anchor', 'middle')
    .text((t) => options.formatTick(t));

  if (options.marker) {
    const mx = x(options.marker.t);
    const m = svg.append('g').attr('class', 'gs-marker');
    m.append('line').attr('x1', mx).attr('x2', mx).attr('y1', L.top - 6).attr('y2', L.bottom);
    m.append('text')
      .attr('x', mx + (mx > (L.left + L.right) / 2 ? -4 : 4))
      .attr('y', L.top - 10)
      .attr('text-anchor', mx > (L.left + L.right) / 2 ? 'end' : 'start')
      .text(options.marker.label);
  }

  // ── Rows ──────────────────────────────────────────────────────────────────────────────────────────
  const g = svg
    .append('g')
    .attr('class', 'gs-rows')
    .selectAll<SVGGElement, SpanRow>('g')
    .data(rows, (d) => d.key)
    .join('g')
    .attr('class', (d) => (d.emphasis ? 'gs-row is-emphasis' : 'gs-row'));
  g.append('line')
    .attr('class', 'gs-line')
    .attr('x1', L.left)
    .attr('x2', L.right)
    .attr('y1', (_, i) => L.rowY[i]!)
    .attr('y2', (_, i) => L.rowY[i]!);
  g.append('text')
    .attr('class', 'gs-name')
    .attr('x', L.phone ? L.left : L.left - 10)
    .attr('y', (_, i) => (L.phone ? L.rowY[i]! - BAR / 2 - 6 : L.rowY[i]!))
    .attr('dy', L.phone ? null : '0.35em')
    .attr('text-anchor', L.phone ? 'start' : 'end')
    .text((d) => d.label);
  g.each(function (row, i) {
    const y = L.rowY[i]!;
    const sel = select(this);
    sel
      .selectAll('rect.gs-minor')
      .data(row.minor ?? [])
      .join('rect')
      .attr('class', 'gs-minor')
      .attr('x', (d) => x(d[0]))
      .attr('width', (d) => Math.max(1, x(d[1]) - x(d[0])))
      .attr('y', y + BAR / 2 + 2)
      .attr('height', MINOR);
    sel
      .selectAll('rect.gs-span')
      .data(row.spans, (d) => (d as Span).key)
      .join('rect')
      .attr('class', 'gs-span')
      .attr('x', (d) => x(d.t0))
      .attr('width', (d) => Math.max(1.5, x(d.t1) - x(d.t0)))
      .attr('y', y - BAR / 2)
      .attr('height', BAR);
    const w = options.totalMax > 0 ? (L.phone ? 0 : (L.totalW - 52) * (row.total / options.totalMax)) : 0;
    if (!L.phone) {
      sel
        .append('rect')
        .attr('class', 'gs-total-bar')
        .attr('x', L.totalX)
        .attr('y', y - BAR / 2)
        .attr('width', Math.max(row.total > 0 ? 2 : 0, w))
        .attr('height', BAR);
    }
    sel
      .append('text')
      .attr('class', 'gs-total')
      .attr('x', L.totalX + w + (L.phone ? 0 : 6))
      .attr('y', y)
      .attr('dy', '0.35em')
      .text(row.totalLabel);
  });

  // ── Hover ─────────────────────────────────────────────────────────────────────────────────────────
  const outline = svg.append('rect').attr('class', 'gs-hover').attr('display', 'none');
  const hide = (): void => {
    outline.attr('display', 'none');
    hideTip(tooltip);
  };
  const hit = svg
    .append('rect')
    .attr('class', 'gs-hit')
    .attr('x', L.left)
    .attr('y', L.top)
    .attr('width', Math.max(0, L.right - L.left))
    .attr('height', Math.max(0, L.bottom - L.top))
    .on('pointermove.gs pointerdown.gs', (event: PointerEvent) => {
      const [mx, my] = pointer(event, svgEl);
      const i = Math.floor((my - L.top) / L.rowH);
      const row = rows[i];
      const t = x.invert(mx).getTime();
      // The stretch under the pointer, else the nearest within 6 px (two-day runs are narrow).
      const span =
        row?.spans.find((s) => t >= s.t0 && t < s.t1) ??
        row?.spans.find((s) => Math.min(Math.abs(x(s.t0) - mx), Math.abs(x(s.t1) - mx)) <= 6);
      if (!row || !span) return hide();
      const y = L.rowY[i]!;
      outline
        .attr('x', x(span.t0) - 2)
        .attr('y', y - BAR / 2 - 2)
        .attr('width', Math.max(1.5, x(span.t1) - x(span.t0)) + 4)
        .attr('height', BAR + 4)
        .attr('display', null);
      showTip(tooltip, svgEl, event, span.tooltip);
    })
    .on('pointerleave.gs', hide);

  return () => {
    hit.on('.gs', null);
    hide();
  };
}
