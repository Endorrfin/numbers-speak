// palette.ts — chart colours as CSS custom properties (values in theme/tokens.css), so a theme switch
// repaints every chart without a redraw. Colour follows the entity (the region), never its rank.
//
// The region palette is one five-hue set per theme, validated ALL-PAIRS (every region can sit next to
// every other in a ranked list) with the dataviz validator: lightness band, chroma floor, CVD ΔE ≥ 8
// (protan/deutan), normal-vision ΔE ≥ 15, contrast vs the chart surface. Results (2026-09-18):
//   dark  on #171d25 — CVD 11.3 · normal 15.0 · contrast ≥ 3:1 for all five
//   light on #ffffff — CVD 17.1 · normal 17.7 · two hues < 3:1 → relief: value labels + table view
// Being colour-blind-safe by construction, it needs no separate "CVD palette" setting.
import type { Region } from '../lib/regions';

export const REGION_COLOR: Record<Region, string> = {
  asia: 'var(--c-region-asia)',
  africa: 'var(--c-region-africa)',
  americas: 'var(--c-region-americas)',
  oceania: 'var(--c-region-oceania)',
  europe: 'var(--c-region-europe)',
};
