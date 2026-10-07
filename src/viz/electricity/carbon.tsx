// carbon.tsx — CHANGED (S3-el): angle E, grams of CO2 per kWh generated, 2024 (Ember's power-sector CO2 intensity),
// cleanest or dirtiest first; bars wear the region, the tooltip names the two largest sources. Ukraine in focus.
import { useCallback, useId, useMemo } from 'react';
import { RankedBar } from '../../charts/RankedBar';
import type { RankedBarRow } from '../../charts/renderRankedBar';
import { REGION_COLOR } from '../../charts/palette';
import { focusText } from '../../components/viz/focusText';
import { useLang } from '../../i18n/lang';
import type { Lang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { countryName, flagUrl } from '../../lib/countries';
import { HOME_CODE } from '../../lib/focus';
import { formatGramsPerKwh, formatNumber, formatShare, formatTwh } from '../../lib/format';
import { REGION_LABELS } from '../../lib/regions';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { Credit, DataState, DatedNote, RankingFrame, UkraineGap } from './common';
import { star, useRanking } from './ranking';
import type { AngleProps } from './common';
import { CARBON_ORDERS, FILES, GROUPS, parseCountries, rankCarbon } from './data';
import type { CountriesDataset, RankedCountry } from './data';
import { carbonOrder } from './state';
import { GROUP_TEXT, txt as shared } from './text';

type L = { en: string; uk: string };
type T = (v: L) => string;

const parse = (json: unknown): CountriesDataset => parseCountries(json, FILES.countries);

const txt = {
  tab: { cleanest: { en: 'Cleanest first', uk: 'Найчистіші спершу' }, dirtiest: { en: 'Dirtiest first', uk: 'Найбрудніші спершу' } },
  chartLabel: {
    en: 'Horizontal bar chart: grams of CO2 per kilowatt-hour of electricity in {year}, {region}, {order}, ranks {from} to {to} of {total}. First: {top}. The table view lists every value.',
    uk: 'Горизонтальна стовпчикова діаграма: грамів CO2 на кіловат-годину електроенергії у {year} році ({region}), {order}, місця {from}–{to} з {total}. Перший: {top}. Таблиця містить усі значення.',
  },
  orderName: { cleanest: { en: 'cleanest first', uk: 'найчистіші спершу' }, dirtiest: { en: 'dirtiest first', uk: 'найбрудніші спершу' } },
  axis: { en: 'Grams of CO2 per kWh', uk: 'Грамів CO2 на кВт·год' },
  summary: { en: 'World, {year}: {value}', uk: 'Світ, {year}: {value}' },
  tipMain: { en: 'Largest sources: {a} {sa}, {b} {sb}', uk: 'Найбільші джерела: {a} {sa}, {b} {sb}' },
  tipGen: { en: 'Generation, {year}: {value}', uk: 'Виробництво, {year}: {value}' },
  tipVsWorld: { en: '{times}× the world average', uk: '{times}× середнього у світі' },
  colCo2: { en: 'gCO2/kWh', uk: 'г CO2/кВт·год' },
  colMain: { en: 'Largest source', uk: 'Найбільше джерело' },
  colFossil: { en: 'Fossil share', uk: 'Частка викопного' },
  tableCaption: { en: 'CO2 intensity of electricity, {year} — {region}', uk: 'Вуглецева інтенсивність електроенергії, {year} — {region}' },
  kpiWorld: { en: 'World average, {year}', uk: 'Середнє у світі, {year}' },
  kpiBelow: { en: 'Countries below 100 g/kWh', uk: 'Країн нижче 100 г/кВт·год' },
  kpiAbove: { en: 'Countries above 700 g/kWh', uk: 'Країн вище 700 г/кВт·год' },
  note: {
    en: 'CO2 emitted by power plants per kWh they generate (Ember’s power-sector intensity; life-cycle emissions of building plants are not included). Nuclear, hydro, wind and solar emit almost none; coal plants emit about 1,000 g/kWh, gas plants about 400–500. Very small grids running on diesel or oil can exceed 1,000.',
    uk: 'CO2, який викидають електростанції на кожну вироблену кВт·год (інтенсивність енергосектору за Ember; викиди за життєвий цикл будівництва станцій не враховано). Атом, ГЕС, вітер і сонце майже не викидають; вугільні станції — близько 1000 г/кВт·год, газові — близько 400–500. Дуже малі мережі на дизелі чи мазуті можуть перевищувати 1000.',
  },
} as const;

function mainSources(r: RankedCountry): [number, number] {
  const idx = GROUPS.map((_, i) => i).sort((a, b) => r.groups[b]! - r.groups[a]! || a - b);
  return [idx[0]!, idx[1]!];
}

function toBarRow(r: RankedCountry, total: number, worldCo2: number, lang: Lang, t: T): RankedBarRow {
  const name = countryName(r.code, lang);
  const [a, b] = mainSources(r);
  const lines = [
    fill(t(shared.tipRank), { rank: r.rank, total }),
    fill(t(shared.tipRegion), { region: t(REGION_LABELS[r.region]) }),
    fill(t(txt.tipVsWorld), { times: formatNumber(Math.round((r.value / worldCo2) * 100) / 100, lang) }),
    fill(t(txt.tipMain), {
      a: t(GROUP_TEXT[GROUPS[a]!].short),
      sa: formatShare(r.groups[a]!, lang),
      b: t(GROUP_TEXT[GROUPS[b]!].short),
      sb: formatShare(r.groups[b]!, lang),
    }),
    fill(t(txt.tipGen), { year: r.year, value: formatTwh(r.total, lang) }),
  ];
  if (r.dated) lines.push(fill(t(shared.tipDated), { year: r.year }));
  return {
    key: r.code,
    label: `${r.rank}  ${name}${star(r)}`,
    value: r.value,
    color: REGION_COLOR[r.region],
    valueLabel: formatGramsPerKwh(r.value, lang),
    imageUrl: flagUrl(r.code),
    tooltip: { title: name, lines },
  };
}

export function CarbonAngle({ settings, update }: AngleProps) {
  const state = useDataset(dataUrl('electricity', FILES.countries), parse);
  if (state.status !== 'ready') return <DataState status={state.status} retry={state.status === 'error' ? state.retry : undefined} />;
  return <CarbonView ds={state.data} settings={settings} update={update} />;
}

function CarbonView({ ds, settings, update }: AngleProps & { ds: CountriesDataset }) {
  const { t, lang } = useLang();
  const base = useId();
  const order = carbonOrder(settings);
  const ranked = useMemo(() => rankCarbon(ds, order), [ds, order]);
  const view = useRanking(ranked, settings);
  const pageItems = view.page.items;
  const worldCo2 = ds.world.co2;
  const rows = useMemo(
    () => pageItems.map((r) => ({ ...toBarRow(r, ranked.length, worldCo2, lang, t), emphasis: view.hi.has(r.code) })),
    [pageItems, ranked.length, worldCo2, lang, t, view.hi],
  );
  const tickFormat = useCallback((v: number) => formatNumber(v, lang), [lang]);
  const current = ranked.filter((r) => !r.dated);
  const top = pageItems[0];
  const chartLabel = fill(t(txt.chartLabel), {
    year: ds.rankYear,
    region: view.regionName,
    order: t(txt.orderName[order]),
    from: view.page.from,
    to: view.page.to,
    total: view.page.total,
    top: top ? `${countryName(top.code, lang)}, ${formatGramsPerKwh(top.value, lang)}` : '—',
  });
  const home = view.home;

  const measure = (
    <div className="field field-subtabs">
      <span className="field-label" id={`${base}-order`}>
        {t(shared.order)}
      </span>
      <div className="subtabs" role="radiogroup" aria-labelledby={`${base}-order`}>
        {CARBON_ORDERS.map((o) => (
          <label key={o} className={order === o ? 'is-on' : undefined}>
            <input type="radio" name={`${base}-order`} value={o} checked={order === o} onChange={() => update({ order: o, page: 1 })} />
            {t(txt.tab[o])}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <RankingFrame
        settings={settings}
        update={update}
        ranked={ranked}
        view={view}
        measure={measure}
        summary={fill(t(txt.summary), { year: ds.rankYear, value: formatGramsPerKwh(worldCo2, lang) })}
        detail={(r) => `${formatGramsPerKwh(r.value, lang)}${star(r)}`}
        chart={<RankedBar rows={rows} label={chartLabel} tickFormat={tickFormat} axisLabel={t(txt.axis)} />}
        table={<CarbonTable rows={view.filtered} hi={view.hi} caption={fill(t(txt.tableCaption), { year: ds.rankYear, region: view.regionName })} />}
      />

      <ul className="kpi-row" aria-label={fill(t(txt.kpiWorld), { year: ds.rankYear })}>
        <li className="kpi">
          <span className="kpi-value">{formatGramsPerKwh(worldCo2, lang)}</span>
          <span className="kpi-label">{fill(t(txt.kpiWorld), { year: ds.rankYear })}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{formatNumber(current.filter((r) => r.value < 100).length, lang)}</span>
          <span className="kpi-label">{t(txt.kpiBelow)}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{formatNumber(current.filter((r) => r.value > 700).length, lang)}</span>
          <span className="kpi-label">{t(txt.kpiAbove)}</span>
        </li>
        {home && (
          <li className="kpi kpi-home">
            <span className="kpi-value">
              {formatGramsPerKwh(home.value, lang)}
              {star(home)}
            </span>
            <span className="kpi-label">{fill(t(focusText.focusKpi), { name: countryName(home.code, lang), rank: home.rank, total: ranked.length })}</span>
          </li>
        )}
      </ul>

      <DatedNote rows={settings.view === 'chart' ? pageItems : view.filtered} rankYear={ds.rankYear} />
      <p className="chart-note muted">{t(txt.note)}</p>
      {ranked.some((r) => r.code === HOME_CODE && r.dated) && <UkraineGap />}
      <Credit date={ds.retrieved} />
    </>
  );
}

function CarbonTable({ rows, hi, caption }: { rows: readonly RankedCountry[]; hi: ReadonlySet<string>; caption: string }) {
  const { t, lang } = useLang();
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="num">
              {t(ui.rank)}
            </th>
            <th scope="col">{t(ui.country)}</th>
            <th scope="col">{t(ui.region)}</th>
            <th scope="col" className="num">
              {t(txt.colCo2)}
            </th>
            <th scope="col">{t(txt.colMain)}</th>
            <th scope="col" className="num">
              {t(txt.colFossil)}
            </th>
            <th scope="col" className="num">
              {t(shared.colYear)}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const flag = flagUrl(r.code);
            const [a] = mainSources(r);
            return (
              <tr key={r.code} className={hi.has(r.code) ? 'is-home' : undefined}>
                <td className="num">{r.rank}</td>
                <th scope="row">
                  {flag && <img className="flag" src={flag} alt="" width={20} height={15} loading="lazy" />} {countryName(r.code, lang)}
                </th>
                <td>
                  <span className="swatch" style={{ background: REGION_COLOR[r.region] }} aria-hidden="true" /> {t(REGION_LABELS[r.region])}
                </td>
                <td className="num">{formatNumber(Math.round(r.value), lang)}</td>
                <td>
                  {t(GROUP_TEXT[GROUPS[a]!].short)} {formatShare(r.groups[a]!, lang)}
                </td>
                <td className="num">{formatShare(r.fossil, lang)}</td>
                <td className="num">
                  {r.year}
                  {star(r)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
