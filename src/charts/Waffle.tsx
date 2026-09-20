// Waffle.tsx — React wrapper of the unit-grid renderer (CHANGED (S3-tl): new): measures the container,
// respects reduced motion and redraws only when blocks or options change (callers memoize both).
import { useEffect, useRef } from 'react';
import { useElementWidth, usePrefersReducedMotion } from './hooks';
import { renderWaffle } from './renderWaffle';
import type { WaffleBlock, WaffleOptions } from './renderWaffle';

type Props = {
  blocks: readonly WaffleBlock[];
  /** Accessible name of the chart (role="img"). */
  label: string;
} & Pick<WaffleOptions, 'columns' | 'rowLabel' | 'columnTicks'>;

export function Waffle({ blocks, label, columns, rowLabel, columnTicks }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0) return;
    return renderWaffle(svg, blocks, { width, reducedMotion, columns, rowLabel, columnTicks, tooltip: tipRef.current });
  }, [blocks, width, reducedMotion, columns, rowLabel, columnTicks]);

  return (
    <div ref={wrapRef} className="chart chart-waffle">
      <svg ref={svgRef} role="img" aria-label={label} className="chart-svg" />
      <div ref={tipRef} className="chart-tip" hidden aria-hidden="true" />
    </div>
  );
}
