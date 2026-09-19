// Butterfly.tsx — React wrapper of the butterfly renderer (CHANGED (S3-bdd): new): measures the container,
// respects reduced motion and re-renders only when rows or options change (callers memoize both).
import { useEffect, useRef } from 'react';
import { useElementWidth, usePrefersReducedMotion } from './hooks';
import { renderButterfly } from './renderButterfly';
import type { ButterflyRow } from './renderButterfly';

type Props = {
  rows: readonly ButterflyRow[];
  /** Accessible name of the chart (role="img"). */
  label: string;
  tickFormat: (value: number) => string;
  leftColor: string;
  rightColor: string;
  leftTitle: string;
  rightTitle: string;
};

export function Butterfly({ rows, label, tickFormat, leftColor, rightColor, leftTitle, rightTitle }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0) return;
    return renderButterfly(svg, rows, {
      width,
      reducedMotion,
      tickFormat,
      leftColor,
      rightColor,
      leftTitle,
      rightTitle,
      tooltip: tipRef.current,
    });
  }, [rows, width, reducedMotion, tickFormat, leftColor, rightColor, leftTitle, rightTitle]);

  return (
    <div ref={wrapRef} className="chart chart-butterfly">
      <svg ref={svgRef} role="img" aria-label={label} className="chart-svg" />
      <div ref={tipRef} className="chart-tip" hidden aria-hidden="true" />
    </div>
  );
}
