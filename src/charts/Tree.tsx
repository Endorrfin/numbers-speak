// Tree.tsx — React wrapper of the tree renderer (CHANGED (S3-ai2): new): measures the container and redraws when the
// forest changes (callers memoize it).
import { useEffect, useRef } from 'react';
import { useElementWidth } from './hooks';
import { renderTree } from './renderTree';
import type { TreeDatum } from './renderTree';

type Props = {
  roots: readonly TreeDatum[];
  /** Accessible name of the chart (role="img"). */
  label: string;
};

export function Tree({ roots, label }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const width = useElementWidth(wrapRef);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0) return;
    return renderTree(svg, roots, { width });
  }, [roots, width]);

  return (
    <div ref={wrapRef} className="chart chart-tree">
      <svg ref={svgRef} role="img" aria-label={label} className="chart-svg" />
    </div>
  );
}
