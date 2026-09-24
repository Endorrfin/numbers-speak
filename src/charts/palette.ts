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

// CHANGED (S3-bd): births vs deaths — a cool/warm pair (values and validation in theme/tokens.css).
// Text never wears these colours; they mark lines, bars, swatches and tinted areas only.
export const DEMO_COLOR = {
  births: 'var(--c-birth)',
  deaths: 'var(--c-death)',
  birthsSoft: 'var(--c-birth-soft)',
  deathsSoft: 'var(--c-death-soft)',
} as const;

// CHANGED (S3-tl): time of life — one hue per group (needs · duties · free), a neutral for "other";
// activities inside a group alternate full and lighter tone (values and validation in theme/tokens.css).
export const LIFE_COLOR = {
  needs: 'var(--c-life-needs)',
  duties: 'var(--c-life-duties)',
  free: 'var(--c-life-free)',
  other: 'var(--c-life-other)',
  women: 'var(--c-women)',
  men: 'var(--c-men)',
} as const;

// CHANGED (S3-br): brand sector groups (global-brands-race) — five validated hues + one neutral, all-pairs
// checked in both themes (values and results in theme/tokens.css). Colour follows the group, never the rank.
export const SECTOR_COLOR = {
  tech: 'var(--c-sector-tech)',
  auto: 'var(--c-sector-auto)',
  finance: 'var(--c-sector-finance)',
  consumer: 'var(--c-sector-consumer)',
  fashion: 'var(--c-sector-fashion)',
  industry: 'var(--c-sector-industry)',
} as const;

// CHANGED (S3-aa): air attacks — interception status (timeline), weapon classes, civilian-harm context
// (values and validation notes in theme/tokens.css). Colour follows the class or the status, never the rank.
// CHANGED (S3-cd): contribution/volunteering — donations & volunteers-growth reuse the five S2 region hues
// (validated all-pairs) as a generic single "primary" line colour plus a four-way year/series set for the
// seasonal-overlay angle (2022..2025+), rather than a new hue set (values in theme/tokens.css).
export const SERIES_COLOR = {
  primary: 'var(--c-series-primary)',
  s1: 'var(--c-series-1)',
  s2: 'var(--c-series-2)',
  s3: 'var(--c-series-3)',
  s4: 'var(--c-series-4)',
} as const;

export const AIR_COLOR = {
  down: 'var(--c-air-down)',
  through: 'var(--c-air-through)',
  cruise: 'var(--c-air-cruise)',
  ballistic: 'var(--c-air-ballistic)',
  antiship: 'var(--c-air-antiship)',
  other: 'var(--c-air-other)',
  mixed: 'var(--c-air-mixed)',
  drones: 'var(--c-air-drones)',
  harmShort: 'var(--c-harm-short)',
  harmOther: 'var(--c-harm-other)',
} as const;

// CHANGED (S3-aa3): calendar heatmap — one-hue sequential ramp for daily intensity, validated with the
// dataviz skill's ordinal check (monotone L, adjacent ΔL ≥ 0.06, light-end contrast ≥ 2:1, single hue —
// not the categorical six, which does not apply to a magnitude ramp; values and results in tokens.css).
// Index 0 = no data / zero (the existing --s2 token); the top step reuses --c-air-through (same hue:
// "not intercepted"), so the ramp reads as "this hue = attack intensity" across the whole page.
export const HEAT_COLOR = ['var(--c-heat-0)', 'var(--c-heat-1)', 'var(--c-heat-2)', 'var(--c-heat-3)', 'var(--c-heat-4)'] as const;
