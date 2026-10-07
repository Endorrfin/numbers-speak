// producers.tsx — CHANGED (S3-el): angle A, electricity generated per country in 2024 (TWh) or demand per person (MWh).
// Ukraine in focus (shared CountryFocus, ?focus=) with its last published year (2022, “*”), region filter, Pager, table.
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
import { formatMwh, formatNumber, formatShare, formatTwh, formatTwhTick } from '../../lib/format';
import { REGION_LABELS } from '../../lib/regions';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { Credit, DataState, DatedNote, RankingFrame, UkraineGap } from './common';
import { star, useRanking } from './ranking';
import type { AngleProps } from './common';
import { FILES, PRODUCER_METRICS, parseCountries, rankProducers, worldTotal } from './data';
import type { CountriesDataset, ProducerMetric, RankedCountry } from './data';
import { producerMetric } from './state';
import { txt as shared } from './text';

type L = { en: string; uk: string };
type T = (v: L) => string;

const parse = (json: unknown): CountriesDataset => parseCountries(json, FILES.countries);

const txt = {
  tab: {
    total: { en: 'Generation', uk: 'Виробництво' },
    'per-capita': { en: 'Per person', uk: 'На одну людину' },
  },
  chartLabel: {
    total: {
      en: 'Horizontal bar chart: electricity generated in {year}, terawatt-hours, {region}, ranks {from} to {to} of {total}. Largest: {top}. The table view lists every value.',
      uk: 'Горизонтальна стовпчикова діаграма: виробництво електроенергії у {year} році, тераватт-годин ({region}), місця {from}–{to} з {total}. Найбільше: {top}. Таблиця містить усі значення.',
    },
    'per-capita': {
      en: 'Horizontal bar chart: electricity demand per person in {year}, megawatt-hours a year, {region}, ranks {from} to {to} of {total}. Highest: {top}. The table view lists every value.',
      uk: 'Горизонтальна стовпчикова діаграма: попит на електроенергію на одну людину у {year} році, мегават-годин на рік ({region}), місця {from}–{to} з {total}. Найбільше: {top}. Таблиця містить усі значення.',
    },
  },
  axisPerCapita: { en: 'Megawatt-hours per person a year', uk: 'Мегават-годин на людину на рік' },
  status: { en: 'World, {year}: {value}', uk: 'Світ, {year}: {value}' },
  statusRegion: { en: '{region}: {value} · {share} of the world', uk: '{region}: {value} · {share} світового виробництва' },
  statusPerCapita: { en: 'World, {year}: {value} per person', uk: 'Світ, {year}: {value} на людину' },
  tipGen: { en: 'Generation, {year}: {value} · {share} of the world', uk: 'Виробництво, {year}: {value} · {share} світу' },
  tipPerCapita: { en: 'Demand per person: {value} a year', uk: 'Попит на людину: {value} на рік' },
  tipClean: { en: 'Low-carbon (nuclear + renewables): {share}', uk: 'Низьковуглецеве (атом + відновлювані): {share}' },
  colShare: { en: 'Share of world', uk: 'Частка у світі' },
  colPerCapita: { en: 'Per person, MWh', uk: 'На людину, МВт·год' },
  colClean: { en: 'Low-carbon share', uk: 'Частка низьковуглецевої' },
  tableCaption: { en: 'Electricity by country, {year} — {region}', uk: 'Електроенергія за країнами, {year} — {region}' },
  kpiWorld: { en: 'World electricity generation, {year}', uk: 'Світове виробництво електроенергії, {year}' },
  kpiTop2: { en: '{a} + {b}: share of the world', uk: '{a} + {b}: частка світу' },
  kpiWorldPc: { en: 'World, per person a year', uk: 'Світ, на людину на рік' },
  kpiTopPc: { en: 'Highest per person: {value}', uk: 'Найбільше на людину: {value}' },
  kpiLowPc: { en: 'Lowest per person: {value}', uk: 'Найменше на людину: {value}' },
  perCapitaHow: {
    en: 'Demand = generation + net imports. Per person = demand ÷ population (Ember). Iceland (aluminium smelters), Norway (electric heating) and the Gulf states (desalination, air conditioning) top the list.',
    uk: 'Попит = виробництво + чистий імпорт. На людину = попит ÷ населення (Ember). Найвищі значення — в Ісландії (алюмінієві заводи), Норвегії (електричне опалення) і країнах Перської затоки (опріснення води й кондиціонування).',
  },
} as const;

function value(r: RankedCountry, metric: ProducerMetric, lang: Lang): string {
  return metric === 'total' ? formatTwh(r.total, lang) : formatMwh(r.perCapita, lang);
}

function toBarRow(r: RankedCountry, metric: ProducerMetric, total: number, lang: Lang, t: T): RankedBarRow {
  const name = countryName(r.code, lang);
  const lines = [
    fill(t(shared.tipRank), { rank: r.rank, total }),
    fill(t(shared.tipRegion), { region: t(REGION_LABELS[r.region]) }),
    fill(t(txt.tipGen), { year: r.year, value: formatTwh(r.total, lang), share: formatShare(r.share, lang) }),
    fill(t(txt.tipPerCapita), { value: formatMwh(r.perCapita, lang) }),
    fill(t(txt.tipClean), { share: formatShare(r.clean, lang) }),
  ];
  if (r.dated) lines.push(fill(t(shared.tipDated), { year: r.year }));
  return {
    key: r.code,
    label: `${r.rank}  ${name}${star(r)}`,
    value: r.value,
    color: REGION_COLOR[r.region],
    valueLabel: metric === 'total' ? `${value(r, metric, lang)} · ${formatShare(r.share, lang)}` : value(r, metric, lang),
    imageUrl: flagUrl(r.code),
    tooltip: { title: name, lines },
  };
}

export function ProducersAngle({ settings, update }: AngleProps) {
  const state = useDataset(dataUrl('electricity', FILES.countries), parse);
  if (state.status !== 'ready') return <DataState status={state.status} retry={state.status === 'error' ? state.retry : undefined} />;
  return <ProducersView ds={state.data} settings={settings} update={update} />;
}

function ProducersView({ ds, settings, update }: AngleProps & { ds: CountriesDataset }) {
  const { t, lang } = useLang();
  const base = useId();
  const metric = producerMetric(settings);
  const ranked = useMemo(() => rankProducers(ds, metric), [ds, metric]);
  const view = useRanking(ranked, settings);
  const pageItems = view.page.items;
  const rows = useMemo(
    () => pageItems.map((r) => ({ ...toBarRow(r, metric, ranked.length, lang, t), emphasis: view.hi.has(r.code) })),
    [pageItems, metric, ranked.length, lang, t, view.hi],
  );
  const tickFormat = useCallback((v: number) => (metric === 'total' ? formatTwhTick(v, lang) : formatNumber(v, lang)), [metric, lang]);

  const world = worldTotal(ds);
  let summary: string;
  if (metric === 'per-capita') summary = fill(t(txt.statusPerCapita), { year: ds.rankYear, value: formatMwh(ds.world.perCapita, lang) });
  else if (settings.region === 'all') summary = fill(t(txt.status), { year: ds.rankYear, value: formatTwh(world, lang) });
  else {
    const sum = view.filtered.filter((r) => !r.dated).reduce((s, r) => s + r.total, 0);
    summary = fill(t(txt.statusRegion), { region: view.regionName, value: formatTwh(sum, lang), share: formatShare(sum / world, lang) });
  }

  const top = pageItems[0];
  const chartLabel = fill(t(txt.chartLabel[metric]), {
    year: ds.rankYear,
    region: view.regionName,
    from: view.page.from,
    to: view.page.to,
    total: view.page.total,
    top: top ? `${countryName(top.code, lang)}, ${value(top, metric, lang)}` : '—',
  });

  const byTotal = metric === 'total' ? ranked : rankProducers(ds, 'total');
  const [first, second] = byTotal;
  const pcFirst = metric === 'per-capita' ? ranked[0] : undefined;
  const pcLast = metric === 'per-capita' ? ranked.at(-1) : undefined;
  const home = view.home;
  const homeTile = home && {
    value: `${value(home, metric, lang)}${star(home)}`,
    label: fill(t(focusText.focusKpi), { name: countryName(home.code, lang), rank: home.rank, total: ranked.length }),
  };

  const measure = (
    <div className="field field-subtabs">
      <span className="field-label" id={`${base}-metric`}>
        {t(shared.metric)}
      </span>
      <div className="subtabs" role="radiogroup" aria-labelledby={`${base}-metric`}>
        {PRODUCER_METRICS.map((m) => (
          <label key={m} className={metric === m ? 'is-on' : undefined}>
            <input type="radio" name={`${base}-metric`} value={m} checked={metric === m} onChange={() => update({ metric: m, page: 1 })} />
            {t(txt.tab[m])}
          </label>
        ))}
      </div>
    </div>
  );

  const shownRows = settings.view === 'chart' ? pageItems : view.filtered;
  return (
    <>
      <RankingFrame
        settings={settings}
        update={update}
        ranked={ranked}
        view={view}
        measure={measure}
        summary={summary}
        detail={(r) => `${value(r, metric, lang)}${star(r)}`}
        chart={<RankedBar rows={rows} label={chartLabel} tickFormat={tickFormat} axisLabel={metric === 'total' ? t(shared.twhAxis) : t(txt.axisPerCapita)} />}
        table={<ProducersTable rows={view.filtered} hi={view.hi} caption={fill(t(txt.tableCaption), { year: ds.rankYear, region: view.regionName })} />}
      />

      <ul className="kpi-row" aria-label={fill(t(txt.kpiWorld), { year: ds.rankYear })}>
        {metric === 'total' ? (
          <>
            <li className="kpi">
              <span className="kpi-value">{formatTwh(world, lang)}</span>
              <span className="kpi-label">{fill(t(txt.kpiWorld), { year: ds.rankYear })}</span>
            </li>
            {first && second && (
              <li className="kpi">
                <span className="kpi-value">{formatShare(first.share + second.share, lang)}</span>
                <span className="kpi-label">{fill(t(txt.kpiTop2), { a: countryName(first.code, lang), b: countryName(second.code, lang) })}</span>
              </li>
            )}
          </>
        ) : (
          <>
            <li className="kpi">
              <span className="kpi-value">{formatMwh(ds.world.perCapita, lang)}</span>
              <span className="kpi-label">{t(txt.kpiWorldPc)}</span>
            </li>
            {pcFirst && (
              <li className="kpi">
                <span className="kpi-value">{countryName(pcFirst.code, lang)}</span>
                <span className="kpi-label">{fill(t(txt.kpiTopPc), { value: value(pcFirst, metric, lang) })}</span>
              </li>
            )}
            {pcLast && (
              <li className="kpi">
                <span className="kpi-value">{countryName(pcLast.code, lang)}</span>
                <span className="kpi-label">{fill(t(txt.kpiLowPc), { value: value(pcLast, metric, lang) })}</span>
              </li>
            )}
          </>
        )}
        {homeTile && (
          <li className="kpi kpi-home">
            <span className="kpi-value">{homeTile.value}</span>
            <span className="kpi-label">{homeTile.label}</span>
          </li>
        )}
      </ul>

      <DatedNote rows={shownRows} rankYear={ds.rankYear} />
      {metric === 'per-capita' && <p className="chart-note muted">{t(txt.perCapitaHow)}</p>}
      {ranked.some((r) => r.code === HOME_CODE && r.dated) && <UkraineGap />}
      <Credit date={ds.retrieved} />
    </>
  );
}

type TableProps = { rows: readonly RankedCountry[]; hi: ReadonlySet<string>; caption: string };

function ProducersTable({ rows, hi, caption }: TableProps) {
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
              {t(shared.colTwh)}
            </th>
            <th scope="col" className="num">
              {t(txt.colShare)}
            </th>
            <th scope="col" className="num">
              {t(txt.colPerCapita)}
            </th>
            <th scope="col" className="num">
              {t(txt.colClean)}
            </th>
            <th scope="col" className="num">
              {t(shared.colYear)}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const flag = flagUrl(r.code);
            return (
              <tr key={r.code} className={hi.has(r.code) ? 'is-home' : undefined}>
                <td className="num">{r.rank}</td>
                <th scope="row">
                  {flag && <img className="flag" src={flag} alt="" width={20} height={15} loading="lazy" />} {countryName(r.code, lang)}
                </th>
                <td>
                  <span className="swatch" style={{ background: REGION_COLOR[r.region] }} aria-hidden="true" /> {t(REGION_LABELS[r.region])}
                </td>
                <td className="num">{formatNumber(Math.round(r.total * 10) / 10, lang)}</td>
                <td className="num">{formatShare(r.share, lang)}</td>
                <td className="num">{formatNumber(Math.round(r.perCapita * 100) / 100, lang)}</td>
                <td className="num">{formatShare(r.clean, lang)}</td>
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
