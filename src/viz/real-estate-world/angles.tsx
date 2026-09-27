// angles.tsx — CHANGED (S3-re): the six angles of real-estate-world and the shared city table. Every angle reads
// the same dataset, URL state and highlighted cities: data.ts ranks and derives, measures.ts formats, text.ts words.
//   ranking  — any of the eight measures on RankedBar (paged, region filter, "find my city");
//   scatter  — price per m² vs years of income (Scatter, log–log, median quadrants with examples);
//   income   — what a year of income buys (90-square waffles) + the mortgage burden of every city (Swarm);
//   centre   — the centre vs the outskirts (Dumbbell, three orders) + years of rent that equal the price (Swarm);
//   map      — any measure on a world map (PointMap, quartiles of the sequential ramp);
//   compare  — the highlighted cities side by side, every measure with its rank.
import { useId, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Dumbbell } from '../../charts/Dumbbell';
import { PointMap } from '../../charts/PointMap';
import { RankedBar } from '../../charts/RankedBar';
import { Scatter } from '../../charts/Scatter';
import { Swarm } from '../../charts/Swarm';
import type { DumbbellRow } from '../../charts/renderDumbbell';
import type { MapPoint } from '../../charts/renderPointMap';
import type { RankedBarRow } from '../../charts/renderRankedBar';
import type { ScatterAxis, ScatterPoint } from '../../charts/renderScatter';
import type { SwarmPoint, SwarmRef } from '../../charts/renderSwarm';
import type { TipContent } from '../../charts/tooltip';
import { HEAT_COLOR, REGION_COLOR } from '../../charts/palette';
import { Pager } from '../../components/viz/Pager';
import { useLang } from '../../i18n/lang';
import type { Lang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { countryName, flagUrl } from '../../lib/countries';
import { formatDate, formatMultiple, formatNumber, formatShare, formatUsdPrice, formatYears } from '../../lib/format';
import { paginate } from '../../lib/paginate';
import { REGIONS, REGION_LABELS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { HOME_M2, LAND_FILE, MEASURES, MEASURE_GROUPS, measureValue, median, parseLand, premium, rankByMeasure, rankCorrelation } from './data';
import type { CityRow, Measure, RankInfo, RankedCity, RealEstateDataset } from './data';
import { MEASURE_TEXT, cityWithCountry, measureText, measureTick } from './measures';
import { MAX_CITIES, PAGE_SIZE, SORTS } from './state';
import type { RealEstateState, Sort } from './state';
import { txt } from './text';
import type { L } from './text';

type T = (v: L) => string;
type Ranks = Record<Measure, ReadonlyMap<string, RankInfo>>;
type Props = {
  data: RealEstateDataset;
  settings: RealEstateState;
  update: (patch: Partial<RealEstateState>) => void;
  highlighted: readonly CityRow[];
  ranks: Ranks;
};

const dash = '—';
const TIP_MEASURES = ['centre', 'outside', 'premium', 'income', 'mortgage', 'rent'] as const;
const inRegion = (r: CityRow, region: Region | 'all'): boolean => region === 'all' || r.region === region;
/** Tick values of a log axis: the 1–2–5 series inside the domain. */
const LOG_TICKS = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10_000, 20_000, 50_000, 100_000];
const logTicks = ([lo, hi]: readonly [number, number]): number[] => LOG_TICKS.filter((v) => v >= lo && v <= hi);
/** A log domain with a little air around the extremes. */
function logDomain(values: readonly number[]): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return Number.isFinite(lo) ? [lo / 1.15, hi * 1.15] : [1, 10];
}

/** Everything the page knows about a city, one line per fact (tooltips are text-only). */
function cityTip(r: CityRow, lang: Lang, t: T, first?: string): TipContent {
  const lines = first ? [first] : [];
  lines.push(fill(t(txt.tipRegion), { region: t(REGION_LABELS[r.region]) }));
  for (const m of TIP_MEASURES) {
    const v = measureValue(r, m);
    if (v !== undefined) lines.push(fill(t(txt.tipLine), { measure: t(MEASURE_TEXT[m].column), value: measureText(m, v, lang) }));
  }
  return { title: cityWithCountry(r, lang), lines };
}

function rankLine(m: Measure, info: RankInfo | undefined, lang: Lang, t: T): string | undefined {
  return info && fill(t(txt.tipRank), { measure: t(MEASURE_TEXT[m].column), value: measureText(m, info.value, lang), rank: info.rank, total: info.total });
}

// ── Shared controls ──────────────────────────────────────────────────────────────────────────────

function RegionField({ id, region, update }: { id: string; region: Region | 'all'; update: Props['update'] }) {
  const { t } = useLang();
  return (
    <div className="field">
      <label htmlFor={id}>{t(ui.region)}</label>
      <select id={id} value={region} onChange={(e) => update({ region: e.target.value as Region | 'all', page: 1 })}>
        <option value="all">{t(ui.allRegions)}</option>
        {REGIONS.map((r) => (
          <option key={r} value={r}>
            {t(REGION_LABELS[r])}
          </option>
        ))}
      </select>
    </div>
  );
}

function MeasureField({ id, measure, update }: { id: string; measure: Measure; update: Props['update'] }) {
  const { t } = useLang();
  return (
    <div className="field re-field-measure">
      <label htmlFor={id}>{t(txt.measure)}</label>
      <select id={id} value={measure} onChange={(e) => update({ measure: e.target.value as Measure, page: 1 })}>
        {(Object.keys(MEASURE_GROUPS) as Array<keyof typeof MEASURE_GROUPS>).map((g) => (
          <optgroup key={g} label={t(txt.groups[g])}>
            {MEASURE_GROUPS[g].map((m) => (
              <option key={m} value={m}>
                {t(MEASURE_TEXT[m].name)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

function ViewField({ base, view, update }: { base: string; view: RealEstateState['view']; update: Props['update'] }) {
  const { t } = useLang();
  return (
    <div className="field field-auto">
      <span className="field-label" id={`${base}-view`}>
        {t(ui.view)}
      </span>
      <div className="segmented" role="radiogroup" aria-labelledby={`${base}-view`}>
        {(['chart', 'table'] as const).map((v) => (
          <label key={v} className={view === v ? 'is-on' : undefined}>
            <input type="radio" name={`${base}-view`} value={v} checked={view === v} onChange={() => update({ view: v })} />
            {t(v === 'chart' ? ui.viewChart : ui.viewTable)}
          </label>
        ))}
      </div>
    </div>
  );
}

type Kpi = { value: string; label: string };

function Kpis({ items, label }: { items: ReadonlyArray<Kpi | null | undefined | false>; label: string }) {
  const shown = items.filter((k): k is Kpi => Boolean(k));
  if (!shown.length) return null;
  return (
    <ul className="kpi-row" aria-label={label}>
      {shown.map((k) => (
        <li key={k.label} className="kpi">
          <span className="kpi-value">{k.value}</span>
          <span className="kpi-label">{k.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** Region swatches (click = filter) and the highlight swatch. */
function Legend({ region, update, extra }: { region?: Region | 'all'; update?: Props['update']; extra?: ReactNode }) {
  const { t } = useLang();
  return (
    <ul className="legend" aria-label={t(ui.legend)}>
      {extra}
      {REGIONS.map((r) => {
        const on = region === r;
        return (
          <li key={r}>
            {update ? (
              <button type="button" className="legend-item" aria-pressed={on} onClick={() => update({ region: on ? 'all' : r, page: 1 })}>
                <span className="swatch" style={{ background: REGION_COLOR[r] }} aria-hidden="true" />
                {t(REGION_LABELS[r])}
              </button>
            ) : (
              <span className="legend-item">
                <span className="swatch" style={{ background: REGION_COLOR[r] }} aria-hidden="true" />
                {t(REGION_LABELS[r])}
              </span>
            )}
          </li>
        );
      })}
      <li>
        <span className="legend-item">
          <span className="swatch swatch-home" aria-hidden="true" />
          {t(txt.highlightLegend)}
        </span>
      </li>
    </ul>
  );
}

/** One button per highlighted city: its rank in the current list; a click opens the page that shows it. */
function Finder({ highlighted, list, rankOf, onJump }: {
  highlighted: readonly CityRow[];
  list: readonly CityRow[];
  rankOf: (r: CityRow) => number | undefined;
  onJump: (r: CityRow) => void;
}) {
  const { t, lang } = useLang();
  if (!highlighted.length) return null;
  const listed = new Set(list.map((r) => r.id));
  return (
    <div className="re-find">
      <span className="field-label">{t(txt.find)}</span>
      <ul className="re-find-list">
        {highlighted.map((r) => {
          const rank = rankOf(r);
          return (
            <li key={r.id}>
              {rank !== undefined && listed.has(r.id) ? (
                <button type="button" className="btn btn-ghost re-find-btn" title={fill(t(txt.findTitle), { city: r.name[lang] })} onClick={() => onJump(r)}>
                  {fill(t(txt.findButton), { city: r.name[lang], rank })}
                </button>
              ) : (
                <span className="re-find-missing muted">{fill(t(txt.notListed), { city: r.name[lang] })}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Status({ children }: { children: ReactNode }) {
  return (
    <p className="viz-status" aria-live="polite">
      {children}
    </p>
  );
}

// ── The shared table ─────────────────────────────────────────────────────────────────────────────

type TableProps = { rows: readonly RankedCity[]; measure: Measure; caption: string; hi: ReadonlySet<string> };

/** Every city of the list in the given order, all eight measures (the page's accessible view of every angle). */
export function CityTable({ rows, measure, caption, hi }: TableProps) {
  const { t, lang } = useLang();
  return (
    <div className="table-wrap">
      <table className="data-table re-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="num">
              {t(ui.rank)}
            </th>
            <th scope="col">{t(txt.colCity)}</th>
            <th scope="col">{t(ui.region)}</th>
            {MEASURES.map((m) => (
              <th key={m} scope="col" className="num" aria-sort={m === measure ? 'descending' : undefined}>
                {t(MEASURE_TEXT[m].column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const r = c.row;
            const flag = flagUrl(r.code);
            return (
              <tr key={r.id} className={hi.has(r.id) ? 'is-home' : undefined}>
                <td className="num">{c.rank}</td>
                <th scope="row">
                  {flag && <img className="flag" src={flag} alt="" width={20} height={15} loading="lazy" />} {cityWithCountry(r, lang)}
                </th>
                <td>
                  <span className="swatch" style={{ background: REGION_COLOR[r.region] }} aria-hidden="true" /> {t(REGION_LABELS[r.region])}
                </td>
                {MEASURES.map((m) => {
                  const v = measureValue(r, m);
                  return (
                    <td key={m} className="num">
                      {v === undefined ? dash : measureText(m, v, lang)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function tableCaption(title: L, measure: Measure, region: Region | 'all', date: string, t: T): string {
  return fill(t(txt.tableCaption), {
    title: t(title),
    region: region === 'all' ? t(ui.allRegions) : t(REGION_LABELS[region]),
    date,
    measure: t(MEASURE_TEXT[measure].name),
  });
}

// ── 1. Ranking ───────────────────────────────────────────────────────────────────────────────────

export function RankingAngle({ data, settings, update, highlighted, ranks }: Props) {
  const { t, lang } = useLang();
  const base = useId();
  const m = settings.measure;
  const hi = useMemo(() => new Set(highlighted.map((r) => r.id)), [highlighted]);
  const ranked = useMemo(() => rankByMeasure(data, m), [data, m]);
  const filtered = useMemo(() => ranked.filter((c) => inRegion(c.row, settings.region)), [ranked, settings.region]);
  const page = useMemo(() => paginate(filtered, settings.page, PAGE_SIZE), [filtered, settings.page]);
  const items = page.items;
  const rows = useMemo<RankedBarRow[]>(
    () =>
      items.map((c) => ({
        key: c.row.id,
        label: `${c.rank}  ${c.row.name[lang]}`,
        value: c.value,
        color: REGION_COLOR[c.row.region],
        valueLabel: measureText(m, c.value, lang, 'short'),
        imageUrl: flagUrl(c.row.code),
        tooltip: cityTip(c.row, lang, t, rankLine(m, { rank: c.rank, total: ranked.length, value: c.value }, lang, t)),
        emphasis: hi.has(c.row.id),
      })),
    [items, m, lang, t, ranked.length, hi],
  );
  const tickFormat = useMemo(() => (v: number) => measureTick(m, v, lang), [m, lang]);

  const date = formatDate(data.retrieved, lang);
  const regionName = settings.region === 'all' ? t(ui.allRegions) : t(REGION_LABELS[settings.region]);
  const leader = ranked[0];
  const last = ranked[ranked.length - 1];
  const mid = ranked.length ? median(ranked.map((c) => c.value)) : undefined;
  const total = ranked.length;
  let insight: Kpi | null = null;
  if (m === 'mortgage') {
    const over = ranked.filter((c) => c.value > 100).length;
    insight = { value: formatNumber(over, lang), label: fill(t(txt.kpiOver100), { count: formatNumber(over, lang), total: formatNumber(total, lang) }) };
  } else if (m === 'premium') {
    const below = ranked.filter((c) => c.value < 1).length;
    insight = { value: formatNumber(below, lang), label: fill(t(txt.kpiBelow1), { count: formatNumber(below, lang), total: formatNumber(total, lang) }) };
  } else if (leader && last && last.value > 0) {
    insight = { value: formatMultiple(leader.value / last.value, lang), label: fill(t(txt.kpiSpread), { count: formatNumber(total, lang) }) };
  }
  const best = highlighted
    .map((r) => ({ r, info: ranks[m].get(r.id) }))
    .filter((x): x is { r: CityRow; info: RankInfo } => x.info !== undefined)
    .sort((a, b) => a.info.rank - b.info.rank)[0];

  const jump = (r: CityRow): void => {
    const keep = inRegion(r, settings.region);
    const list = keep ? filtered : ranked;
    const pos = list.findIndex((c) => c.row.id === r.id);
    if (pos >= 0) update({ region: keep ? settings.region : 'all', page: Math.floor(pos / PAGE_SIZE) + 1, view: 'chart' });
  };

  return (
    <>
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <MeasureField id={`${base}-measure`} measure={m} update={update} />
        <RegionField id={`${base}-region`} region={settings.region} update={update} />
        {settings.view === 'chart' && <Pager id={`${base}-page`} page={page} size={PAGE_SIZE} onPage={(p) => update({ page: p })} />}
        <ViewField base={base} view={settings.view} update={update} />
      </div>

      {leader && mid !== undefined && (
        <Kpis
          label={t(MEASURE_TEXT[m].name)}
          items={[
            { value: measureText(m, leader.value, lang), label: fill(t(MEASURE_TEXT[m].top), { city: cityWithCountry(leader.row, lang) }) },
            { value: measureText(m, mid, lang), label: fill(t(txt.kpiMedian), { count: formatNumber(total, lang) }) },
            insight,
            best && {
              value: measureText(m, best.info.value, lang),
              label: fill(t(txt.kpiHighlight), { city: best.r.name[lang], rank: best.info.rank, total: formatNumber(total, lang) }),
            },
          ]}
        />
      )}

      <Finder highlighted={highlighted} list={ranked.map((c) => c.row)} rankOf={(r) => ranks[m].get(r.id)?.rank} onJump={jump} />

      <Status>
        {settings.view === 'chart'
          ? fill(t(ui.showingRange), { from: page.from, to: page.to, total: page.total })
          : fill(t(ui.showingAll), { total: page.total })}
        {' · '}
        {settings.region === 'all' ? fill(t(txt.context), { date }) : fill(t(txt.regionCount), { region: regionName, count: filtered.length })}
      </Status>

      {settings.view === 'chart' ? (
        <RankedBar
          rows={rows}
          label={fill(t(txt.rankingLabel), {
            measure: t(MEASURE_TEXT[m].name),
            region: regionName,
            from: page.from,
            to: page.to,
            total: page.total,
            top: items[0] ? `${cityWithCountry(items[0].row, lang)}, ${measureText(m, items[0].value, lang)}` : dash,
          })}
          tickFormat={tickFormat}
        />
      ) : (
        <CityTable rows={filtered} measure={m} hi={hi} caption={tableCaption(txt.shows.ranking, m, settings.region, date, t)} />
      )}

      <Legend region={settings.region} update={update} />
      <p className="chart-note muted">{t(MEASURE_TEXT[m].note)}</p>
      <p className="chart-note muted">{t(txt.rankNote)}</p>
    </>
  );
}

// ── 2. Price vs affordability ────────────────────────────────────────────────────────────────────

/** Top-left, top-right, bottom-left, bottom-right of the median cross (0…3). */
const quadrantOf = (r: CityRow, mx: number, my: number): number => (r.income! > my ? 0 : 2) + (r.centre! > mx ? 1 : 0);

export function ScatterAngle({ data, settings, update, highlighted }: Props) {
  const { t, lang } = useLang();
  const base = useId();
  const hi = useMemo(() => new Set(highlighted.map((r) => r.id)), [highlighted]);
  const all = useMemo(() => data.rows.filter((r) => r.centre !== undefined && r.income !== undefined), [data]);
  const stats = useMemo(() => {
    const xs = all.map((r) => r.centre!);
    const ys = all.map((r) => r.income!);
    return { mx: median(xs), my: median(ys), rho: rankCorrelation(xs, ys), xDomain: logDomain(xs), yDomain: logDomain(ys) };
  }, [all]);
  const shown = useMemo(() => all.filter((r) => inRegion(r, settings.region)), [all, settings.region]);
  const quadrants = useMemo(() => {
    const groups: CityRow[][] = [[], [], [], []];
    for (const r of shown) groups[quadrantOf(r, stats.mx, stats.my)]!.push(r);
    const far = (r: CityRow): number => Math.abs(Math.log(r.centre! / stats.mx)) + Math.abs(Math.log(r.income! / stats.my));
    return groups.map((g) => ({ count: g.length, examples: [...g].sort((a, b) => far(b) - far(a)).slice(0, 3) }));
  }, [shown, stats]);
  const points = useMemo<ScatterPoint[]>(
    () =>
      shown.map((r) => ({
        key: r.id,
        x: r.centre!,
        y: r.income!,
        color: REGION_COLOR[r.region],
        emphasis: hi.has(r.id),
        label: r.name[lang],
        tooltip: cityTip(r, lang, t),
      })),
    [shown, hi, lang, t],
  );
  const x = useMemo<ScatterAxis>(
    () => ({ log: true, domain: stats.xDomain, ticks: logTicks(stats.xDomain), format: (v) => measureTick('centre', v, lang), label: t(txt.scatterX) }),
    [stats, lang, t],
  );
  const y = useMemo<ScatterAxis>(
    () => ({ log: true, domain: stats.yDomain, ticks: logTicks(stats.yDomain), format: (v) => formatNumber(v, lang), label: t(txt.scatterY) }),
    [stats, lang, t],
  );
  const guides = useMemo(() => ({ x: stats.mx, y: stats.my }), [stats]);
  const captions = useMemo(
    () => quadrants.map((q, i) => fill(t(txt.quadrantCount), { name: t(txt.quadrants[i]!), count: formatNumber(q.count, lang) })) as [string, string, string, string],
    [quadrants, lang, t],
  );
  const rho = formatNumber(Math.round(stats.rho * 100) / 100, lang);
  const date = formatDate(data.retrieved, lang);
  const ranked = useMemo(() => rankByMeasure(data, 'income').filter((c) => c.row.centre !== undefined && inRegion(c.row, settings.region)), [data, settings.region]);

  return (
    <>
      <p className="re-lede">{fill(t(Math.abs(stats.rho) < 0.4 ? txt.scatterWeak : txt.scatterStrong), { count: formatNumber(all.length, lang), rho })}</p>
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <RegionField id={`${base}-region`} region={settings.region} update={update} />
        <ViewField base={base} view={settings.view} update={update} />
      </div>
      <Status>
        {fill(t(ui.showingAll), { total: shown.length })} · {fill(t(txt.context), { date })}
      </Status>
      {settings.view === 'chart' ? (
        <Scatter
          points={points}
          x={x}
          y={y}
          guides={guides}
          quadrants={captions}
          label={fill(t(txt.scatterLabel), { count: formatNumber(shown.length, lang), rho })}
        />
      ) : (
        <CityTable rows={ranked} measure="income" hi={hi} caption={tableCaption(txt.shows.scatter, 'income', settings.region, date, t)} />
      )}
      <ul className="re-quadrants">
        {quadrants.map((q, i) => (
          <li key={i} className="re-quadrant">
            <strong>{captions[i]}</strong>
            {q.examples.length > 0 && (
              <span className="muted">
                {t(txt.quadrantExamples)}: {q.examples.map((r) => `${cityWithCountry(r, lang)} (${formatUsdPrice(r.centre!, lang)}, ${formatYears(r.income!, lang)})`).join('; ')}
              </span>
            )}
          </li>
        ))}
      </ul>
      <Legend region={settings.region} update={update} />
      <p className="chart-note muted">
        {fill(t(txt.scatterGuides), { count: formatNumber(all.length, lang), price: formatUsdPrice(stats.mx, lang), years: formatYears(stats.my, lang) })}{' '}
        {t(MEASURE_TEXT.income.note)}
      </p>
    </>
  );
}

// ── 3. A year of income & mortgage ───────────────────────────────────────────────────────────────

const WAFFLE_COLS = 10;
const CELL = 11;
const GAP = 2;

/** 90 squares = a 90 m² home; the first `m2` are filled (the last one partly). React SVG — static, SSR-safe. */
function Waffle90({ m2, label }: { m2: number; label: string }) {
  const rows = Math.ceil(HOME_M2 / WAFFLE_COLS);
  const w = WAFFLE_COLS * (CELL + GAP) - GAP;
  const h = rows * (CELL + GAP) - GAP;
  const full = Math.min(HOME_M2, Math.floor(m2));
  const part = Math.min(1, m2 - full);
  return (
    <svg className="re-waffle" width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      {Array.from({ length: HOME_M2 }, (_, i) => {
        const cx = (i % WAFFLE_COLS) * (CELL + GAP);
        const cy = Math.floor(i / WAFFLE_COLS) * (CELL + GAP);
        return (
          <g key={i}>
            <rect className={i < full ? 'is-filled' : 'is-empty'} x={cx} y={cy} width={CELL} height={CELL} rx={2} />
            {i === full && part > 0.02 && <rect className="is-filled" x={cx} y={cy} width={CELL * part} height={CELL} rx={1} />}
          </g>
        );
      })}
    </svg>
  );
}

type WaffleItem = { key: string; title: string; m2: number; years: number; reference: boolean; code?: string };

export function IncomeAngle({ data, settings, update, highlighted, ranks }: Props) {
  const { t, lang } = useLang();
  const base = useId();
  const hi = useMemo(() => new Set(highlighted.map((r) => r.id)), [highlighted]);
  const withIncome = useMemo(() => data.rows.filter((r) => r.income !== undefined), [data]);
  const waffles = useMemo<WaffleItem[]>(() => {
    if (!withIncome.length) return [];
    const byM2 = [...withIncome].sort((a, b) => a.income! - b.income!);
    const most = byM2[0]!;
    const least = byM2[byM2.length - 1]!;
    const midYears = median(withIncome.map((r) => r.income!));
    const items: WaffleItem[] = highlighted
      .filter((r) => r.income !== undefined)
      .map((r) => ({ key: r.id, title: r.name[lang], m2: HOME_M2 / r.income!, years: r.income!, reference: false, code: r.code }));
    if (!hi.has(most.id)) items.push({ key: 'most', title: fill(t(txt.waffleMost), { city: cityWithCountry(most, lang) }), m2: HOME_M2 / most.income!, years: most.income!, reference: true });
    items.push({ key: 'median', title: fill(t(txt.waffleMedian), { count: formatNumber(withIncome.length, lang) }), m2: HOME_M2 / midYears, years: midYears, reference: true });
    if (!hi.has(least.id)) items.push({ key: 'least', title: fill(t(txt.waffleLeast), { city: cityWithCountry(least, lang) }), m2: HOME_M2 / least.income!, years: least.income!, reference: true });
    return items.sort((a, b) => b.m2 - a.m2);
  }, [withIncome, highlighted, hi, lang, t]);
  const noIndex = highlighted.filter((r) => r.income === undefined).map((r) => r.name[lang]);

  const mortgageAll = useMemo(() => data.rows.filter((r) => r.mortgage !== undefined), [data]);
  const domain = useMemo(() => logDomain(mortgageAll.map((r) => r.mortgage!)), [mortgageAll]);
  const midMortgage = mortgageAll.length ? median(mortgageAll.map((r) => r.mortgage!)) : 0;
  const over = mortgageAll.filter((r) => r.mortgage! > 100).length;
  const points = useMemo<SwarmPoint[]>(
    () =>
      mortgageAll
        .filter((r) => inRegion(r, settings.region))
        .map((r) => ({
          key: r.id,
          value: r.mortgage!,
          color: REGION_COLOR[r.region],
          emphasis: hi.has(r.id),
          label: `${r.name[lang]} ${formatShare(r.mortgage! / 100, lang)}`,
          tooltip: cityTip(r, lang, t, rankLine('mortgage', ranks.mortgage.get(r.id), lang, t)),
        })),
    [mortgageAll, settings.region, hi, lang, t, ranks],
  );
  const refs = useMemo<SwarmRef[]>(
    () => [
      { value: 100, label: t(txt.ref100) },
      { value: midMortgage, label: fill(t(txt.refMedian), { value: formatShare(midMortgage / 100, lang) }) },
    ],
    [midMortgage, lang, t],
  );
  const ticks = useMemo(() => logTicks(domain), [domain]);
  const format = useMemo(() => (v: number) => measureTick('mortgage', v, lang), [lang]);
  const date = formatDate(data.retrieved, lang);
  const ranked = useMemo(() => rankByMeasure(data, 'mortgage').filter((c) => inRegion(c.row, settings.region)), [data, settings.region]);
  const best = highlighted
    .map((r) => ({ r, info: ranks.m2.get(r.id) }))
    .filter((x): x is { r: CityRow; info: RankInfo } => x.info !== undefined)
    .sort((a, b) => a.info.rank - b.info.rank)[0];

  return (
    <>
      <Kpis
        label={t(txt.shows.income)}
        items={[
          { value: formatNumber(over, lang), label: fill(t(txt.kpiOver100), { count: formatNumber(over, lang), total: formatNumber(mortgageAll.length, lang) }) },
          { value: formatShare(midMortgage / 100, lang), label: `${t(MEASURE_TEXT.mortgage.name)} · ${fill(t(txt.kpiMedian), { count: formatNumber(mortgageAll.length, lang) })}` },
          best && {
            value: measureText('m2', best.info.value, lang),
            label: `${t(MEASURE_TEXT.m2.name)} · ${fill(t(txt.kpiHighlight), { city: best.r.name[lang], rank: best.info.rank, total: formatNumber(best.info.total, lang) })}`,
          },
        ]}
      />

      <h3 className="re-h">{t(txt.waffleTitle)}</h3>
      <p className="re-lede">{t(txt.waffleLede)}</p>
      <ul className="re-waffles">
        {waffles.map((w) => {
          const flag = w.code ? flagUrl(w.code) : undefined;
          const m2 = measureText('m2', w.m2, lang);
          const years = formatYears(w.years, lang);
          return (
            <li key={w.key} className={w.reference ? 're-waffle-item is-reference' : 're-waffle-item'}>
              <span className="re-waffle-title">
                {flag && <img className="flag" src={flag} alt="" width={20} height={15} loading="lazy" />} {w.title}
              </span>
              <Waffle90 m2={w.m2} label={fill(t(txt.waffleLabel), { name: w.title, m2, years })} />
              <span className="re-waffle-caption">{fill(t(txt.waffleCaption), { m2, years })}</span>
            </li>
          );
        })}
      </ul>
      {noIndex.length > 0 && <p className="chart-note muted">{fill(t(txt.noIndex), { cities: noIndex.join(', ') })}</p>}

      <h3 className="re-h">{t(txt.mortgageTitle)}</h3>
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <RegionField id={`${base}-region`} region={settings.region} update={update} />
        <ViewField base={base} view={settings.view} update={update} />
      </div>
      <Status>
        {fill(t(ui.showingAll), { total: points.length })} · {fill(t(txt.context), { date })}
      </Status>
      {settings.view === 'chart' ? (
        <Swarm
          points={points}
          log
          domain={domain}
          ticks={ticks}
          format={format}
          axisLabel={t(txt.mortgageAxis)}
          refs={refs}
          label={fill(t(txt.mortgageLabel), { count: formatNumber(points.length, lang), over: formatNumber(over, lang) })}
        />
      ) : (
        <CityTable rows={ranked} measure="mortgage" hi={hi} caption={tableCaption(txt.shows.income, 'mortgage', settings.region, date, t)} />
      )}
      <Legend region={settings.region} update={update} />
      <p className="chart-note muted">
        {t(MEASURE_TEXT.mortgage.note)} {t(MEASURE_TEXT.m2.note)}
      </p>
    </>
  );
}

// ── 4. Centre vs outskirts (+ rent) ──────────────────────────────────────────────────────────────

function sortPairs(rows: readonly CityRow[], sort: Sort): CityRow[] {
  const p = (r: CityRow): number => premium(r) ?? 1;
  const tie = (a: CityRow, b: CityRow): number => (a.centreRank ?? 1e6) - (b.centreRank ?? 1e6);
  const out = [...rows];
  if (sort === 'centre') return out.sort((a, b) => b.centre! - a.centre! || tie(a, b));
  if (sort === 'inverse') return out.sort((a, b) => p(a) - p(b) || tie(a, b));
  return out.sort((a, b) => p(b) - p(a) || tie(a, b));
}

export function CentreAngle({ data, settings, update, highlighted, ranks }: Props) {
  const { t, lang } = useLang();
  const base = useId();
  const hi = useMemo(() => new Set(highlighted.map((r) => r.id)), [highlighted]);
  const pairs = useMemo(() => data.rows.filter((r) => r.centre !== undefined && r.outside !== undefined), [data]);
  const domain = useMemo(() => logDomain(pairs.flatMap((r) => [r.centre!, r.outside!])), [pairs]);
  const ordered = useMemo(() => sortPairs(pairs, settings.sort), [pairs, settings.sort]);
  const filtered = useMemo(() => ordered.filter((r) => inRegion(r, settings.region)), [ordered, settings.region]);
  const page = useMemo(() => paginate(filtered, settings.page, PAGE_SIZE), [filtered, settings.page]);
  const position = useMemo(() => new Map(ordered.map((r, i) => [r.id, i + 1])), [ordered]);
  const items = page.items;
  const rows = useMemo<DumbbellRow[]>(
    () =>
      items.map((r) => ({
        key: r.id,
        label: `${position.get(r.id) ?? ''}  ${r.name[lang]}`,
        from: r.outside!,
        to: r.centre!,
        color: REGION_COLOR[r.region],
        valueLabel: formatMultiple(premium(r) ?? 1, lang),
        imageUrl: flagUrl(r.code),
        emphasis: hi.has(r.id),
        tooltip: cityTip(r, lang, t, rankLine('premium', ranks.premium.get(r.id), lang, t)),
      })),
    [items, position, hi, lang, t, ranks],
  );
  const ticks = useMemo(() => logTicks(domain), [domain]);
  const format = useMemo(() => (v: number) => measureTick('centre', v, lang), [lang]);
  const premiums = pairs.map((r) => premium(r) ?? 1);
  const midPremium = premiums.length ? median(premiums) : 1;
  const below = premiums.filter((p) => p < 1).length;
  const widest = sortPairs(pairs, 'premium')[0];

  const rentAll = useMemo(() => data.rows.filter((r) => r.rent !== undefined), [data]);
  const rentDomain = useMemo(() => logDomain(rentAll.map((r) => r.rent!)), [rentAll]);
  const midRent = rentAll.length ? median(rentAll.map((r) => r.rent!)) : 0;
  const rentPoints = useMemo<SwarmPoint[]>(
    () =>
      rentAll
        .filter((r) => inRegion(r, settings.region))
        .map((r) => ({
          key: r.id,
          value: r.rent!,
          color: REGION_COLOR[r.region],
          emphasis: hi.has(r.id),
          label: `${r.name[lang]} ${formatNumber(Math.round(r.rent! * 10) / 10, lang)}`,
          tooltip: cityTip(r, lang, t, rankLine('rent', ranks.rent.get(r.id), lang, t)),
        })),
    [rentAll, settings.region, hi, lang, t, ranks],
  );
  const rentRefs = useMemo<SwarmRef[]>(() => [{ value: midRent, label: fill(t(txt.refMedian), { value: formatYears(midRent, lang) }) }], [midRent, lang, t]);
  const rentTicks = useMemo(() => logTicks(rentDomain), [rentDomain]);
  const rentFormat = useMemo(() => (v: number) => formatNumber(v, lang), [lang]);

  const date = formatDate(data.retrieved, lang);
  const regionName = settings.region === 'all' ? t(ui.allRegions) : t(REGION_LABELS[settings.region]);
  const ranked = useMemo<RankedCity[]>(
    () => filtered.map((r) => ({ row: r, rank: position.get(r.id) ?? 0, value: premium(r) ?? 1 })),
    [filtered, position],
  );
  const jump = (r: CityRow): void => {
    const keep = inRegion(r, settings.region);
    const list = keep ? filtered : ordered;
    const pos = list.findIndex((c) => c.id === r.id);
    if (pos >= 0) update({ region: keep ? settings.region : 'all', page: Math.floor(pos / PAGE_SIZE) + 1, view: 'chart' });
  };

  return (
    <>
      <Kpis
        label={t(txt.shows.centre)}
        items={[
          { value: formatMultiple(midPremium, lang), label: fill(t(txt.kpiPremiumMedian), { count: formatNumber(pairs.length, lang) }) },
          widest && { value: formatMultiple(premium(widest) ?? 1, lang), label: fill(t(MEASURE_TEXT.premium.top), { city: cityWithCountry(widest, lang) }) },
          { value: formatNumber(below, lang), label: fill(t(txt.kpiBelow1), { count: formatNumber(below, lang), total: formatNumber(pairs.length, lang) }) },
        ]}
      />
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <div className="field">
          <label htmlFor={`${base}-sort`}>{t(txt.sort)}</label>
          <select id={`${base}-sort`} value={settings.sort} onChange={(e) => update({ sort: e.target.value as Sort, page: 1 })}>
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {t(txt.sorts[s])}
              </option>
            ))}
          </select>
        </div>
        <RegionField id={`${base}-region`} region={settings.region} update={update} />
        {settings.view === 'chart' && <Pager id={`${base}-page`} page={page} size={PAGE_SIZE} onPage={(p) => update({ page: p })} />}
        <ViewField base={base} view={settings.view} update={update} />
      </div>
      <Finder highlighted={highlighted} list={ordered} rankOf={(r) => position.get(r.id)} onJump={jump} />
      <Status>
        {settings.view === 'chart'
          ? fill(t(ui.showingRange), { from: page.from, to: page.to, total: page.total })
          : fill(t(ui.showingAll), { total: page.total })}
        {' · '}
        {fill(t(txt.context), { date })}
      </Status>
      {settings.view === 'chart' ? (
        <Dumbbell
          rows={rows}
          log
          domain={domain}
          ticks={ticks}
          format={format}
          label={fill(t(txt.dumbbellLabel), { region: regionName, from: page.from, to: page.to, total: page.total, order: t(txt.sorts[settings.sort]) })}
        />
      ) : (
        <CityTable rows={ranked} measure="premium" hi={hi} caption={tableCaption(txt.shows.centre, 'premium', settings.region, date, t)} />
      )}
      <Legend
        region={settings.region}
        update={update}
        extra={
          <>
            <li>
              <span className="legend-item">
                <svg className="re-shape" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <circle cx="7" cy="7" r="5" className="re-shape-from" />
                </svg>
                {t(txt.legendOutside)}
              </span>
            </li>
            <li>
              <span className="legend-item">
                <svg className="re-shape" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <circle cx="7" cy="7" r="5" className="re-shape-to" />
                </svg>
                {t(txt.legendCentre)}
              </span>
            </li>
          </>
        }
      />
      <p className="chart-note muted">{t(MEASURE_TEXT.premium.note)}</p>

      <h3 className="re-h">{t(txt.rentTitle)}</h3>
      {midRent > 0 && <p className="re-lede">{fill(t(txt.rentLede), { years: formatYears(midRent, lang), yield: formatShare(1 / midRent, lang) })}</p>}
      {settings.view === 'chart' && (
        <Swarm
          points={rentPoints}
          log
          domain={rentDomain}
          ticks={rentTicks}
          format={rentFormat}
          axisLabel={t(txt.rentAxis)}
          refs={rentRefs}
          label={fill(t(txt.rentLabel), { count: formatNumber(rentPoints.length, lang), median: formatYears(midRent, lang) })}
        />
      )}
      <p className="chart-note muted">{t(MEASURE_TEXT.rent.note)}</p>
    </>
  );
}

// ── 5. World map ─────────────────────────────────────────────────────────────────────────────────

/** Dot radius per quartile (index 1…4): size repeats the colour step, so the four classes read on small dots too. */
const MAP_RADIUS = [4, 3.5, 4.5, 5.5, 7] as const;

export function MapAngle({ data, settings, update, highlighted, ranks }: Props) {
  const { t, lang } = useLang();
  const base = useId();
  const m = settings.measure;
  const land = useDataset(dataUrl('real-estate-world', LAND_FILE), parseLand);
  const hi = useMemo(() => new Set(highlighted.map((r) => r.id)), [highlighted]);
  const ranked = useMemo(() => rankByMeasure(data, m), [data, m]);
  const breaks = useMemo(() => {
    const v = ranked.map((c) => c.value).sort((a, b) => a - b);
    const q = (p: number): number => v[Math.min(v.length - 1, Math.max(0, Math.round(p * (v.length - 1))))] ?? 0;
    return { min: v[0] ?? 0, q1: q(0.25), q2: q(0.5), q3: q(0.75), max: v[v.length - 1] ?? 0 };
  }, [ranked]);
  const points = useMemo<MapPoint[]>(() => {
    const classOf = (v: number): number => (v <= breaks.q1 ? 1 : v <= breaks.q2 ? 2 : v <= breaks.q3 ? 3 : 4);
    return [...ranked]
      .sort((a, b) => a.value - b.value)
      .map((c) => ({
        key: c.row.id,
        lat: c.row.lat,
        lon: c.row.lon,
        color: HEAT_COLOR[classOf(c.value)]!,
        r: MAP_RADIUS[classOf(c.value)],
        emphasis: hi.has(c.row.id),
        label: `${c.row.name[lang]} ${measureText(m, c.value, lang, 'short')}`,
        tooltip: cityTip(c.row, lang, t, rankLine(m, ranks[m].get(c.row.id), lang, t)),
      }));
  }, [ranked, breaks, hi, m, lang, t, ranks]);
  const focus = useMemo(
    () => (settings.region === 'all' ? undefined : ranked.filter((c) => c.row.region === settings.region).map((c) => c.row.id)),
    [ranked, settings.region],
  );
  const date = formatDate(data.retrieved, lang);
  const missing = data.rows.length - ranked.length;
  const bands: Array<[number, number, number]> = [
    [1, breaks.min, breaks.q1],
    [2, breaks.q1, breaks.q2],
    [3, breaks.q2, breaks.q3],
    [4, breaks.q3, breaks.max],
  ];
  const measureName = t(MEASURE_TEXT[m].name);

  let chart: ReactNode;
  if (settings.view === 'table') {
    chart = <CityTable rows={ranked} measure={m} hi={hi} caption={tableCaption(txt.shows.map, m, 'all', date, t)} />;
  } else if (land.status === 'ready') {
    chart = (
      <PointMap
        points={points}
        land={land.data}
        focus={focus}
        label={fill(t(txt.mapLabel), { count: formatNumber(points.length, lang), measure: measureName, min: measureText(m, breaks.min, lang), max: measureText(m, breaks.max, lang) })}
      />
    );
  } else if (land.status === 'error') {
    chart = (
      <div className="notice notice-warn load-error" role="alert">
        <p>{t(ui.dataLoadError)}</p>
        <button type="button" className="btn btn-ghost" onClick={land.retry}>
          {t(ui.retry)}
        </button>
      </div>
    );
  } else chart = <p className="muted stage-loading">{t(txt.mapLoading)}</p>;

  return (
    <>
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <MeasureField id={`${base}-measure`} measure={m} update={update} />
        <RegionField id={`${base}-region`} region={settings.region} update={update} />
        <ViewField base={base} view={settings.view} update={update} />
      </div>
      <Status>
        {fill(t(ui.showingAll), { total: focus ? focus.length : ranked.length })} ·{' '}
        {focus ? fill(t(txt.mapZoom), { region: t(REGION_LABELS[settings.region as Region]) }) : fill(t(txt.context), { date })}
      </Status>
      {chart}
      <div className="re-map-legend">
        <span className="field-label">{fill(t(txt.mapLegend), { count: formatNumber(ranked.length, lang) })}</span>
        <ul className="legend" aria-label={t(ui.legend)}>
          {bands.map(([k, lo, hiV]) => (
            <li key={k}>
              <span className="legend-item">
                <svg className="re-shape" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <circle cx="8" cy="8" r={MAP_RADIUS[k]} style={{ fill: HEAT_COLOR[k] }} />
                </svg>
                {measureText(m, lo, lang, 'short')} – {measureText(m, hiV, lang, 'short')}
              </span>
            </li>
          ))}
          <li>
            <span className="legend-item">
              <span className="swatch swatch-home" aria-hidden="true" />
              {t(txt.highlightLegend)}
            </span>
          </li>
        </ul>
      </div>
      {missing > 0 && <p className="chart-note muted">{fill(t(txt.mapMissing), { count: formatNumber(missing, lang) })}</p>}
      <p className="chart-note muted">{t(MEASURE_TEXT[m].note)}</p>
    </>
  );
}

// ── 6. Compare ───────────────────────────────────────────────────────────────────────────────────

export function CompareAngle({ highlighted, ranks }: Props) {
  const { t, lang } = useLang();
  if (!highlighted.length) return <p className="re-lede muted">{fill(t(txt.compareEmpty), { n: MAX_CITIES })}</p>;
  return (
    <>
      <ul className="re-compare">
        {highlighted.map((r) => {
          const flag = flagUrl(r.code);
          const country = countryName(r.code, lang);
          return (
            <li key={r.id} className="re-card">
              <h3 className="re-card-title">
                {flag && <img className="flag" src={flag} alt="" width={20} height={15} loading="lazy" />} {r.name[lang]}
                {country !== r.name[lang] && <span className="re-card-country"> · {country}</span>}
              </h3>
              <p className="re-card-region muted">
                <span className="swatch" style={{ background: REGION_COLOR[r.region] }} aria-hidden="true" /> {t(REGION_LABELS[r.region])}
              </p>
              <dl className="re-card-list">
                {MEASURES.map((m) => {
                  const info = ranks[m].get(r.id);
                  const share = info && info.total > 1 ? 1 - (info.rank - 1) / (info.total - 1) : 1;
                  return (
                    <div key={m} className="re-card-item">
                      <dt>{t(MEASURE_TEXT[m].column)}</dt>
                      <dd>
                        <span className="re-card-value">{info ? measureText(m, info.value, lang) : dash}</span>
                        {info && <span className="re-card-rank muted">{fill(t(txt.compareRank), { rank: info.rank, total: info.total })}</span>}
                        {info && (
                          <span className="re-meter" aria-hidden="true">
                            <span style={{ width: `${Math.round(share * 100)}%` }} />
                          </span>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </li>
          );
        })}
      </ul>
      <p className="chart-note muted">{t(txt.compareNote)}</p>
    </>
  );
}
