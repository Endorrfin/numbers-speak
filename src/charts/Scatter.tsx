// Scatter.tsx — React wrapper of the scatter renderer (CHANGED (S3-re): new): measures the container, respects
// reduced motion and re-renders only when points or options change (callers memoize both).
import { useEffect, useRef } from 'react';
import { useElementWidth, usePrefersReducedMotion } from './hooks';
import { renderScatter } from './renderScatter';
import type { ScatterAxis, ScatterPoint } from './renderScatter';

type Props = {
  points: readonly ScatterPoint[];
  /** Accessible name of the chart (role="img"). */
  label: string;
  x: ScatterAxis;
  y: ScatterAxis;
  guides?: { x?: number; y?: number };
  quadrants?: readonly [string, string, string, string];
};

export function Scatter({ points, label, x, y, guides, quadrants }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0) return;
    return renderScatter(svg, points, { width, reducedMotion, tooltip: tipRef.current, x, y, guides, quadrants });
  }, [points, width, reducedMotion, x, y, guides, quadrants]);

  return (
    <div ref={wrapRef} className="chart chart-scatter">
      <svg ref={svgRef} role="img" aria-label={label} className="chart-svg" />
      <div ref={tipRef} className="chart-tip" hidden aria-hidden="true" />
    </div>
  );
}
