// TimeSeries.tsx — React wrapper of the time-series renderer (CHANGED (S3-aa): new): measures the container,
// respects reduced motion and redraws only when the spec or width changes (callers memoize the spec).
import { useEffect, useRef } from 'react';
import { useElementWidth, usePrefersReducedMotion } from './hooks';
import { renderTimeSeries } from './renderTimeSeries';
import type { TsSpec } from './renderTimeSeries';

type Props = {
  spec: TsSpec;
  /** Accessible name of the chart (role="img"). */
  label: string;
};

export function TimeSeries({ spec, label }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0) return;
    return renderTimeSeries(svg, spec, { width, reducedMotion, tooltip: tipRef.current });
  }, [spec, width, reducedMotion]);

  return (
    <div ref={wrapRef} className="chart chart-year chart-ts">
      <svg ref={svgRef} role="img" aria-label={label} className="chart-svg" />
      <div ref={tipRef} className="chart-tip" hidden aria-hidden="true" />
    </div>
  );
}
