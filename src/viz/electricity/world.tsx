// world.tsx — CHANGED (S3-el): angle C, the world's electricity by source, 2000–2025 (Ember's world rows): six lines of
// shares (YearChart), the year renewables passed coal and solar passed wind (computed), table with TWh and CO2 intensity.
import { useMemo } from 'react';
import { YearChart } from '../../charts/YearChart';
import type { YearChartSpec } from '../../charts/renderYearChart';
import { POWER_COLOR } from '../../charts/palette';
import { useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { formatChangePct, formatGramsPerKwh, formatNumber, formatPercentTick, formatShare, formatTwh } from '../../lib/format';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { Credit, DataState } from './common';
import type { AngleProps } from './common';
import { FILES, GROUPS, parseWorld, renewablesPassCoal, worldMix } from './data';
import type { WorldDataset, WorldMixYear } from './data';
import { GROUP_TEXT } from './text';

const parse = (json: unknown): WorldDataset => parseWorld(json, FILES.world);

const txt = {
  chartLabel: {
    en: 'Line chart: share of world electricity generation by source, {from}–{to}. In {to}: coal {coal}, gas and oil {gas}, hydro and bioenergy {hydro}, nuclear {nuclear}, solar {solar}, wind {wind}. The table view lists every year.',
    uk: 'Лінійна діаграма: частки джерел у світовому виробництві електроенергії, {from}–{to}. У {to} році: вугілля {coal}, газ і нафта {gas}, ГЕС і біоенергія {hydro}, атом {nuclear}, сонце {solar}, вітер {wind}. Таблиця містить усі роки.',
  },
  yLabel: { en: 'Share of world generation', uk: 'Частка у світовому виробництві' },
  status: { en: 'World, {year}: {total} · {change} vs {prev}', uk: 'Світ, {year}: {total} · {change} до {prev}' },
  tipTotal: { en: 'Total', uk: 'Усього' },
  tipRenewables: { en: 'All renewables', uk: 'Усі відновлювані' },
  kpiRenewables: { en: 'Renewables, {year} — coal {coal}', uk: 'Відновлювані, {year} — вугілля {coal}' },
  kpiPass: { en: 'First year renewables generated more than coal', uk: 'Перший рік, коли відновлювані дали більше за вугілля' },
  kpiSolar: { en: 'Solar, {year} — {times}× its share in {base}', uk: 'Сонце, {year} — у {times} раза більше, ніж у {base}' },
  kpiCo2: { en: 'CO2 per kWh, {year} ({change} since {from})', uk: 'CO2 на кВт·год, {year} ({change} з {from})' },
  solarWind: {
    en: 'In {year} solar generated more than wind for the first time ({solar} vs {wind}).',
    uk: 'У {year} році сонце вперше дало більше електроенергії, ніж вітер ({solar} проти {wind}).',
  },
  note: {
    en: 'Renewables = hydro, wind, solar, bioenergy and other renewables. Ember’s world totals cover every country, including those whose 2025 figures are Ember’s estimates.',
    uk: 'Відновлювані = ГЕС, вітер, сонце, біоенергія та інші відновлювані. Світові підсумки Ember охоплюють усі країни, зокрема ті, чиї дані за 2025 рік — оцінки Ember.',
  },
  colYear: { en: 'Year', uk: 'Рік' },
  colRenewables: { en: 'Renewables', uk: 'Відновлювані' },
  colTotal: { en: 'Total, TWh', uk: 'Усього, ТВт·год' },
  colCo2: { en: 'gCO2/kWh', uk: 'г CO2/кВт·год' },
  tableCaption: { en: 'World electricity generation by source, share of the total, {from}–{to}', uk: 'Світове виробництво електроенергії за джерелами, частка від загального, {from}–{to}' },
} as const;

export function WorldAngle({ settings }: AngleProps) {
  const state = useDataset(dataUrl('electricity', FILES.world), parse);
  if (state.status !== 'ready') return <DataState status={state.status} retry={state.status === 'error' ? state.retry : undefined} />;
  return <WorldView ds={state.data} table={settings.view === 'table'} />;
}

function WorldView({ ds, table }: { ds: WorldDataset; table: boolean }) {
  const { t, lang } = useLang();
  const mix = useMemo(() => worldMix(ds), [ds]);
  const last = mix.at(-1)!;
  const prev = mix.at(-2)!;
  const first = mix[0]!;
  const coal = GROUPS.indexOf('coal');
  const solar = GROUPS.indexOf('solar');
  const wind = GROUPS.indexOf('wind');
  const pass = renewablesPassCoal(mix);
  const solarPassWind = mix.find((m) => m.groups[solar]! > m.groups[wind]!);

  const spec = useMemo((): YearChartSpec => {
    const years = mix.map((m) => m.year);
    const max = Math.max(...mix.flatMap((m) => m.shares));
    const end = years.length - 1;
    return {
      years,
      yDomain: [0, Math.ceil((max * 100) / 10) * 10],
      yFormat: (v) => formatPercentTick(v, lang),
      yLabel: t(txt.yLabel),
      lines: GROUPS.map((g, k) => ({ key: g, values: mix.map((m) => m.shares[k]! * 100), color: POWER_COLOR[g] })),
      markers: GROUPS.map((g, k) => ({ key: g, index: end, value: last.shares[k]! * 100, color: POWER_COLOR[g] })),
      hoverPoints: (i) => GROUPS.map((g, k) => ({ value: mix[i]!.shares[k]! * 100, color: POWER_COLOR[g] })),
      tooltip: (i) => ({
        title: String(years[i]),
        lines: [
          ...GROUPS.map((g, k) => ({ label: t(GROUP_TEXT[g].name), value: formatShare(mix[i]!.shares[k]!, lang), color: POWER_COLOR[g] })),
          { label: t(txt.tipRenewables), value: formatShare(mix[i]!.renewables, lang) },
          { label: t(txt.tipTotal), value: formatTwh(mix[i]!.total, lang) },
        ],
      }),
    };
  }, [mix, last, lang, t]);

  const shareOf = (g: (typeof GROUPS)[number]): string => formatShare(last.shares[GROUPS.indexOf(g)]!, lang);
  const label = fill(t(txt.chartLabel), {
    from: ds.from,
    to: ds.to,
    coal: shareOf('coal'),
    gas: shareOf('gas'),
    hydro: shareOf('hydro'),
    nuclear: shareOf('nuclear'),
    solar: shareOf('solar'),
    wind: shareOf('wind'),
  });
  const solarBase = mix.find((m) => m.year === 2015) ?? first;
  const solarTimes = last.shares[solar]! / solarBase.shares[solar]!;

  return (
    <>
      <p className="viz-status" aria-live="polite">
        {fill(t(txt.status), { year: last.year, total: formatTwh(last.total, lang), change: formatChangePct(last.total / prev.total - 1, lang), prev: prev.year })}
      </p>
      {table ? (
        <WorldTable mix={mix} caption={fill(t(txt.tableCaption), { from: ds.from, to: ds.to })} />
      ) : (
        <>
          <ul className="key-list" aria-label={t(ui.legend)}>
            {GROUPS.map((g) => (
              <li key={g}>
                <span className="key-line" style={{ background: POWER_COLOR[g] }} aria-hidden="true" />
                {t(GROUP_TEXT[g].name)}
              </li>
            ))}
          </ul>
          <YearChart spec={spec} label={label} />
        </>
      )}

      <ul className="kpi-row" aria-label={t(txt.yLabel)}>
        <li className="kpi">
          <span className="kpi-value">{formatShare(last.renewables, lang)}</span>
          <span className="kpi-label">{fill(t(txt.kpiRenewables), { year: last.year, coal: formatShare(last.shares[coal]!, lang) })}</span>
        </li>
        {pass !== null && (
          <li className="kpi">
            <span className="kpi-value">{pass}</span>
            <span className="kpi-label">{t(txt.kpiPass)}</span>
          </li>
        )}
        <li className="kpi">
          <span className="kpi-value">{formatShare(last.shares[solar]!, lang)}</span>
          <span className="kpi-label">{fill(t(txt.kpiSolar), { year: last.year, times: formatNumber(Math.round(solarTimes * 10) / 10, lang), base: solarBase.year })}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{formatGramsPerKwh(last.co2, lang)}</span>
          <span className="kpi-label">{fill(t(txt.kpiCo2), { year: last.year, change: formatChangePct(last.co2 / first.co2 - 1, lang), from: first.year })}</span>
        </li>
      </ul>
      {solarPassWind && (
        <p className="chart-note">
          {fill(t(txt.solarWind), {
            year: solarPassWind.year,
            solar: formatTwh(solarPassWind.groups[solar]!, lang),
            wind: formatTwh(solarPassWind.groups[wind]!, lang),
          })}
        </p>
      )}
      <p className="chart-note muted">{t(txt.note)}</p>
      <Credit date={ds.retrieved} />
    </>
  );
}

function WorldTable({ mix, caption }: { mix: readonly WorldMixYear[]; caption: string }) {
  const { t, lang } = useLang();
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
              {t(txt.colRenewables)}
            </th>
            <th scope="col" className="num">
              {t(txt.colTotal)}
            </th>
            <th scope="col" className="num">
              {t(txt.colCo2)}
            </th>
          </tr>
        </thead>
        <tbody>
          {[...mix].reverse().map((m) => (
            <tr key={m.year}>
              <th scope="row">{m.year}</th>
              {m.shares.map((v, i) => (
                <td key={GROUPS[i]} className="num">
                  {formatShare(v, lang)}
                </td>
              ))}
              <td className="num">{formatShare(m.renewables, lang)}</td>
              <td className="num">{formatNumber(Math.round(m.total), lang)}</td>
              <td className="num">{formatNumber(Math.round(m.co2), lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
