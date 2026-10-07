// common.tsx — CHANGED (S3-el): pieces the seven angles share — props, loading / error state, the ranking frame of the
// four country rankings (region filter, Pager, Ukraine in focus, status line, region legend), the fuel legend and the
// notes on dated rows and on Ukraine's missing years.
import { useId } from 'react';
import type { ReactNode } from 'react';
import { POWER_COLOR, REGION_COLOR } from '../../charts/palette';
import { CountryFocus } from '../../components/viz/CountryFocus';
import { Pager } from '../../components/viz/Pager';
import { useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { countryName } from '../../lib/countries';
import { formatDate } from '../../lib/format';
import { REGIONS, REGION_LABELS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { GROUPS } from './data';
import type { Ranked, RankingView } from './ranking';
import { PAGE_SIZE } from './state';
import type { ElectricityState } from './state';
import { GROUP_TEXT, txt } from './text';

export type AngleProps = { settings: ElectricityState; update: (patch: Partial<ElectricityState>) => void };

/** Loading and error states shared by the angles (the same markup as the other entries). */
export function DataState({ status, retry }: { status: 'loading' | 'error'; retry?: () => void }) {
  const { t } = useLang();
  if (status === 'loading') return <p className="muted stage-loading">{t(ui.loading)}</p>;
  return (
    <div className="notice notice-warn load-error" role="alert">
      <p>{t(ui.dataLoadError)}</p>
      <button type="button" className="btn btn-ghost" onClick={retry}>
        {t(ui.retry)}
      </button>
    </div>
  );
}

type FrameProps<T extends Ranked> = AngleProps & {
  ranked: readonly T[];
  view: RankingView<T>;
  /** The angle's own measure / order switch (a field). */
  measure: ReactNode;
  /** Text after the range in the status line. */
  summary: string;
  chart: ReactNode;
  table: ReactNode;
  /** Text after a highlighted country's Finder button (the value). */
  detail: (row: T) => string;
};

/** Controls, Finder, status line, chart or table, region legend — the frame of every country ranking. */
export function RankingFrame<T extends Ranked>({ settings, update, ranked, view, measure, summary, chart, table, detail }: FrameProps<T>) {
  const { t } = useLang();
  const base = useId();
  return (
    <>
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        {measure}
        <div className="field">
          <label htmlFor={`${base}-region`}>{t(ui.region)}</label>
          <select id={`${base}-region`} value={settings.region} onChange={(e) => update({ region: e.target.value as Region | 'all', page: 1 })}>
            <option value="all">{t(ui.allRegions)}</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {t(REGION_LABELS[r])}
              </option>
            ))}
          </select>
        </div>
        {settings.view === 'chart' && <Pager id={`${base}-page`} page={view.page} size={PAGE_SIZE} onPage={(p) => update({ page: p })} />}
      </div>

      <CountryFocus
        codes={view.focus}
        all={ranked}
        filtered={view.filtered}
        region={settings.region}
        size={PAGE_SIZE}
        rankOf={(r) => r.rank}
        detail={detail}
        onFocus={(f) => update({ focus: f })}
        onJump={(to) => update({ ...to, view: 'chart' })}
      />

      <p className="viz-status" aria-live="polite">
        {settings.view === 'chart'
          ? fill(t(ui.showingRange), { from: view.page.from, to: view.page.to, total: view.page.total })
          : fill(t(ui.showingAll), { total: view.filtered.length })}
        {summary && ` · ${summary}`}
      </p>

      {settings.view === 'chart' ? chart : table}

      <RegionLegend region={settings.region} onRegion={(r) => update({ region: r, page: 1 })} />
    </>
  );
}

export function RegionLegend({ region, onRegion }: { region: Region | 'all'; onRegion: (r: Region | 'all') => void }) {
  const { t } = useLang();
  return (
    <ul className="legend" aria-label={t(ui.legend)}>
      {REGIONS.map((r) => {
        const on = region === r;
        return (
          <li key={r}>
            <button type="button" className="legend-item" aria-pressed={on} onClick={() => onRegion(on ? 'all' : r)}>
              <span className="swatch" style={{ background: REGION_COLOR[r] }} aria-hidden="true" />
              {t(REGION_LABELS[r])}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** The six fuel groups (static: colour → name). */
export function FuelLegend() {
  const { t } = useLang();
  return (
    <ul className="legend" aria-label={t(ui.legend)}>
      {GROUPS.map((g) => (
        <li key={g}>
          <span className="legend-item">
            <span className="swatch" style={{ background: POWER_COLOR[g] }} aria-hidden="true" />
            {t(GROUP_TEXT[g].name)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Names the dated rows among `rows` (“Ukraine 2022, Réunion 2023”), or nothing when there are none. */
export function DatedNote({ rows, rankYear }: { rows: readonly Ranked[]; rankYear: number }) {
  const { t, lang } = useLang();
  const dated = rows.filter((r) => r.dated);
  if (!dated.length) return null;
  const years = dated.map((r) => `${countryName(r.code, lang)} ${r.year}`).join(', ');
  return <p className="chart-note muted">{fill(t(txt.dated), { years, rankYear })}</p>;
}

/** Why Ukraine's figures stop in 2022 — on every angle where Ukraine appears with its 2022 value. */
export function UkraineGap() {
  const { t } = useLang();
  return (
    <div className="notice">
      <p>
        <strong>{t(txt.ukraineGapTitle)}.</strong> {t(txt.ukraineGap)}
      </p>
    </div>
  );
}

export function Credit({ date }: { date: string }) {
  const { t, lang } = useLang();
  return <p className="chart-note muted">{fill(t(txt.credit), { date: formatDate(date, lang) })}</p>;
}
