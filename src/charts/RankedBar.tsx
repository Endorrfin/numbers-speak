// RankedBar.tsx — React wrapper of the ranked bar renderer: measures the container, respects
// reduced motion and re-renders only when rows or options change (callers memoize both).
import { useEffect, useRef } from 'react';
import { useElementWidth, usePrefersReducedMotion } from './hooks';
import { renderRankedBar } from './renderRankedBar';
import type { RankedBarRow } from './renderRankedBar';

type Props = {
  rows: readonly RankedBarRow[];
  /** Accessible name of the chart (role="img"). */
  label: string;
  tickFormat: (value: number) => string;
  // CHANGED (S3-fx): opt-in baseline (the scale's floor, from the entry's data) + axis title; default 0 / none.
  baseline?: number;
  axisLabel?: string;
};

export function RankedBar({ rows, label, tickFormat, baseline, axisLabel }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0) return;
    return renderRankedBar(svg, rows, { width, reducedMotion, tickFormat, tooltip: tipRef.current, baseline, axisLabel });
  }, [rows, width, reducedMotion, tickFormat, baseline, axisLabel]);

  return (
    <div ref={wrapRef} className="chart chart-ranked-bar">
      <svg ref={svgRef} role="img" aria-label={label} className="chart-svg" />
      <div ref={tipRef} className="chart-tip" hidden aria-hidden="true" />
    </div>
  );
}
