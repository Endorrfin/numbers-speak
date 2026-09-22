// volunteers-growth — registered volunteers, Jan 2022 – Nov 2025: timeline + seasonal angles (S3-cd).
import { useCallback, useId, useMemo } from 'react';
import { TimeSeries } from '../../charts/TimeSeries';
import { YearChart } from '../../charts/YearChart';
import { SERIES_COLOR } from '../../charts/palette';
import type { Lang, VizBodyProps } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { formatMultiple, formatNumber } from '../../lib/format';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { DATA_FILE, parseVolunteers } from './data';
import type { MonthRow, VolunteersDataset } from './data';
import { buildSeasonalSpec, buildTimelineSpec, chartLabel, monthLabel } from './specs';
import { SHOWS, parseVgState, toVgParams } from './state';
import type { Show, VgState } from './state';

const DATA_URL = dataUrl('volunteers-growth', DATA_FILE);
const parse = (json: unknown): VolunteersDataset => parseVolunteers(json);

const SHOW_LABEL: Record<Show, { en: string; uk: string }> = {
  timeline: { en: 'Timeline', uk: 'Хронологія' },
  seasonal: { en: 'By month, year over year', uk: 'За місяцями, за роками' },
};

const txt = {
  headline: { en: 'Key numbers', uk: 'Головні числа' },
  kpiLatest: { en: 'volunteers, {month} {year}', uk: 'волонтерів, {month} {year}' },
  kpiMultiple: { en: 'since Jan 2022', uk: 'від січня 2022' },
  kpiSpike: { en: 'added in December 2022 alone', uk: 'додано лише за грудень 2022' },
  kpiSpikeLabel: { en: '69% of that year’s registrations', uk: '69% реєстрацій того року' },
  kpiPace2024: { en: 'new volunteers / month, 2024', uk: 'нових волонтерів/міс., 2024' },
  kpiPace2025: { en: 'new volunteers / month, 2025', uk: 'нових волонтерів/міс., 2025' },
  angle: { en: 'Angle', uk: 'Погляд' },
  seasonalNote: {
    en: '2025 is not a complete year yet, so it stays off this comparison — see the timeline for its months.',
    uk: '2025-й ще не завершено, тож його немає в цьому порівнянні — його місяці на хронології.',
  },
  tableCaption: { en: 'Registered volunteers by month, 2022–2025', uk: 'Волонтери за місяцями, 2022–2025' },
  month: { en: 'Month', uk: 'Місяць' },
  count: { en: 'Volunteers', uk: 'Волонтерів' },
} as const;

export default function VolunteersGrowth({ params, setParams }: VizBodyProps) {
  const { t } = useLang();
  const state = useDataset(DATA_URL, parse);
  const settings = useMemo(() => parseVgState(params), [params]);
  const update = useCallback(
    (patch: Partial<VgState>) => setParams(toVgParams({ ...settings, ...patch })),
    [settings, setParams],
  );

  if (state.status === 'loading') return <p className="muted stage-loading">{t(ui.loading)}</p>;
  if (state.status === 'error') {
    return (
      <div className="notice notice-warn load-error" role="alert">
        <p>{t(ui.dataLoadError)}</p>
        <button type="button" className="btn btn-ghost" onClick={state.retry}>
          {t(ui.retry)}
        </button>
      </div>
    );
  }
  return <GrowthView dataset={state.data} settings={settings} update={update} />;
}

function pace(rows: readonly MonthRow[], year: number): number | null {
  const yr = rows.filter((r) => r.year === year);
  if (yr.length < 2) return null;
  return (yr[yr.length - 1]!.count - yr[0]!.count) / (yr.length - 1);
}

function GrowthView({
  dataset,
  settings,
  update,
}: {
  dataset: VolunteersDataset;
  settings: VgState;
  update: (patch: Partial<VgState>) => void;
}) {
  const { t, lang } = useLang();
  const base = useId();
  const rows = dataset.rows;
  const first = rows[0]!;
  const last = rows[rows.length - 1]!;
  const dec2022 = rows.find((r) => r.year === 2022 && r.month === 12);
  const nov2022 = rows.find((r) => r.year === 2022 && r.month === 11);
  const spike = dec2022 && nov2022 ? dec2022.count - nov2022.count : 0;
  const pace2024 = pace(rows, 2024);
  const pace2025 = pace(rows, 2025);

  const timelineSpec = useMemo(() => buildTimelineSpec(rows, lang), [rows, lang]);
  const seasonalSpec = useMemo(() => buildSeasonalSpec(rows, lang), [rows, lang]);
  const label = chartLabel(settings.show, lang);

  return (
    <div className="viz-body">
      <ul className="kpi-row" aria-label={t(txt.headline)}>
        <li className="kpi">
          <span className="kpi-value">{formatNumber(last.count, lang)}</span>
          <span className="kpi-label">
            {fill(t(txt.kpiLatest), { month: monthLabel(last.month, lang), year: last.year })}
          </span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{formatMultiple(last.count / first.count, lang)}</span>
          <span className="kpi-label">{t(txt.kpiMultiple)}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">+{formatNumber(spike, lang)}</span>
          <span className="kpi-label">
            {t(txt.kpiSpike)} · {t(txt.kpiSpikeLabel)}
          </span>
        </li>
        <li className="kpi">
          <span className="kpi-value">
            +{pace2024 ? Math.round(pace2024) : '—'} → +{pace2025 ? Math.round(pace2025) : '—'}
          </span>
          <span className="kpi-label">
            {t(txt.kpiPace2024)} → {t(txt.kpiPace2025)}
          </span>
        </li>
      </ul>

      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <div className="field field-subtabs">
          <span className="field-label" id={`${base}-show`}>
            {t(txt.angle)}
          </span>
          <div className="subtabs" role="radiogroup" aria-labelledby={`${base}-show`}>
            {SHOWS.map((s) => (
              <label key={s} className={settings.show === s ? 'is-on' : undefined}>
                <input
                  type="radio"
                  name={`${base}-show`}
                  value={s}
                  checked={settings.show === s}
                  onChange={() => update({ show: s })}
                />
                {t(SHOW_LABEL[s])}
              </label>
            ))}
          </div>
        </div>
        <div className="field field-auto">
          <span className="field-label" id={`${base}-view`}>
            {t(ui.view)}
          </span>
          <div className="segmented" role="radiogroup" aria-labelledby={`${base}-view`}>
            {(['chart', 'table'] as const).map((v) => (
              <label key={v} className={settings.view === v ? 'is-on' : undefined}>
                <input
                  type="radio"
                  name={`${base}-view`}
                  value={v}
                  checked={settings.view === v}
                  onChange={() => update({ view: v })}
                />
                {t(v === 'chart' ? ui.viewChart : ui.viewTable)}
              </label>
            ))}
          </div>
        </div>
      </div>

      {settings.view === 'chart' ? (
        <>
          {settings.show === 'timeline' ? (
            <TimeSeries spec={timelineSpec} label={label} />
          ) : (
            <>
              <YearChart spec={seasonalSpec} label={label} />
              <ChartKey years={[...new Set(rows.map((r) => r.year))].filter((y) => y !== 2025)} />
              <p className="notice">{t(txt.seasonalNote)}</p>
            </>
          )}
        </>
      ) : (
        <GrowthTable rows={rows} lang={lang} />
      )}
    </div>
  );
}

function ChartKey({ years }: { years: number[] }) {
  const { t } = useLang();
  const colors = [SERIES_COLOR.s1, SERIES_COLOR.s2, SERIES_COLOR.s3, SERIES_COLOR.s4];
  return (
    <ul className="key-list" aria-label={t(ui.legend)}>
      {years.map((y, i) => (
        <li key={y}>
          <span className="key-line" style={{ background: colors[i % 4] }} aria-hidden="true" />
          {y}
        </li>
      ))}
    </ul>
  );
}

function GrowthTable({ rows, lang }: { rows: readonly MonthRow[]; lang: Lang }) {
  const { t } = useLang();
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{t(txt.tableCaption)}</caption>
        <thead>
          <tr>
            <th scope="col">{t(txt.month)}</th>
            <th scope="col" className="num">
              {t(txt.count)}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.year}-${r.month}`}>
              <th scope="row">
                {monthLabel(r.month, lang)} {r.year}
              </th>
              <td className="num">{formatNumber(r.count, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
