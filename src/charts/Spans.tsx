// Spans.tsx — React wrapper of the spans renderer (CHANGED (S3-ai2): new): measures the container and redraws when
// the rows or the axis change (callers memoize them).
import { useEffect, useRef } from 'react';
import { useElementWidth } from './hooks';
import { renderSpans } from './renderSpans';
import type { SpanRow, SpansOptions } from './renderSpans';

type Props = {
  rows: readonly SpanRow[];
  /** Accessible name of the chart (role="img"). */
  label: string;
  domain: [number, number];
  formatTick: (t: number) => string;
  totalMax: number;
  marker?: SpansOptions['marker'];
};

export function Spans({ rows, label, domain, formatTick, totalMax, marker }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);
  const [d0, d1] = domain;
  const mt = marker?.t;
  const ml = marker?.label;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0) return;
    const m = mt !== undefined && ml !== undefined ? { t: mt, label: ml } : undefined;
    return renderSpans(svg, rows, { width, tooltip: tipRef.current, domain: [d0, d1], formatTick, totalMax, marker: m });
  }, [rows, width, d0, d1, formatTick, totalMax, mt, ml]);

  return (
    <div ref={wrapRef} className="chart chart-spans">
      <svg ref={svgRef} role="img" aria-label={label} className="chart-svg" />
      <div ref={tipRef} className="chart-tip" hidden aria-hidden="true" />
    </div>
  );
}
