// scale.tsx — CHANGED (S3-ai1): angle B, training compute of every model since 2017 that Epoch has a figure for (Scatter on
// a log axis + d3-zoom, opt-in), with the least-squares trend. The eight companies are one dark tone (no eight colours:
// a name tells them apart — tooltip, labels, table); the highlighted one is the accent. Buttons are the keyboard path to
// the zoom; the table lists the same models. CHANGED (S3-ai3): a headline sentence and "Did you know" facts.
import { useMemo } from 'react';
import { Scatter } from '../../charts/Scatter';
import { attachScatterZoom } from '../../charts/scatterZoom';
import type { ScatterZoomProps } from '../../charts/Scatter';
import type { ScatterAxis, ScatterPoint, ScatterSegment } from '../../charts/renderScatter';
import { useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { formatDate, formatFlop, formatNumber, formatPeople, formatYears } from '../../lib/format';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { CompanySelect, DataState, EpochCredit, Facts, Lead } from './common';
import type { AngleProps } from './common';
import { FILES, FIRST_YEAR, computeTrend, decimalYear, knownCompany, largest, parseCompute, parseReleases } from './data';
import type { ComputeDataset, ComputeRow, Hero, ReleasesDataset } from './data';
import { firstVsLargest, largestOfYear } from './insights';
import { flopTicks, formatFlopTick, formatYearTick, yearTicks } from './ticks';
import { txt as shared } from './text';

const parse = (json: unknown): ComputeDataset => parseCompute(json, FILES.compute);
const parseHeroes = (json: unknown): ReleasesDataset => parseReleases(json, FILES.releases);

/** Labelled dots: the highlighted company's largest runs, or the largest overall. */
export const LABELS_COMPANY = 8;
export const LABELS_ALL = 3;
/** Rows in the table when no company is highlighted. */
export const TABLE_TOP = 50;

const txt = {
  xLabel: { en: 'Publication date', uk: 'Дата публікації' },
  // CHANGED (S3-ai2): " · " lets splitTitle break the title on a phone (the UK one ran past 360 px).
  yLabel: { en: 'Training compute, FLOP · logarithmic scale', uk: 'Обчислення на навчання, FLOP · логарифмічна шкала' },
  chartLabel: {
    en: 'Scatter plot: training compute of {n} AI models, {from}–{to}, on a logarithmic scale; the trend grows ×{k} a year. Largest: {model}, {flop} FLOP. The table view lists the models.',
    uk: 'Точкова діаграма: обчислення на навчання {n} AI-моделей, {from}–{to}, на логарифмічній шкалі; тренд — ×{k} на рік. Найбільше: {model}, {flop} FLOP. Таблиця містить моделі.',
  },
  status: { en: '{n} of {total} models since {from} have a training-compute figure', uk: 'Число обчислень на навчання є для {n} з {total} моделей від {from} року' },
  others: { en: 'other models', uk: 'інші моделі' },
  eight: { en: 'the eight companies', uk: 'вісім компаній' },
  highlighted: { en: '{name} — highlighted', uk: '{name} — виділено' },
  trend: { en: 'trend, ×{k} a year', uk: 'тренд, ×{k} на рік' },
  kpiModels: { en: 'models with a figure, of {total} since {from}', uk: 'моделей із числом, з {total} від {from} року' },
  kpiTrend: { en: 'a year on the trend — doubling every {months} months', uk: 'на рік за трендом — подвоєння кожні {months} міс.' },
  kpiLargest: { en: 'largest: {model} ({org}, {date})', uk: 'найбільше: {model} ({org}, {date})' },
  kpiEight: { en: 'of them by the eight companies', uk: 'з них — вісім компаній' },
  disclosed: {
    en: 'Closed models rarely disclose their compute. Models in Epoch with a figure, by company: {list}.',
    uk: 'Закриті моделі рідко розкривають обчислення. Моделей з числом у Epoch, за компаніями: {list}.',
  },
  disclosedItem: { en: '{name} {known} of {total}', uk: '{name} — {known} з {total}' },
  source: {
    en: 'Epoch takes the figure from the developer’s report or estimates it from the model’s size and training data; the database records how confident each estimate is.',
    uk: 'Epoch бере число зі звіту розробника або оцінює його за розміром моделі й даними навчання; база зазначає, наскільки впевнена кожна оцінка.',
  },
  zoomIn: { en: 'Zoom in', uk: 'Наблизити' },
  zoomOut: { en: 'Zoom out', uk: 'Віддалити' },
  zoomReset: { en: 'Whole chart', uk: 'Увесь графік' },
  zoomGroup: { en: 'Zoom', uk: 'Масштаб' },
  zoomHint: { en: 'Ctrl/⌘ + wheel or pinch to zoom · drag to move', uk: 'Ctrl/⌘ + коліщатко або щипок — масштаб · перетягніть, щоб зсунути' },
  colOrg: { en: 'Organization', uk: 'Організація' },
  colFlop: { en: 'Training compute, FLOP', uk: 'Обчислення, FLOP' },
  tableTop: { en: 'The {n} largest training runs since {from}', uk: '{n} найбільших навчань від {from} року' },
  tableCompany: { en: '{name}: every model with a figure ({n})', uk: '{name}: усі моделі з числом ({n})' },
  // CHANGED (S3-ai3)
  lead: {
    en: 'The largest training run grew from {f0} FLOP ({m0}, {y0}) to {f1} ({m1}, {y1}) — ×{k} a year on the trend.',
    uk: 'Найбільше навчання зросло з {f0} FLOP ({m0}, {y0}) до {f1} ({m1}, {y1}) — за трендом ×{k} на рік.',
  },
  leadCompany: {
    en: '{name}: the largest training run with a figure is {model}, {flop} FLOP ({date}); {known} of its {total} models have a figure.',
    uk: '{name}: найбільше навчання з відомим числом — {model}, {flop} FLOP ({date}); число є для {known} з {total} її моделей.',
  },
  leadCompanyNone: {
    en: '{name}: none of its {total} models has a training-compute figure in Epoch AI’s database.',
    uk: '{name}: для жодної з {total} її моделей у базі Epoch AI немає числа обчислень.',
  },
  factRatio: {
    en: '{top} ({date}) took {ratio} times the compute of {first} ({year}), the first model of the eight companies with a figure.',
    uk: 'На {top} ({date}) пішло в {ratio} разів більше обчислень, ніж на {first} ({year}) — першу модель вісімки з відомим числом.',
  },
  factSecond: {
    en: 'If {first}’s training had taken one second, {top}’s at the same speed would take {years}.',
    uk: 'Якби навчання {first} тривало одну секунду, навчання {top} з тією ж швидкістю тривало б {years}.',
  },
  factYear: {
    en: '{top} took {ratio} times the compute of {year}’s largest run, {model}.',
    uk: 'На {top} пішло в {ratio} разів більше обчислень, ніж на найбільше навчання {year} року — {model}.',
  },
} as const;

export function ScaleAngle(props: AngleProps) {
  const state = useDataset(dataUrl('ai-models', FILES.compute), parse);
  const heroes = useDataset(dataUrl('ai-models', FILES.releases), parseHeroes);
  if (state.status !== 'ready') return <DataState status={state.status} retry={state.status === 'error' ? state.retry : undefined} />;
  if (heroes.status !== 'ready') return <DataState status={heroes.status} retry={heroes.status === 'error' ? heroes.retry : undefined} />;
  return <ScaleView ds={state.data} heroes={heroes.data.heroes} {...props} />;
}

function ScaleView({ ds, heroes, settings, update }: AngleProps & { ds: ComputeDataset; heroes: readonly Hero[] }) {
  const { t, lang } = useLang();
  const company = knownCompany(heroes, settings.company);
  const nameOf = useMemo(() => new Map(heroes.map((h) => [h.id, h.name])), [heroes]);
  const trend = useMemo(() => computeTrend(ds.rows), [ds]);
  const top = largest(ds.rows);
  const xMax = decimalYear(ds.through) + 0.08;
  const lastYear = Number(ds.through.slice(0, 4));

  const axes = useMemo(() => {
    const exps = ds.rows.map((r) => Math.log10(r.flop));
    const lo = Math.floor(Math.min(...exps));
    const hi = Math.ceil(Math.max(...exps));
    const yTicks: number[] = [];
    for (let e = lo; e <= hi; e++) if ((e - lo) % 2 === 0) yTicks.push(10 ** e);
    const xTicks: number[] = [];
    for (let y = FIRST_YEAR; y <= lastYear; y++) xTicks.push(y);
    const x: ScatterAxis = { log: false, domain: [FIRST_YEAR, xMax], ticks: xTicks, format: (v) => formatYearTick(v, lang), label: t(txt.xLabel) };
    const y: ScatterAxis = {
      log: true,
      domain: [10 ** lo, 10 ** hi],
      ticks: yTicks,
      format: (v) => formatFlopTick(v, lang),
      label: t(txt.yLabel),
    };
    return { x, y };
  }, [ds, lang, t, xMax, lastYear]);

  const points = useMemo((): ScatterPoint[] => {
    const labelled = new Set(
      [...ds.rows]
        .filter((r) => (company ? r.hero === company : true))
        .sort((a, b) => b.flop - a.flop)
        .slice(0, company ? LABELS_COMPANY : LABELS_ALL),
    );
    const layer = (r: ComputeRow): number => (r.hero === null ? 0 : r.hero === company ? 2 : 1);
    return [...ds.rows]
      .sort((a, b) => layer(a) - layer(b))
      .map((r, i) => ({
        key: `${r.date} ${r.model} ${i}`,
        x: decimalYear(r.date),
        y: r.flop,
        color: r.hero === null ? 'color-mix(in srgb, var(--tx3) 45%, transparent)' : r.hero === company ? 'var(--accent)' : 'var(--tx2)',
        emphasis: labelled.has(r),
        label: r.model,
        tooltip: {
          title: r.model,
          lines: [`${r.hero ? nameOf.get(r.hero) : (r.org ?? '—')} · ${formatDate(r.date, lang)}`, `${formatFlop(r.flop, lang)} FLOP`],
        },
      }));
  }, [ds, company, nameOf, lang]);

  const segments = useMemo(
    (): ScatterSegment[] => [
      { key: 'trend', from: [FIRST_YEAR, 10 ** (trend.intercept + trend.slope * FIRST_YEAR)], to: [xMax, 10 ** (trend.intercept + trend.slope * xMax)] },
    ],
    [trend, xMax],
  );
  const zoom = useMemo(
    (): ScatterZoomProps => ({
      xTicks: yearTicks,
      yTicks: flopTicks,
      attach: attachScatterZoom,
      labels: { zoomIn: t(txt.zoomIn), zoomOut: t(txt.zoomOut), reset: t(txt.zoomReset), group: t(txt.zoomGroup), hint: t(txt.zoomHint) },
    }),
    [t],
  );

  const k = formatNumber(Math.round(trend.perYear * 10) / 10, lang);
  const doubling = formatNumber(Math.round((12 * Math.log(2)) / Math.log(trend.perYear) * 10) / 10, lang);
  const byEight = ds.rows.filter((r) => r.hero !== null).length;

  // CHANGED (S3-ai3): headline (the whole cloud, or the highlighted company) and facts (rules in insights.ts).
  const y0 = largestOfYear(ds.rows, FIRST_YEAR);
  const cname = company ? (nameOf.get(company) ?? '') : '';
  const ownTop = company ? ds.rows.filter((r) => r.hero === company).reduce<ComputeRow | null>((a, b) => (!a || b.flop > a.flop ? b : a), null) : null;
  const [known, ownTotal] = company ? (ds.disclosed[company] ?? [0, 0]) : [0, 0];
  const lead = company
    ? ownTop
      ? fill(t(txt.leadCompany), { name: cname, model: ownTop.model, flop: formatFlop(ownTop.flop, lang), date: formatDate(ownTop.date, lang), known: formatNumber(known, lang), total: formatNumber(ownTotal, lang) })
      : fill(t(txt.leadCompanyNone), { name: cname, total: formatNumber(ownTotal, lang) })
    : y0
      ? fill(t(txt.lead), { f0: formatFlop(y0.flop, lang), m0: y0.model, y0: FIRST_YEAR, f1: formatFlop(top.flop, lang), m1: top.model, y1: top.date.slice(0, 4), k })
      : '';
  const cmp = firstVsLargest(ds.rows);
  const facts = [
    fill(t(txt.factRatio), { top: cmp.top.model, date: formatDate(cmp.top.date, lang), ratio: formatPeople(cmp.ratio, lang), first: cmp.first.model, year: cmp.first.date.slice(0, 4) }),
    fill(t(txt.factSecond), { first: cmp.first.model, top: cmp.top.model, years: formatYears(cmp.years, lang) }),
    ...(y0 ? [fill(t(txt.factYear), { year: FIRST_YEAR, model: y0.model, ratio: formatPeople(top.flop / y0.flop, lang), top: top.model })] : []),
  ];
  const label = fill(t(txt.chartLabel), {
    n: formatNumber(ds.rows.length, lang),
    from: FIRST_YEAR,
    to: lastYear,
    k,
    model: top.model,
    flop: formatFlop(top.flop, lang),
  });

  return (
    <>
      {lead && <Lead text={lead} />}
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <CompanySelect heroes={heroes} value={company} onChange={(id) => update({ company: id })} />
      </div>
      <p className="viz-status" aria-live="polite">
        {fill(t(txt.status), { n: formatNumber(ds.rows.length, lang), total: formatNumber(ds.models, lang), from: FIRST_YEAR })}
      </p>
      {settings.view === 'table' ? (
        <ScaleTable rows={ds.rows} company={company} nameOf={nameOf} />
      ) : (
        <>
          <ul className="key-list" aria-label={t(shared.legend)}>
            <li>
              <span className="key-dot is-faint" aria-hidden="true" />
              {t(txt.others)}
            </li>
            <li>
              <span className="key-dot is-dark" aria-hidden="true" />
              {t(txt.eight)}
            </li>
            {company && (
              <li>
                <span className="key-dot is-emphasis" aria-hidden="true" />
                {fill(t(txt.highlighted), { name: nameOf.get(company) ?? '' })}
              </li>
            )}
            <li>
              <span className="key-dash" aria-hidden="true" />
              {fill(t(txt.trend), { k })}
            </li>
          </ul>
          <Scatter points={points} label={label} x={axes.x} y={axes.y} segments={segments} zoom={zoom} />
        </>
      )}
      <ul className="kpi-row" aria-label={t(shared.keyFigures)}>
        <li className="kpi">
          <span className="kpi-value">{formatNumber(ds.rows.length, lang)}</span>
          <span className="kpi-label">{fill(t(txt.kpiModels), { total: formatNumber(ds.models, lang), from: FIRST_YEAR })}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">×{k}</span>
          <span className="kpi-label">{fill(t(txt.kpiTrend), { months: doubling })}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{formatFlop(top.flop, lang)}</span>
          <span className="kpi-label">{fill(t(txt.kpiLargest), { model: top.model, org: top.org ?? '—', date: formatDate(top.date, lang) })}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{formatNumber(byEight, lang)}</span>
          <span className="kpi-label">{t(txt.kpiEight)}</span>
        </li>
      </ul>
      <Facts items={facts} />
      <p className="chart-note">
        {fill(t(txt.disclosed), {
          list: heroes
            .map((h) => {
              const [known, total] = ds.disclosed[h.id] ?? [0, 0];
              return fill(t(txt.disclosedItem), { name: h.name, known: formatNumber(known, lang), total: formatNumber(total, lang) });
            })
            .join(' · '),
        })}
      </p>
      <p className="chart-note muted">{t(txt.source)}</p>
      <EpochCredit ds={ds} />
    </>
  );
}

function ScaleTable({ rows, company, nameOf }: { rows: readonly ComputeRow[]; company: string | null; nameOf: ReadonlyMap<string, string> }) {
  const { t, lang } = useLang();
  const listed = [...rows].filter((r) => (company ? r.hero === company : true)).sort((a, b) => b.flop - a.flop);
  const shown = company ? listed : listed.slice(0, TABLE_TOP);
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>
          {company
            ? fill(t(txt.tableCompany), { name: nameOf.get(company) ?? '', n: formatNumber(shown.length, lang) })
            : fill(t(txt.tableTop), { n: formatNumber(shown.length, lang), from: FIRST_YEAR })}
        </caption>
        <thead>
          <tr>
            <th scope="col">{t(shared.colModel)}</th>
            <th scope="col">{t(txt.colOrg)}</th>
            <th scope="col">{t(shared.colDate)}</th>
            <th scope="col" className="num">
              {t(txt.colFlop)}
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r, i) => (
            <tr key={`${r.date}-${r.model}-${i}`}>
              <th scope="row">{r.model}</th>
              <td>{r.hero ? nameOf.get(r.hero) : (r.org ?? '—')}</td>
              <td>{formatDate(r.date, lang)}</td>
              <td className="num">{formatFlop(r.flop, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
