// regions.ts — the fixed region enum shared by every dataset (CLAUDE.md §4 data rules).
// Continents after UN M49; prep scripts derive a row's region from its ISO code (data-raw/_shared/m49.ts).
import type { Localized } from '../catalog/types';

export const REGIONS = ['africa', 'americas', 'asia', 'europe', 'oceania'] as const;
export type Region = (typeof REGIONS)[number];

export const isRegion = (v: unknown): v is Region => typeof v === 'string' && (REGIONS as readonly string[]).includes(v);

export const REGION_LABELS: Record<Region, Localized> = {
  africa: { en: 'Africa', uk: 'Африка' },
  americas: { en: 'Americas', uk: 'Америка' },
  asia: { en: 'Asia', uk: 'Азія' },
  europe: { en: 'Europe', uk: 'Європа' },
  oceania: { en: 'Oceania', uk: 'Океанія' },
};
