// ukraine.tsx — CHANGED (S3-el): angle G, Ukraine's electricity 1990–2022 by source (Ember's European file; stacked areas
// in YearChart, demand as a line) and the Zaporizhzhia nuclear plant's share in 2021, the last full year before the
// occupation (Energoatom's management report; Strip). The note on why the series stops in 2022 is always shown here.
import { useMemo } from 'react';
import { Strip } from '../../charts/Strip';
import type { StripSegment } from '../../charts/renderStrip';
import { YearChart } from '../../charts/YearChart';
import type { YearChartSpec } from '../../charts/renderYearChart';
import { POWER_COLOR } from '../../charts/palette';
import { useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { formatChangePct, formatNumber, formatShare, formatTwh, formatTwhTick } from '../../lib/format';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { Credit, DataState, FuelLegend, UkraineGap } from './common';
import type { AngleProps } from './common';
import { FILES, GROUPS, parseUkraine, ukraineYears, znppShares } from './data';
import type { UkraineDataset, UkraineYear } from './data';
import { GROUP_TEXT, txt as shared } from './text';

const parse = (json: unknown): UkraineDataset => parseUkraine(json, FILES.ukraine);
const DEMAND_COLOR = 'var(--tx2)';
const OTHER_COLOR = 'var(--tx3)';

const txt = {
  chartLabel: {
    en: 'Stacked area chart: Ukraine’s electricity generation by source, terawatt-hours, {from}–{to}, with demand as a line. {from}: {first}; {to}: {last} ({change}). Nuclear in {to}: {nuclear}. The table view lists every year.',
    uk: 'Діаграма з накопиченими областями: виробництво електроенергії в Україні за джерелами, тераватт-годин, {from}–{to}, попит — лінією. {from}: {first}; {to}: {last} ({change}). Атом у {to} році: {nuclear}. Таблиця містить усі роки.',
  },
  status: { en: 'Ukraine, {from}: {first} → {to}: {last} ({change})', uk: 'Україна, {from}: {first} → {to}: {last} ({change})' },
  demand: { en: 'Demand (generation + net imports)', uk: 'Попит (виробництво + чистий імпорт)' },
  tipTotal: { en: 'Generation', uk: 'Виробництво' },
  tipDemand: { en: 'Demand', uk: 'Попит' },
  tipNet: { en: 'Net imports', uk: 'Чистий імпорт' },
  band2022: { en: 'Full-scale war', uk: 'Повномасштабна війна' },
  kpiDrop: { en: 'Generation, {to} vs {from}', uk: 'Виробництво, {to} проти {from}' },
  kpiNuclear: { en: 'Nuclear share of generation, {year}', uk: 'Частка атома у виробництві, {year}' },
  kpiExport: { en: 'Net exports, {year}', uk: 'Чистий експорт, {year}' },
  kpiZnpp: { en: 'Zaporizhzhia NPP: share of Ukraine’s generation, {year}', uk: 'Запорізька АЕС: частка у виробництві України, {year}' },
  znppTitle: { en: 'Zaporizhzhia NPP, {year}: the last full year before the occupation', uk: 'Запорізька АЕС, {year}: останній повний рік до окупації' },
  znppLabel: {
    en: '100 % bar: Ukraine’s electricity generation in {year}, {total}: Zaporizhzhia NPP {znpp} ({share}), the other three nuclear plants {other}, all other sources {rest}.',
    uk: 'Смуга 100 %: виробництво електроенергії в Україні у {year} році, {total}: Запорізька АЕС {znpp} ({share}), інші три АЕС {other}, усі інші джерела {rest}.',
  },
  segZnpp: { en: 'Zaporizhzhia NPP', uk: 'Запорізька АЕС' },
  segOther: { en: 'Other NPPs', uk: 'Інші АЕС' },
  segRest: { en: 'Other sources', uk: 'Інші джерела' },
  tipGwh: { en: '{value} · {share} of Ukraine’s generation', uk: '{value} · {share} виробництва України' },
  znppText: {
    en: 'Europe’s largest nuclear plant — six 1,000 MW reactors, {capShare} of Ukraine’s nuclear capacity — generated {znpp} in {year}: {ofNuclear} of all nuclear output and {ofUkraine} of everything Ukraine generated. Russian troops have held it since 4 March 2022; its reactors have been shut down since September 2022.',
    uk: 'Найбільша АЕС Європи — шість реакторів по 1000 МВт, {capShare} атомної потужності України — виробила у {year} році {znpp}: {ofNuclear} усієї атомної генерації і {ofUkraine} усього, що виробила Україна. Російські війська утримують її з 4 березня 2022 року; її реактори зупинено з вересня 2022 року.',
  },
  znppSource: {
    en: 'Plant figures: Energoatom, management report 2021, pp. 48–49 (generation per plant; the system total {total}).',
    uk: 'Дані станцій: Енергоатом, звіт про управління 2021, с. 48–49 (виробництво кожної станції; загалом по системі {total}).',
  },
  colYear: { en: 'Year', uk: 'Рік' },
  colTotal: { en: 'Total', uk: 'Усього' },
  colDemand: { en: 'Demand', uk: 'Попит' },
  colNet: { en: 'Net imports', uk: 'Чистий імпорт' },
  tableCaption: { en: 'Ukraine: electricity generation by source, TWh, {from}–{to}', uk: 'Україна: виробництво електроенергії за джерелами, ТВт·год, {from}–{to}' },
  note: {
    en: 'Ember’s European data, which start in 1990. Negative net imports = net exports. 2022 is the first year of the full-scale invasion: occupied plants and destroyed capacity cut generation by more than a quarter.',
    uk: 'Європейські дані Ember, які починаються з 1990 року. Від’ємний чистий імпорт = чистий експорт. 2022 — перший рік повномасштабного вторгнення: окуповані станції та знищені потужності скоротили виробництво більш ніж на чверть.',
  },
} as const;

export function UkraineAngle({ settings }: AngleProps) {
  const state = useDataset(dataUrl('electricity', FILES.ukraine), parse);
  if (state.status !== 'ready') return <DataState status={state.status} retry={state.status === 'error' ? state.retry : undefined} />;
  return <UkraineView ds={state.data} table={settings.view === 'table'} />;
}

function UkraineView({ ds, table }: { ds: UkraineDataset; table: boolean }) {
  const { t, lang } = useLang();
  const years = useMemo(() => ukraineYears(ds), [ds]);
  const first = years[0]!;
  const last = years.at(-1)!;
  const n = ds.nuclear;
  const znpp = znppShares(n);
  const nuclearYear = years.find((y) => y.year === n.year);
  const change = formatChangePct(last.total / first.total - 1, lang);

  const spec = useMemo((): YearChartSpec => {
    const list = years.map((y) => y.year);
    const end = list.length - 1;
    // Stacked areas: each area runs from 0 to the running total up to its group, painted top group first.
    const cumulative = GROUPS.map((_, k) => years.map((y) => y.groups.slice(0, k + 1).reduce((s, v) => s + v, 0)));
    const max = Math.max(...years.map((y) => Math.max(y.total, y.demand)));
    return {
      years: list,
      yDomain: [0, Math.ceil(max / 50) * 50],
      yFormat: (v) => formatTwhTick(v, lang),
      yLabel: t(shared.twhAxis),
      bands: [{ from: last.year, to: last.year, label: t(txt.band2022), shortLabel: String(last.year), level: 2 }],
      areas: GROUPS.map((g, k) => ({ key: g, top: cumulative[k]!, bottom: 0, fill: POWER_COLOR[g] })).reverse(),
      lines: [{ key: 'demand', values: years.map((y) => y.demand), color: DEMAND_COLOR, width: 2 }],
      markers: [
        { key: 'first', index: 0, value: first.total, color: DEMAND_COLOR },
        { key: 'last', index: end, value: last.total, color: DEMAND_COLOR, label: formatTwhTick(last.total, lang) },
      ],
      hoverPoints: (i) => [{ value: years[i]!.total, color: DEMAND_COLOR }],
      tooltip: (i) => {
        const y = years[i]!;
        return {
          title: String(y.year),
          lines: [
            ...GROUPS.map((g, k) => ({ label: t(GROUP_TEXT[g].name), value: `${formatTwh(y.groups[k]!, lang)} · ${formatShare(y.shares[k]!, lang)}`, color: POWER_COLOR[g] })).reverse(),
            { label: t(txt.tipTotal), value: formatTwh(y.total, lang) },
            { label: t(txt.tipDemand), value: formatTwh(y.demand, lang), color: DEMAND_COLOR },
            { label: t(txt.tipNet), value: formatTwh(y.netImports, lang) },
          ],
        };
      },
    };
  }, [years, first, last, lang, t]);

  const label = fill(t(txt.chartLabel), {
    from: first.year,
    to: last.year,
    first: formatTwh(first.total, lang),
    last: formatTwh(last.total, lang),
    change,
    nuclear: formatShare(last.nuclearShare, lang),
  });

  const gwh = (v: number): string => formatTwh(v / 1000, lang);
  const rest = n.ukraine - n.plants.ZNPP - znpp.otherNuclear;
  const segments = useMemo<StripSegment[]>(() => {
    const seg = (key: string, name: string, value: number, color: string, alt?: boolean): StripSegment => {
      const share = formatShare(value / n.ukraine, lang);
      return {
        key,
        label: name,
        value,
        valueLabel: share,
        color,
        alt,
        tooltip: { title: name, lines: [fill(t(txt.tipGwh), { value: formatTwh(value / 1000, lang), share })] },
      };
    };
    return [
      seg('znpp', t(txt.segZnpp), n.plants.ZNPP, POWER_COLOR.nuclear),
      seg('other-npp', t(txt.segOther), znpp.otherNuclear, POWER_COLOR.nuclear, true),
      seg('rest', t(txt.segRest), rest, OTHER_COLOR),
    ];
  }, [n, znpp.otherNuclear, rest, lang, t]);

  return (
    <>
      <p className="viz-status" aria-live="polite">
        {fill(t(txt.status), { from: first.year, first: formatTwh(first.total, lang), to: last.year, last: formatTwh(last.total, lang), change })}
      </p>
      {table ? (
        <UkraineTable years={years} caption={fill(t(txt.tableCaption), { from: first.year, to: last.year })} />
      ) : (
        <>
          <YearChart spec={spec} label={label} />
          <FuelLegend />
          <ul className="key-list" aria-label={t(ui.legend)}>
            <li>
              <span className="key-line" style={{ background: DEMAND_COLOR }} aria-hidden="true" />
              {t(txt.demand)}
            </li>
          </ul>
        </>
      )}

      <ul className="kpi-row" aria-label={fill(t(txt.kpiDrop), { from: first.year, to: last.year })}>
        <li className="kpi">
          <span className="kpi-value">{change}</span>
          <span className="kpi-label">{fill(t(txt.kpiDrop), { from: first.year, to: last.year })}</span>
        </li>
        {nuclearYear && (
          <li className="kpi">
            <span className="kpi-value">{formatShare(nuclearYear.nuclearShare, lang)}</span>
            <span className="kpi-label">{fill(t(txt.kpiNuclear), { year: nuclearYear.year })}</span>
          </li>
        )}
        {first.netImports < 0 && (
          <li className="kpi">
            <span className="kpi-value">{formatTwh(-first.netImports, lang)}</span>
            <span className="kpi-label">{fill(t(txt.kpiExport), { year: first.year })}</span>
          </li>
        )}
        <li className="kpi">
          <span className="kpi-value">{formatShare(znpp.ofUkraine, lang)}</span>
          <span className="kpi-label">{fill(t(txt.kpiZnpp), { year: n.year })}</span>
        </li>
      </ul>
      <p className="chart-note muted">{t(txt.note)}</p>

      <section className="race-share" aria-labelledby="el-znpp-title">
        <h3 className="race-share-title" id="el-znpp-title">
          {fill(t(txt.znppTitle), { year: n.year })}
        </h3>
        <Strip
          segments={segments}
          label={fill(t(txt.znppLabel), {
            year: n.year,
            total: gwh(n.ukraine),
            znpp: gwh(n.plants.ZNPP),
            share: formatShare(znpp.ofUkraine, lang),
            other: gwh(znpp.otherNuclear),
            rest: gwh(rest),
          })}
        />
        <p className="chart-note">
          {fill(t(txt.znppText), {
            capShare: formatShare(znpp.ofCapacity, lang),
            znpp: gwh(n.plants.ZNPP),
            year: n.year,
            ofNuclear: formatShare(znpp.ofNuclear, lang),
            ofUkraine: formatShare(znpp.ofUkraine, lang),
          })}
        </p>
        <p className="chart-note muted">{fill(t(txt.znppSource), { total: gwh(n.ukraine) })}</p>
      </section>

      <UkraineGap />
      <Credit date={ds.retrieved} />
    </>
  );
}

function UkraineTable({ years, caption }: { years: readonly UkraineYear[]; caption: string }) {
  const { t, lang } = useLang();
  const num = (v: number): string => formatNumber(Math.round(v * 10) / 10, lang);
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t(txt.colYear)}</th>
            {GROUPS.map((g) => (
              <th key={g} scope="col" className="num">
                {t(GROUP_TEXT[g].short)}
              </th>
            ))}
            <th scope="col" className="num">
              {t(txt.colTotal)}
            </th>
            <th scope="col" className="num">
              {t(txt.colDemand)}
            </th>
            <th scope="col" className="num">
              {t(txt.colNet)}
            </th>
          </tr>
        </thead>
        <tbody>
          {[...years].reverse().map((y) => (
            <tr key={y.year}>
              <th scope="row">{y.year}</th>
              {y.groups.map((v, i) => (
                <td key={GROUPS[i]} className="num">
                  {num(v)}
                </td>
              ))}
              <td className="num">{num(y.total)}</td>
              <td className="num">{num(y.demand)}</td>
              <td className="num">{num(y.netImports)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
