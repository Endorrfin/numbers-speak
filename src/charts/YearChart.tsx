// YearChart.tsx — React wrapper of the year chart renderer: measures the container, respects reduced
// motion and redraws only when the spec or width changes (callers memoize the spec).
import { useEffect, useRef } from 'react';
import { useElementWidth, usePrefersReducedMotion } from './hooks';
import { renderYearChart } from './renderYearChart';
import type { YearChartSpec } from './renderYearChart';

type Props = {
  spec: YearChartSpec;
  /** Accessible name of the chart (role="img"). */
  label: string;
};

export function YearChart({ spec, label }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0) return;
    return renderYearChart(svg, spec, { width, reducedMotion, tooltip: tipRef.current });
  }, [spec, width, reducedMotion]);

  return (
    <div ref={wrapRef} className="chart chart-year">
      <svg ref={svgRef} role="img" aria-label={label} className="chart-svg" />
      <div ref={tipRef} className="chart-tip" hidden aria-hidden="true" />
    </div>
  );
}
