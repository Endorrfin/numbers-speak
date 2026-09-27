// Dumbbell.tsx — React wrapper of the dumbbell renderer (CHANGED (S3-re): new).
import { useEffect, useRef } from 'react';
import { useElementWidth, usePrefersReducedMotion } from './hooks';
import { renderDumbbell } from './renderDumbbell';
import type { DumbbellRow } from './renderDumbbell';

type Props = {
  rows: readonly DumbbellRow[];
  label: string;
  log: boolean;
  domain: [number, number];
  ticks: number[];
  format: (value: number) => string;
};

export function Dumbbell({ rows, label, log, domain, ticks, format }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0) return;
    return renderDumbbell(svg, rows, { width, reducedMotion, tooltip: tipRef.current, log, domain, ticks, format });
  }, [rows, width, reducedMotion, log, domain, ticks, format]);

  return (
    <div ref={wrapRef} className="chart chart-dumbbell">
      <svg ref={svgRef} role="img" aria-label={label} className="chart-svg" />
      <div ref={tipRef} className="chart-tip" hidden aria-hidden="true" />
    </div>
  );
}
