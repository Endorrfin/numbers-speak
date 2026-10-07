// ranking.ts — CHANGED (S3-el): the region filter, paging and highlight of a country ranking (a hook, kept apart from
// common.tsx so that file exports components only), and the “*” of a value from an earlier year.
import { useMemo } from 'react';
import { useLang } from '../../i18n/lang';
import { ui } from '../../i18n/ui';
import { resolveFocus } from '../../lib/focus';
import { paginate } from '../../lib/paginate';
import type { Page } from '../../lib/paginate';
import { REGION_LABELS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { PAGE_SIZE } from './state';
import type { ElectricityState } from './state';

export type Ranked = { code: string; region: Region; rank: number; year: number; dated: boolean };

export type RankingView<T extends Ranked> = {
  /** Rows of the active region, in chart order. */
  filtered: T[];
  page: Page<T>;
  /** Highlighted codes and the first highlighted row of the whole ranking. */
  focus: string[];
  hi: ReadonlySet<string>;
  home: T | undefined;
  regionName: string;
};

/** Region filter, paging and the highlight of one ranking (every angle that ranks countries uses it). */
export function useRanking<T extends Ranked>(ranked: readonly T[], settings: ElectricityState): RankingView<T> {
  const { t } = useLang();
  const filtered = useMemo(() => (settings.region === 'all' ? [...ranked] : ranked.filter((r) => r.region === settings.region)), [ranked, settings.region]);
  const page = useMemo(() => paginate(filtered, settings.page, PAGE_SIZE), [filtered, settings.page]);
  const focus = useMemo(() => resolveFocus(settings.focus, (c) => ranked.some((r) => r.code === c)), [settings.focus, ranked]);
  const hi = useMemo(() => new Set(focus), [focus]);
  return {
    filtered,
    page,
    focus,
    hi,
    home: ranked.find((r) => hi.has(r.code)),
    regionName: settings.region === 'all' ? t(ui.allRegions) : t(REGION_LABELS[settings.region]),
  };
}

/** “*” after a value from an earlier year. */
export const star = (r: { dated: boolean }): string => (r.dated ? '*' : '');
