// mix.tsx — CHANGED (S3-el): angle B, each country's electricity by source in 2024 — one 100 % bar per country
// (StackedRows), six fuel groups. Order: largest generators first, or by low-carbon / fossil share. Ukraine in focus.
import { useId, useMemo } from 'react';
import { StackedRows } from '../../charts/StackedRows';
import type { SrRow, SrSpec } from '../../charts/renderStackedRows';
import { POWER_COLOR } from '../../charts/palette';
import { focusText } from '../../components/viz/focusText';
import { useLang } from '../../i18n/lang';
import type { Lang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { countryName, flagUrl } from '../../lib/countries';
import { HOME_CODE } from '../../lib/focus';
import { formatNumber, formatShare, formatTwh } from '../../lib/format';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { Credit, DataState, DatedNote, FuelLegend, RankingFrame, UkraineGap } from './common';
import { star, useRanking } from './ranking';
import type { AngleProps } from './common';
import { FILES, GROUPS, MIX_ORDERS, groupValues, parseCountries, rankMix } from './data';
import type { CountriesDataset, MixOrder, RankedCountry } from './data';
import { mixOrder } from './state';
import { GROUP_TEXT, txt as shared } from './text';

type L = { en: string; uk: string };
type T = (v: L) => string;

const parse = (json: unknown): CountriesDataset => parseCountries(json, FILES.countries);

const txt = {
  tab: {
    size: { en: 'Largest first', uk: 'Найбільші спершу' },
    clean: { en: 'Cleanest first', uk: 'Найчистіші спершу' },
    fossil: { en: 'Most fossil first', uk: 'Найбільше викопного' },
  },
  chartLabel: {
    en: 'Stacked bar chart: electricity generation by source in {year}, share of each country’s total, {region}, rows {from} to {to} of {total}, {order}. First: {top}. The table view lists every share.',
    uk: 'Стовпчикова діаграма з накопиченням: виробництво електроенергії за джерелами у {year} році, частки від загального виробництва країни ({region}), рядки {from}–{to} з {total}, {order}. Перший: {top}. Таблиця містить усі частки.',
  },
  orderName: {
    size: { en: 'largest generators first', uk: 'найбільші виробники спершу' },
    clean: { en: 'highest low-carbon share first', uk: 'найбільша частка низьковуглецевої спершу' },
    fossil: { en: 'highest fossil share first', uk: 'найбільша частка викопного спершу' },
  },
  summary: { en: 'World, {year}: fossil {fossil} · low-carbon {clean}', uk: 'Світ, {year}: викопне {fossil} · низьковуглецеве {clean}' },
  valueClean: { en: '{share} low-carbon', uk: '{share} низьковуглец.' },
  valueFossil: { en: '{share} fossil', uk: '{share} викопне' },
  tipTotal: { en: 'Total, {year}', uk: 'Усього, {year}' },
  tipClean: { en: 'Low-carbon', uk: 'Низьковуглецеве' },
  colTotal: { en: 'Total, TWh', uk: 'Усього, ТВт·год' },
  colClean: { en: 'Low-carbon', uk: 'Низьковуглец.' },
  tableCaption: { en: 'Electricity by source, share of each country’s generation, {year} — {region}', uk: 'Електроенергія за джерелами, частка у виробництві країни, {year} — {region}' },
  kpiFossil: { en: 'World: fossil fuels, {year}', uk: 'Світ: викопне паливо, {year}' },
  kpiClean: { en: 'Low-carbon countries (≥ 90 %)', uk: 'Країн з низьковуглецевою ≥ 90 %' },
  kpiCoal: { en: 'Countries where coal gives over half', uk: 'Країн, де вугілля дає понад половину' },
  note: {
    en: 'Low-carbon = nuclear + renewables (hydro, wind, solar, bioenergy, other). “Gas & oil” also covers other fossil fuels; “Hydro & bio” also covers geothermal, tidal and other renewables.',
    uk: 'Низьковуглецеве = атом + відновлювані (ГЕС, вітер, сонце, біоенергія, інші). «Газ і нафта» охоплює й інше викопне паливо; «ГЕС і біо» — також геотермальну, припливну та інші відновлювані.',
  },
} as const;

function valueLabel(r: RankedCountry, order: MixOrder, lang: Lang, t: T): string {
  if (order === 'size') return formatTwh(r.total, lang) + star(r);
  if (order === 'clean') return fill(t(txt.valueClean), { share: formatShare(r.clean, lang) }) + star(r);
  return fill(t(txt.valueFossil), { share: formatShare(r.fossil, lang) }) + star(r);
}

function toRow(r: RankedCountry, order: MixOrder, hi: ReadonlySet<string>, lang: Lang, t: T): SrRow {
  const twh = groupValues(r.gen);
  return {
    key: r.code,
    label: `${r.rank}  ${countryName(r.code, lang)}${star(r)}`,
    segments: GROUPS.map((g, i) => ({ key: g, value: r.groups[i]! * 100, color: POWER_COLOR[g] })),
    valueLabel: valueLabel(r, order, lang, t),
    emphasis: hi.has(r.code),
    imageUrl: flagUrl(r.code),
    tooltip: {
      title: `${countryName(r.code, lang)}${r.dated ? ` (${r.year}*)` : ''}`,
      lines: [
        ...GROUPS.map((g, i) => ({ label: t(GROUP_TEXT[g].name), value: `${formatShare(r.groups[i]!, lang)} · ${formatTwh(twh[i]!, lang)}`, color: POWER_COLOR[g] })),
        { label: t(txt.tipClean), value: formatShare(r.clean, lang) },
        { label: fill(t(txt.tipTotal), { year: r.year }), value: formatTwh(r.total, lang) },
      ],
    },
  };
}

export function MixAngle({ settings, update }: AngleProps) {
  const state = useDataset(dataUrl('electricity', FILES.countries), parse);
  if (state.status !== 'ready') return <DataState status={state.status} retry={state.status === 'error' ? state.retry : undefined} />;
  return <MixView ds={state.data} settings={settings} update={update} />;
}

function MixView({ ds, settings, update }: AngleProps & { ds: CountriesDataset }) {
  const { t, lang } = useLang();
  const base = useId();
  const order = mixOrder(settings);
  const ranked = useMemo(() => rankMix(ds, order), [ds, order]);
  const view = useRanking(ranked, settings);
  const pageItems = view.page.items;
  const spec = useMemo<SrSpec>(() => ({ rows: pageItems.map((r) => toRow(r, order, view.hi, lang, t)) }), [pageItems, order, view.hi, lang, t]);

  const worldGroups = groupValues(ds.world.gen);
  const worldTotal = worldGroups.reduce((s, v) => s + v, 0);
  const fossil = (worldGroups[0]! + worldGroups[1]!) / worldTotal;
  const current = ranked.filter((r) => !r.dated);
  const clean90 = current.filter((r) => r.clean >= 0.9).length;
  const coalHalf = current.filter((r) => r.groups[0]! > 0.5).length;
  const home = view.home;

  const top = pageItems[0];
  const chartLabel = fill(t(txt.chartLabel), {
    year: ds.rankYear,
    region: view.regionName,
    from: view.page.from,
    to: view.page.to,
    total: view.page.total,
    order: t(txt.orderName[order]),
    top: top ? `${countryName(top.code, lang)}, ${valueLabel(top, order, lang, t)}` : '—',
  });

  const measure = (
    <div className="field field-subtabs">
      <span className="field-label" id={`${base}-order`}>
        {t(shared.order)}
      </span>
      <div className="subtabs" role="radiogroup" aria-labelledby={`${base}-order`}>
        {MIX_ORDERS.map((o) => (
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
        summary={fill(t(txt.summary), { year: ds.rankYear, fossil: formatShare(fossil, lang), clean: formatShare(1 - fossil, lang) })}
        detail={(r) => valueLabel(r, order, lang, t)}
        chart={<StackedRows spec={spec} label={chartLabel} />}
        table={<MixTable rows={view.filtered} hi={view.hi} caption={fill(t(txt.tableCaption), { year: ds.rankYear, region: view.regionName })} />}
      />
      <FuelLegend />

      <ul className="kpi-row" aria-label={fill(t(txt.kpiFossil), { year: ds.rankYear })}>
        <li className="kpi">
          <span className="kpi-value">{formatShare(fossil, lang)}</span>
          <span className="kpi-label">{fill(t(txt.kpiFossil), { year: ds.rankYear })}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{formatNumber(clean90, lang)}</span>
          <span className="kpi-label">{t(txt.kpiClean)}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{formatNumber(coalHalf, lang)}</span>
          <span className="kpi-label">{t(txt.kpiCoal)}</span>
        </li>
        {home && (
          <li className="kpi kpi-home">
            <span className="kpi-value">{valueLabel(home, order, lang, t)}</span>
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

function MixTable({ rows, hi, caption }: { rows: readonly RankedCountry[]; hi: ReadonlySet<string>; caption: string }) {
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
            {GROUPS.map((g) => (
              <th key={g} scope="col" className="num">
                {t(GROUP_TEXT[g].short)}
              </th>
            ))}
            <th scope="col" className="num">
              {t(txt.colClean)}
            </th>
            <th scope="col" className="num">
              {t(txt.colTotal)}
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
                {r.groups.map((v, i) => (
                  <td key={GROUPS[i]} className="num">
                    {formatShare(v, lang)}
                  </td>
                ))}
                <td className="num">{formatShare(r.clean, lang)}</td>
                <td className="num">{formatNumber(Math.round(r.total * 10) / 10, lang)}</td>
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
