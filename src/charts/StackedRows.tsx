// StackedRows.tsx — React wrapper of the stacked-rows renderer (CHANGED (S3-aa): new).
import { useEffect, useRef } from 'react';
import { useElementWidth, usePrefersReducedMotion } from './hooks';
import { renderStackedRows } from './renderStackedRows';
import type { SrSpec } from './renderStackedRows';

type Props = { spec: SrSpec; label: string };

export function StackedRows({ spec, label }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0) return;
    return renderStackedRows(svg, spec, { width, reducedMotion, tooltip: tipRef.current });
  }, [spec, width, reducedMotion]);

  return (
    <div ref={wrapRef} className="chart chart-year chart-rows">
      <svg ref={svgRef} role="img" aria-label={label} className="chart-svg" />
      <div ref={tipRef} className="chart-tip" hidden aria-hidden="true" />
    </div>
  );
}
