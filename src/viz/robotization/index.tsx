// robotization — industrial robots per 10,000 manufacturing employees, 2024, top 15 (S3-rb).
// Layers: data.ts (contract + parser + ranking) → state.ts (URL state) → this page. The plain ranking pattern of
// volunteers-by-region on the shared RankedBar core, plus gdp-by-country's "× world average".
import { useCallback, useId, useMemo } from 'react';
import type { ReactNode } from 'react';
import { RankedBar } from '../../charts/RankedBar';
import type { RankedBarRow } from '../../charts/renderRankedBar';
import { REGION_COLOR } from '../../charts/palette';
import type { VizBodyProps } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import type { Lang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { countryName, flagUrl } from '../../lib/countries';
import { formatMultiple, formatNumber } from '../../lib/format';
import { REGIONS, REGION_LABELS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { DATA_FILE, TOP, parseRobotDataset, rankRobots } from './data';
import type { RankedRobotRow, RobotDataset } from './data';
import { parseRobotState, toRobotParams } from './state';
import type { RobotState } from './state';

type L = { en: string; uk: string };
type T = (v: L) => string;

const parseRobots = (json: unknown): RobotDataset => parseRobotDataset(json, DATA_FILE);

const txt = {
  joint: { en: '{a} & {b}', uk: '{a} і {b}' },
  chartLabel: {
    en: 'Horizontal bar chart: industrial robots per 10,000 employees in manufacturing, {year}, top {top} — {region}: {count} economies. Highest: {first}. The table view lists every value.',
    uk: 'Горизонтальна стовпчикова діаграма: промислових роботів на 10 000 працівників обробної промисловості, {year}, топ-{top} — {region}: економік — {count}. Найвище: {first}. Таблиця містить усі значення.',
  },
  status: {
    en: 'Top {top} of the {published} economies in IFR’s chart · world average {world}',
    uk: 'Топ-{top} із {published} економік на діаграмі IFR · світове середнє — {world}',
  },
  regionStatus: { en: '{region}: {count} of the top {top}', uk: '{region}: {count} із топ-{top}' },
  colValue: { en: 'Robots per 10,000 employees', uk: 'Роботів на 10 000 працівників' },
  colRatio: { en: '× world average', uk: '× світового середнього' },
  colNote: { en: 'Note', uk: 'Примітка' },
  tipRank: { en: 'Rank: {rank} of {total} in IFR’s chart', uk: 'Місце: {rank} з {total} на діаграмі IFR' },
  tipRegion: { en: 'Region: {region}', uk: 'Регіон: {region}' },
  tipValue: { en: 'Robots per 10,000 employees: {value}', uk: 'Роботів на 10 000 працівників: {value}' },
  tipRatio: { en: 'World average: {ratio}', uk: 'Від світового середнього: {ratio}' },
  jointNote: {
    en: 'IFR reports Belgium and Luxembourg as one figure.',
    uk: 'IFR подає Бельгію й Люксембург одним значенням.',
  },
  kpiWorld: { en: 'World average, robots per 10,000 employees', uk: 'Світове середнє, роботів на 10 000 працівників' },
  kpiLeader: { en: '{name}: the leader vs the world average', uk: '{name}: лідер відносно світового середнього' },
  kpiEurope: { en: 'Economies of the top {top} in Europe', uk: 'Економік топ-{top} у Європі' },
  chinaNote: {
    en: 'China, with by far the largest robot stock, is at rank {rank} of {total} in IFR’s chart with {value} — density divides by its very large manufacturing workforce.',
    uk: 'Китай, що має найбільший парк роботів, — на {rank}-му місці з {total} на діаграмі IFR зі значенням {value}: щільність ділиться на його дуже велику кількість працівників у промисловості.',
  },
  sourceNote: {
    en: 'IFR World Robotics 2025, as released in its press release of 8 April 2026; the full report is licensed, so only the public chart is used. “× world average” divides by IFR’s world figure. Taiwan is “Chinese Taipei” in IFR data.',
    uk: 'IFR World Robotics 2025 у вигляді, оприлюдненому в пресрелізі 8 квітня 2026 року; повний звіт ліцензійний, тож використано лише публічну діаграму. «× світового середнього» — ділення на світове значення IFR. У даних IFR Тайвань — «Chinese Taipei».',
  },
  tableCaption: {
    en: 'Industrial robots per 10,000 employees in manufacturing, {year}, top {top} — {region}',
    uk: 'Промислових роботів на 10 000 працівників обробної промисловості, {year}, топ-{top} — {region}',
  },
} as const;

function rowName(r: RankedRobotRow, lang: Lang, t: T): string {
  const a = countryName(r.code, lang);
  return r.with ? fill(t(txt.joint), { a, b: countryName(r.with, lang) }) : a;
}

function toBarRow(r: RankedRobotRow, lang: Lang, total: number, t: T): RankedBarRow {
  const name = rowName(r, lang, t);
  const ratio = formatMultiple(r.ratio, lang);
  const lines = [
    fill(t(txt.tipRank), { rank: r.rank, total }),
    fill(t(txt.tipRegion), { region: t(REGION_LABELS[r.region]) }),
    fill(t(txt.tipValue), { value: formatNumber(r.value, lang) }),
    fill(t(txt.tipRatio), { ratio }),
  ];
  if (r.with) lines.push(`* ${t(txt.jointNote)}`);
  return {
    key: r.code,
    label: `${r.rank}  ${name}`,
    value: r.value,
    color: REGION_COLOR[r.region],
    valueLabel: `${formatNumber(r.value, lang)}${r.with ? '*' : ''} · ${ratio}`,
    imageUrl: flagUrl(r.code),
    tooltip: { title: name, lines },
  };
}

export default function Robotization({ params, setParams }: VizBodyProps) {
  const { t } = useLang();
  const settings = useMemo(() => parseRobotState(params), [params]);
  const state = useDataset(dataUrl('robotization', DATA_FILE), parseRobots);
  const update = useCallback(
    (patch: Partial<RobotState>) => setParams(toRobotParams({ ...settings, ...patch })),
    [settings, setParams],
  );

  let body: ReactNode;
  if (state.status === 'loading') body = <p className="muted stage-loading">{t(ui.loading)}</p>;
  else if (state.status === 'error') {
    body = (
      <div className="notice notice-warn load-error" role="alert">
        <p>{t(ui.dataLoadError)}</p>
        <button type="button" className="btn btn-ghost" onClick={state.retry}>
          {t(ui.retry)}
        </button>
      </div>
    );
  } else body = <RobotView dataset={state.data} settings={settings} update={update} />;
  return <div className="viz-body">{body}</div>;
}

type ViewProps = { dataset: RobotDataset; settings: RobotState; update: (patch: Partial<RobotState>) => void };

function RobotView({ dataset, settings, update }: ViewProps) {
  const { t, lang } = useLang();
  const base = useId();
  const all = useMemo(() => rankRobots(dataset), [dataset]);
  const top = useMemo(() => all.slice(0, TOP), [all]);
  const shown = useMemo(
    () => (settings.region === 'all' ? top : top.filter((r) => r.region === settings.region)),
    [top, settings.region],
  );
  const rows = useMemo(() => shown.map((r) => toBarRow(r, lang, all.length, t)), [shown, lang, all.length, t]);
  const tickFormat = useCallback((v: number) => formatNumber(v, lang), [lang]);

  const regionName = settings.region === 'all' ? t(ui.allRegions) : t(REGION_LABELS[settings.region]);
  const first = shown[0];
  const chartLabel = fill(t(txt.chartLabel), {
    year: dataset.year,
    top: TOP,
    region: regionName,
    count: shown.length,
    first: first ? `${rowName(first, lang, t)}, ${formatNumber(first.value, lang)}` : '—',
  });
  const status =
    settings.region === 'all'
      ? fill(t(txt.status), { top: TOP, published: all.length, world: formatNumber(dataset.world, lang) })
      : fill(t(txt.regionStatus), { region: regionName, count: shown.length, top: TOP });
  const leader = top[0];
  const europe = top.filter((r) => r.region === 'europe').length;
  const china = all.find((r) => r.code === 'CN');
  const hasJoint = shown.some((r) => r.with);

  return (
    <>
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <div className="field">
          <label htmlFor={`${base}-region`}>{t(ui.region)}</label>
          <select id={`${base}-region`} value={settings.region} onChange={(e) => update({ region: e.target.value as Region | 'all' })}>
            <option value="all">{t(ui.allRegions)}</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {t(REGION_LABELS[r])}
              </option>
            ))}
          </select>
        </div>
        <div className="field field-auto">
          <span className="field-label" id={`${base}-view`}>
            {t(ui.view)}
          </span>
          <div className="segmented" role="radiogroup" aria-labelledby={`${base}-view`}>
            {(['chart', 'table'] as const).map((v) => (
              <label key={v} className={settings.view === v ? 'is-on' : undefined}>
                <input type="radio" name={`${base}-view`} value={v} checked={settings.view === v} onChange={() => update({ view: v })} />
                {t(v === 'chart' ? ui.viewChart : ui.viewTable)}
              </label>
            ))}
          </div>
        </div>
      </div>

      <p className="viz-status" aria-live="polite">
        {status}
      </p>

      {settings.view === 'chart' ? (
        <RankedBar rows={rows} label={chartLabel} tickFormat={tickFormat} />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <caption>{fill(t(txt.tableCaption), { year: dataset.year, top: TOP, region: regionName })}</caption>
            <thead>
              <tr>
                <th scope="col" className="num">
                  {t(ui.rank)}
                </th>
                <th scope="col">{t(ui.country)}</th>
                <th scope="col">{t(ui.region)}</th>
                <th scope="col" className="num">
                  {t(txt.colValue)}
                </th>
                <th scope="col" className="num">
                  {t(txt.colRatio)}
                </th>
                {hasJoint && <th scope="col">{t(txt.colNote)}</th>}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const flag = flagUrl(r.code);
                return (
                  <tr key={r.code}>
                    <td className="num">{r.rank}</td>
                    <th scope="row">
                      {flag && <img className="flag" src={flag} alt="" width={20} height={15} loading="lazy" />} {rowName(r, lang, t)}
                    </th>
                    <td>
                      <span className="swatch" style={{ background: REGION_COLOR[r.region] }} aria-hidden="true" /> {t(REGION_LABELS[r.region])}
                    </td>
                    <td className="num">
                      {formatNumber(r.value, lang)}
                      {r.with ? '*' : ''}
                    </td>
                    <td className="num">{formatMultiple(r.ratio, lang)}</td>
                    {hasJoint && <td className="muted">{r.with ? t(txt.jointNote) : ''}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ul className="legend" aria-label={t(ui.legend)}>
        {REGIONS.map((r) => {
          const on = settings.region === r;
          return (
            <li key={r}>
              <button type="button" className="legend-item" aria-pressed={on} onClick={() => update({ region: on ? 'all' : r })}>
                <span className="swatch" style={{ background: REGION_COLOR[r] }} aria-hidden="true" />
                {t(REGION_LABELS[r])}
              </button>
            </li>
          );
        })}
      </ul>

      <ul className="kpi-row" aria-label={t(txt.kpiWorld)}>
        <li className="kpi">
          <span className="kpi-value">{formatNumber(dataset.world, lang)}</span>
          <span className="kpi-label">{t(txt.kpiWorld)}</span>
        </li>
        {leader && (
          <li className="kpi">
            <span className="kpi-value">{formatMultiple(leader.ratio, lang)}</span>
            <span className="kpi-label">{fill(t(txt.kpiLeader), { name: rowName(leader, lang, t) })}</span>
          </li>
        )}
        <li className="kpi">
          <span className="kpi-value">
            {europe} / {top.length}
          </span>
          <span className="kpi-label">{fill(t(txt.kpiEurope), { top: TOP })}</span>
        </li>
      </ul>

      {china && (
        <p className="chart-note muted">
          {fill(t(txt.chinaNote), { rank: china.rank, total: all.length, value: formatNumber(china.value, lang) })}
        </p>
      )}
      {hasJoint && <p className="chart-note muted">* {t(txt.jointNote)}</p>}
      <p className="chart-note muted">{t(txt.sourceNote)}</p>
    </>
  );
}
