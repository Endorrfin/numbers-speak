// donations — wartime giving, Feb 2022 – Nov 2025: monobank timeline + seasonal angles, funds & aid
// logistics reference tables (S3-cd).
import { useCallback, useId, useMemo } from 'react';
import { TimeSeries } from '../../charts/TimeSeries';
import { YearChart } from '../../charts/YearChart';
import { SERIES_COLOR } from '../../charts/palette';
import type { Lang, VizBodyProps } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { formatNumber } from '../../lib/format';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { DATA_FILE, FUND_IDS, FUND_NAME, parseDonations } from './data';
import type { DonationsDataset, MonthRow } from './data';
import { buildSeasonalSpec, buildTimelineSpec, chartLabel, monthLabel } from './specs';
import { SHOWS, parseDonState, toDonParams } from './state';
import type { DonState, Show } from './state';

const DATA_URL = dataUrl('donations', DATA_FILE);
const parse = (json: unknown): DonationsDataset => parseDonations(json);

const SHOW_LABEL: Record<Show, { en: string; uk: string }> = {
  timeline: { en: 'Timeline', uk: 'Хронологія' },
  seasonal: { en: 'By month, year over year', uk: 'За місяцями, за роками' },
};

const txt = {
  headline: { en: 'Key numbers', uk: 'Головні числа' },
  kpiLatest: { en: 'bn UAH, {month} {year}', uk: 'млрд грн, {month} {year}' },
  kpiTotal: { en: 'total raised since Feb 2022', uk: 'зібрано від лютого 2022' },
  kpiPeak: { en: 'peak month — {month} {year}', uk: 'піковий місяць — {month} {year}' },
  kpiPace: { en: 'bn UAH / month, 2024 → 2025', uk: 'млрд грн/міс., 2024 → 2025' },
  angle: { en: 'Angle', uk: 'Погляд' },
  seasonalNote: {
    en: '2022 (starts in February) and 2025 (through November) are not complete years, so they stay off this comparison — see the timeline for their months.',
    uk: '2022-й (починається з лютого) і 2025-й (по листопад) — не повні роки, тож їх немає в цьому порівнянні — їхні місяці на хронології.',
  },
  tableCaption: {
    en: 'Raised via monobank, by month, 2022–2025',
    uk: 'Зібрано через monobank, за місяцями, 2022–2025',
  },
  month: { en: 'Month', uk: 'Місяць' },
  amount: { en: 'bn UAH', uk: 'млрд грн' },
  fundsTitle: { en: 'Three major funds, annual totals', uk: 'Три великі фонди, річні суми' },
  fundsCaption: { en: 'Funds raised, billion UAH', uk: 'Зібрані кошти, млрд грн' },
  fund: { en: 'Fund', uk: 'Фонд' },
  total: { en: 'Total', uk: 'Разом' },
  yearPartial: { en: '{year} ({months} mo.)', uk: '{year} ({months} міс.)' },
  aidTitle: { en: 'Nova Poshta humanitarian logistics', uk: 'Гуманітарна логістика «Нової пошти»' },
  aidCaption: { en: 'Parcels carried and their weight, by year', uk: 'Перевезені посилки та їх вага, за роками' },
  year: { en: 'Year', uk: 'Рік' },
  parcels: { en: 'Parcels', uk: 'Посилок' },
  tonnes: { en: 'Tonnes', uk: 'Тонн' },
  legacyNote: {
    en: 'For context only, not plotted: this page used to track the average number of people donating monthly. That series is discontinued after {month} {year} ({count} people that month) and can’t be extended — see the data notes.',
    uk: 'Лише для контексту, не на графіку: раніше ця сторінка відстежувала середню кількість людей, що донатять щомісяця. Цей ряд припинено оновлювати після {month} {year} ({count} осіб того місяця), і продовжити його нема звідки — див. примітки до даних.',
  },
} as const;

export default function Donations({ params, setParams }: VizBodyProps) {
  const { t } = useLang();
  const state = useDataset(DATA_URL, parse);
  const settings = useMemo(() => parseDonState(params), [params]);
  const update = useCallback(
    (patch: Partial<DonState>) => setParams(toDonParams({ ...settings, ...patch })),
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
  return <DonationsView dataset={state.data} settings={settings} update={update} />;
}

function avg(rows: readonly MonthRow[], year: number): number | null {
  const yr = rows.filter((r) => r.year === year);
  if (yr.length === 0) return null;
  const sum = yr.reduce((s, r) => s + r.amount, 0);
  return Math.round((sum / yr.length) * 100) / 100;
}

function DonationsView({
  dataset,
  settings,
  update,
}: {
  dataset: DonationsDataset;
  settings: DonState;
  update: (patch: Partial<DonState>) => void;
}) {
  const { t, lang } = useLang();
  const base = useId();
  const rows = dataset.monthly;
  const last = rows[rows.length - 1]!;
  const totalRaised = Math.round(rows.reduce((s, r) => s + r.amount, 0) * 100) / 100;
  const peak = rows.reduce((m, r) => (r.amount > m.amount ? r : m), rows[0]!);
  const avg2024 = avg(rows, 2024);
  const avg2025 = avg(rows, 2025);

  const timelineSpec = useMemo(() => buildTimelineSpec(rows, lang), [rows, lang]);
  const seasonalSpec = useMemo(() => buildSeasonalSpec(rows, lang), [rows, lang]);
  const label = chartLabel(settings.show, lang);

  return (
    <div className="viz-body">
      <ul className="kpi-row" aria-label={t(txt.headline)}>
        <li className="kpi">
          <span className="kpi-value">{formatNumber(last.amount, lang)}</span>
          <span className="kpi-label">
            {fill(t(txt.kpiLatest), { month: monthLabel(last.month, lang), year: last.year })}
          </span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{formatNumber(totalRaised, lang)}</span>
          <span className="kpi-label">{t(txt.kpiTotal)}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{formatNumber(peak.amount, lang)}</span>
          <span className="kpi-label">
            {fill(t(txt.kpiPeak), { month: monthLabel(peak.month, lang), year: peak.year })}
          </span>
        </li>
        <li className="kpi">
          <span className="kpi-value">
            {avg2024 !== null ? formatNumber(avg2024, lang) : '—'} →{' '}
            {avg2025 !== null ? formatNumber(avg2025, lang) : '—'}
          </span>
          <span className="kpi-label">{t(txt.kpiPace)}</span>
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
              <ChartKey years={[...new Set(rows.map((r) => r.year))].filter((y) => y !== 2022 && y !== 2025)} />
              <p className="notice">{t(txt.seasonalNote)}</p>
            </>
          )}
        </>
      ) : (
        <DonationsTable rows={rows} lang={lang} />
      )}

      <h3>{t(txt.fundsTitle)}</h3>
      <FundsTable dataset={dataset} lang={lang} />

      <h3>{t(txt.aidTitle)}</h3>
      <AidTable aid={dataset.aid} lang={lang} />

      <p className="notice">
        {fill(t(txt.legacyNote), {
          month: monthLabel(dataset.legacyDonors.month, lang),
          year: dataset.legacyDonors.year,
          count: formatNumber(dataset.legacyDonors.count, lang),
        })}
      </p>
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

function DonationsTable({ rows, lang }: { rows: readonly MonthRow[]; lang: Lang }) {
  const { t } = useLang();
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{t(txt.tableCaption)}</caption>
        <thead>
          <tr>
            <th scope="col">{t(txt.month)}</th>
            <th scope="col" className="num">
              {t(txt.amount)}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.year}-${r.month}`}>
              <th scope="row">
                {monthLabel(r.month, lang)} {r.year}
              </th>
              <td className="num">{formatNumber(r.amount, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FundsTable({ dataset, lang }: { dataset: DonationsDataset; lang: Lang }) {
  const { t } = useLang();
  const years = ['2022', '2023', '2024', String(dataset.fundsPartialYear)];
  const byId = new Map(dataset.funds.map((f) => [f.id, f]));
  const totals = years.map((y) => dataset.funds.reduce((s, f) => s + (f.byYear[y] ?? 0), 0));
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{t(txt.fundsCaption)}</caption>
        <thead>
          <tr>
            <th scope="col">{t(txt.fund)}</th>
            {years.map((y, i) => (
              <th scope="col" className="num" key={y}>
                {i === years.length - 1
                  ? fill(t(txt.yearPartial), { year: y, months: dataset.fundsPartialMonths })
                  : y}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FUND_IDS.map((id) => {
            const f = byId.get(id);
            return (
              <tr key={id}>
                <th scope="row">{t(FUND_NAME[id])}</th>
                {years.map((y) => (
                  <td className="num" key={y}>
                    {formatNumber(f?.byYear[y] ?? 0, lang)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">{t(txt.total)}</th>
            {totals.map((v, i) => (
              <td className="num" key={years[i]}>
                {formatNumber(v, lang)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function AidTable({ aid, lang }: { aid: DonationsDataset['aid']; lang: Lang }) {
  const { t } = useLang();
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{t(txt.aidCaption)}</caption>
        <thead>
          <tr>
            <th scope="col">{t(txt.year)}</th>
            <th scope="col" className="num">
              {t(txt.parcels)}
            </th>
            <th scope="col" className="num">
              {t(txt.tonnes)}
            </th>
          </tr>
        </thead>
        <tbody>
          {aid.map((a) => (
            <tr key={a.year}>
              <th scope="row">{a.year}</th>
              <td className="num">{formatNumber(a.parcels, lang)}</td>
              <td className="num">{formatNumber(a.tonnes, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
