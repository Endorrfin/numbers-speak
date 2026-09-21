/*
 * renderStackedRows.ts — pure D3 renderer for ranked horizontal bars split into segments (e.g. the largest
 * attacks: missiles by class + drones). CHANGED (S3-aa): new.
 *
 *   renderStackedRows(svg, spec, options) → cleanup
 *
 * One shared scale from 0 to the largest total; a label column on the left (stacked above the bar below
 * 560 px), the total at the bar's end, a 1px surface ring between segments, a 4px rounded data end.
 * Rows are keyed, so a new ranking redraws cleanly; the tooltip is pointer-only and text-only (the table
 * view is the keyboard and screen-reader path). Every string goes through `.text()` / `textContent`.
 */
import { scaleLinear, select } from 'd3';
import type { YearTooltip } from './renderYearChart';

export type SrSegment = { key: string; value: number; color: string };
export type SrRow = { key: string; label: string; sublabel?: string; segments: readonly SrSegment[]; valueLabel: string; tooltip?: YearTooltip };
export type SrSpec = { rows: readonly SrRow[] };
export type SrOptions = { width: number; reducedMotion: boolean; tooltip: HTMLElement | null; narrowBelow?: number };
export type SrLayout = { narrow: boolean; height: number; labelW: number; rowH: number; barX: number; barMaxW: number };

const CHAR = 0.58;
const FADE = 350;

export function layoutStackedRows(spec: SrSpec, width: number, narrowBelow = 560): SrLayout {
  const narrow = width < narrowBelow;
  const longest = Math.max(1, ...spec.rows.map((r) => Math.max(r.label.length, (r.sublabel ?? '').length * 0.9)));
  const labelW = narrow ? 0 : Math.min(260, Math.ceil(longest * 13 * CHAR) + 16);
  const valueW = Math.ceil(Math.max(1, ...spec.rows.map((r) => r.valueLabel.length)) * 12 * CHAR) + 14;
  const rowH = narrow ? 46 : spec.rows.some((r) => r.sublabel) ? 38 : 30;
  const barX = labelW;
  return { narrow, height: spec.rows.length * rowH + 8, labelW, rowH, barX, barMaxW: Math.max(40, width - barX - valueW) };
}

export function renderStackedRows(svgEl: SVGSVGElement, spec: SrSpec, options: SrOptions): () => void {
  const { width, reducedMotion, tooltip } = options;
  const L = layoutStackedRows(spec, width, options.narrowBelow);
  const svg = select(svgEl);
  svg.interrupt();
  svg.selectAll('*').remove();
  svg.attr('width', width).attr('height', L.height).attr('viewBox', `0 0 ${width} ${L.height}`);

  const max = Math.max(1, ...spec.rows.map((r) => r.segments.reduce((s, g) => s + Math.max(0, g.value), 0)));
  const x = scaleLinear().domain([0, max]).range([0, L.barMaxW]);
  const barH = L.narrow ? 14 : 16;

  const rows = svg
    .append('g')
    .attr('class', 'sr-rows')
    .selectAll<SVGGElement, SrRow>('g')
    .data(spec.rows, (d) => d.key)
    .join('g')
    .attr('class', 'sr-row')
    .attr('transform', (_, i) => `translate(0,${i * L.rowH})`);

  rows.append('rect').attr('class', 'sr-hit').attr('x', 0).attr('y', 0).attr('width', width).attr('height', L.rowH);
  const barY = (L.narrow ? 26 : (L.rowH - barH) / 2);
  rows
    .append('text')
    .attr('class', 'sr-label')
    .attr('x', L.narrow ? 0 : L.labelW - 12)
    .attr('y', L.narrow ? 14 : barY + barH / 2 + (spec.rows.some((r) => r.sublabel) ? -2 : 4))
    .attr('text-anchor', L.narrow ? 'start' : 'end')
    .text((d) => (L.narrow && d.sublabel ? `${d.label} · ${d.sublabel}` : d.label));
  if (!L.narrow) {
    rows
      .filter((d) => Boolean(d.sublabel))
      .append('text')
      .attr('class', 'sr-sublabel')
      .attr('x', L.labelW - 12)
      .attr('y', barY + barH / 2 + 12)
      .attr('text-anchor', 'end')
      .text((d) => d.sublabel ?? '');
  }

  const bars = rows.append('g').attr('class', 'sr-bar');
  bars.each(function (d) {
    const g = select(this);
    let cum = 0;
    const segs = d.segments.filter((s) => s.value > 0);
    segs.forEach((s, k) => {
      const x0 = L.barX + x(cum);
      const w = x(cum + s.value) - x(cum);
      cum += s.value;
      const last = k === segs.length - 1;
      const path = last && w >= 6 ? hBarPath(x0, barY, w, barH) : `M${x0},${barY}H${x0 + w}V${barY + barH}H${x0}Z`;
      g.append('path').attr('class', 'sr-seg').attr('data-key', s.key).attr('d', path).style('fill', s.color);
    });
    g.append('text')
      .attr('class', 'sr-value')
      .attr('x', L.barX + x(cum) + 6)
      .attr('y', barY + barH / 2 + 4)
      .text(d.valueLabel);
  });

  const hide = (): void => {
    rows.classed('is-hover', false);
    if (tooltip) tooltip.hidden = true;
  };
  rows.on('pointerenter.sr pointermove.sr', function (event: PointerEvent, d) {
    rows.classed('is-hover', (r) => r.key === d.key);
    if (!tooltip || !d.tooltip) return;
    const title = document.createElement('strong');
    title.textContent = d.tooltip.title;
    const lines = d.tooltip.lines.map((l) => {
      const row = document.createElement('div');
      row.className = 'yc-tip-row';
      const name = document.createElement('span');
      if (l.color) {
        const sw = document.createElement('i');
        sw.className = 'swatch';
        sw.style.background = l.color;
        name.append(sw, ' ');
      }
      name.append(l.label);
      const val = document.createElement('b');
      val.textContent = l.value;
      row.append(name, val);
      return row;
    });
    tooltip.replaceChildren(title, ...lines);
    tooltip.hidden = false;
    const box = svgEl.getBoundingClientRect();
    if (box.width === 0) return;
    const tw = tooltip.offsetWidth;
    let left = event.clientX - box.left + 14;
    if (left + tw > box.width) left = Math.max(0, event.clientX - box.left - tw - 14);
    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(event.clientY - box.top + 16)}px`;
  });
  rows.on('pointerleave.sr', hide);

  if (!reducedMotion) bars.style('opacity', 0.15).transition().duration(FADE).style('opacity', 1);

  return () => {
    bars.interrupt();
    rows.on('.sr', null);
    hide();
  };
}

/** A horizontal bar with a 4px rounded data end on the right and a square baseline on the left. */
export function hBarPath(x0: number, y0: number, w: number, h: number): string {
  // The horizontal twin of yearBarPath (renderYearChart): same 4px data end, axes swapped.
  const r = Math.min(4, h / 2, w);
  if (w <= 0) return '';
  return `M${x0},${y0}H${x0 + w - r}Q${x0 + w},${y0} ${x0 + w},${y0 + r}V${y0 + h - r}Q${x0 + w},${y0 + h} ${x0 + w - r},${y0 + h}H${x0}Z`;
}
