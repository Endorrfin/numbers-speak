// global-brands-race — Interbrand Best Global Brands 2000–2025 as a bar chart race (CHANGED (S3-br): new entry).
// Layers: data.ts (contract, parser, frames) → state.ts (URL state) → this page (player, race, strip, table).
// The page owns the clock: `time` is a fractional year; Play advances it one frame per tick, the slider and
// the year buttons move it directly. Only the whole year reaches the URL (on pause, at the end, on a jump).
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { BarRace } from '../../charts/BarRace';
import type { BarRaceRow } from '../../charts/renderBarRace';
import { Strip } from '../../charts/Strip';
import type { StripSegment } from '../../charts/renderStrip';
import { usePrefersReducedMotion } from '../../charts/hooks';
import { SECTOR_COLOR } from '../../charts/palette';
import type { VizBodyProps } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import type { Lang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { countryName, flagUrl } from '../../lib/countries';
import { formatShare, formatUsdBillions, formatUsdCompact, formatUsdTick } from '../../lib/format';
import { dataUrl, useDataset } from '../../lib/useDataset';
import {
  DATA_FILE,
  FIRST_YEAR,
  GROUPS,
  GROUP_LABELS,
  LATEST_YEAR,
  SECTOR_LABELS,
  buildFrames,
  groupOf,
  groupShares,
  parseBrandDataset,
  rankYear,
} from './data';
import type { Brand, BrandDataset, Group, RankedBrand } from './data';
import { parseRaceState, toRaceParams } from './state';
import type { RaceState } from './state';

/** Bars on screen. */
export const SLOTS = 12;
/** Frames per year while playing (1 with reduced motion: the race steps year by year, without tweening). */
const STEPS = 8;
/** One year of the race, ms. */
const YEAR_MS = 1600;
/** Transition for a jump (a year button, a group switch) when not playing. */
const JUMP_MS = 350;

type L = { en: string; uk: string };
type T = (v: L) => string;

const parse = (json: unknown): BrandDataset => parseBrandDataset(json);

const txt = {
  groups: { en: 'Sector group', uk: 'Група секторів' },
  allGroups: { en: 'All sectors', uk: 'Усі сектори' },
  player: { en: 'Race controls', uk: 'Керування перегонами' },
  play: { en: 'Play', uk: 'Відтворити' },
  pause: { en: 'Pause', uk: 'Пауза' },
  replay: { en: 'Replay', uk: 'Спочатку' },
  prevYear: { en: 'Previous year', uk: 'Попередній рік' },
  nextYear: { en: 'Next year', uk: 'Наступний рік' },
  slider: { en: 'Year', uk: 'Рік' },
  status: {
    en: '{year} · #1 {leader}, {value} · {count} brands ranked{group}',
    uk: '{year} · №1 {leader}, {value} · брендів у рейтингу: {count}{group}',
  },
  statusGroup: { en: ' in {group}', uk: ' ({group})' },
  statusEmpty: { en: '{year} · no brand of this group is ranked', uk: '{year} · жодного бренду цієї групи в рейтингу' },
  chartLabel: {
    en: 'Bar chart race of brand value, {year}{group}: the {n} most valuable brands. Leader: {leader}. Play or move the year slider; the table view lists every value.',
    uk: 'Перегони стовпців — вартість брендів, {year}{group}: {n} найдорожчих. Лідер: {leader}. Відтворіть або рухайте повзунок року; таблиця містить усі значення.',
  },
  tipSector: { en: 'Sector: {sector} · {group}', uk: 'Сектор: {sector} · {group}' },
  tipCountry: { en: 'Home country: {country}', uk: 'Країна походження: {country}' },
  tipValue: { en: 'Brand value, {year}: {value}', uk: 'Вартість бренду, {year}: {value}' },
  tipRank: { en: 'Interbrand rank, {year}: {rank} of {total}', uk: 'Місце в Interbrand, {year}: {rank} з {total}' },
  tipChange: { en: 'Change vs {prev}: {change}', uk: 'Зміна до {prev}: {change}' },
  tipNew: { en: 'New in the ranking in {year}', uk: 'Новий у рейтингу {year} року' },
  tipOut: { en: 'Not in the ranking in {year}', uk: 'Поза рейтингом у {year} році' },
  shareTitle: {
    en: 'Share of the ranking’s total value by sector group, {year} (total {total})',
    uk: 'Частка загальної вартості рейтингу за групами секторів, {year} (усього {total})',
  },
  shareLabel: {
    en: '100% bar: how the total value of the {year} ranking splits between six sector groups.',
    uk: 'Смуга 100%: як загальна вартість рейтингу {year} року ділиться між шістьма групами секторів.',
  },
  shareTip: { en: '{share} of the total · {count} brands · {value}', uk: '{share} від загальної · брендів: {count} · {value}' },
  colBrand: { en: 'Brand', uk: 'Бренд' },
  colSector: { en: 'Sector', uk: 'Сектор' },
  colCountry: { en: 'Home country', uk: 'Країна' },
  colValue: { en: 'Brand value, US$ bn', uk: 'Вартість, млрд дол. США' },
  colChange: { en: 'Change vs previous year', uk: 'Зміна до попереднього року' },
  isNew: { en: 'new', uk: 'новий' },
  tableCaption: {
    en: 'Interbrand Best Global Brands {year} — {group}',
    uk: 'Interbrand Best Global Brands {year} — {group}',
  },
  noteGroup: {
    en: 'With a group selected, the numbers beside the bars count positions within the group; the tooltip and the table keep Interbrand’s global rank.',
    uk: 'Коли вибрано групу, числа біля стовпців — місця всередині групи; підказка й таблиця зберігають глобальне місце в Interbrand.',
  },
  note: {
    en: 'Interbrand ranked 75 brands in 2000 and 100 in every later year. Nominal US dollars, not adjusted for inflation; 2020–2025 values are rounded to US$ 0.1 bn as published. Frames between two rankings are interpolated.',
    uk: 'У 2000 році Interbrand оцінив 75 брендів, у кожному наступному — 100. Номінальні долари США без поправки на інфляцію; значення 2020–2025 років округлено до 0,1 млрд дол., як опубліковано. Кадри між двома рейтингами інтерпольовано.',
  },
} as const;

const formatChange = (change: number, lang: Lang): string =>
  `${change > 0 ? '+' : change < 0 ? '−' : ''}${formatShare(Math.abs(change), lang)}`;
const usd = (millions: number, lang: Lang): string => formatUsdCompact(millions * 1e6, lang);

export default function GlobalBrandsRace({ params, setParams }: VizBodyProps) {
  const { t } = useLang();
  const settings = useMemo(() => parseRaceState(params), [params]);
  const state = useDataset(dataUrl('global-brands-race', DATA_FILE), parse);
  const update = useCallback(
    (patch: Partial<RaceState>) => setParams(toRaceParams({ ...settings, ...patch })),
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
  } else body = <RaceView dataset={state.data} settings={settings} update={update} />;

  return <div className="viz-body">{body}</div>;
}

type ViewProps = { dataset: BrandDataset; settings: RaceState; update: (patch: Partial<RaceState>) => void };

function RaceView({ dataset, settings, update }: ViewProps) {
  const { t, lang } = useLang();
  const base = useId();
  const reducedMotion = usePrefersReducedMotion();
  const steps = reducedMotion ? 1 : STEPS;
  const frameMs = YEAR_MS / steps;

  // ── Clock ──────────────────────────────────────────────────────────────────────────────────────
  const [time, setTime] = useState<number>(settings.year);
  const [playing, setPlaying] = useState(false);
  // A new URL year (back/forward, a shared link) moves the race — unless the race is already in that year.
  const [syncedYear, setSyncedYear] = useState(settings.year);
  if (syncedYear !== settings.year) {
    setSyncedYear(settings.year);
    if (Math.round(time) !== settings.year) setTime(settings.year);
  }

  const frames = useMemo(
    () => buildFrames(dataset, { steps, top: SLOTS, group: settings.group }),
    [dataset, steps, settings.group],
  );
  const frameIndex = Math.min(frames.length - 1, Math.max(0, Math.round((time - FIRST_YEAR) * steps)));
  const frame = frames[frameIndex]!;
  const year = Math.round(frame.time);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setTime((tm) => Math.min(LATEST_YEAR, (Math.round((tm - FIRST_YEAR) * steps) + 1) / steps + FIRST_YEAR));
    }, frameMs);
    return () => window.clearInterval(id);
  }, [playing, steps, frameMs]);

  // The race ends at the last ranking: stop and put that year into the link.
  useEffect(() => {
    if (playing && time >= LATEST_YEAR) {
      setPlaying(false);
      update({ year: LATEST_YEAR });
    }
  }, [playing, time, update]);

  const commit = (y: number): void => {
    if (y !== settings.year) update({ year: y });
  };
  const togglePlay = (): void => {
    if (playing) {
      setPlaying(false);
      commit(year);
      return;
    }
    if (time >= LATEST_YEAR) setTime(FIRST_YEAR);
    setPlaying(true);
  };
  const jumpTo = (y: number): void => {
    const next = Math.min(LATEST_YEAR, Math.max(FIRST_YEAR, y));
    setPlaying(false);
    setTime(next);
    commit(next);
  };
  // Leaving the chart stops the race; the table shows the year it stopped at.
  const changeView = (view: RaceState['view']): void => {
    setPlaying(false);
    update({ view, year });
  };
  const scrub = (index: number): void => {
    const next = FIRST_YEAR + index / steps;
    setPlaying(false);
    setTime(next);
    commit(Math.round(next));
  };

  // ── Data for the current frame ─────────────────────────────────────────────────────────────────
  const brandById = useMemo(() => new Map(dataset.brands.map((b) => [b.id, b])), [dataset]);
  const ranking = useMemo(() => rankYear(dataset, year), [dataset, year]);
  const rankById = useMemo(() => new Map(ranking.map((r) => [r.brand.id, r])), [ranking]);
  const groupName = settings.group === 'all' ? t(txt.allGroups) : t(GROUP_LABELS[settings.group]);

  const rows = useMemo(
    (): BarRaceRow[] =>
      frame.rows.map((r, i) => {
        const brand = brandById.get(r.id)!;
        return {
          key: r.id,
          label: `${i + 1}  ${brand.name}`,
          value: r.value,
          color: SECTOR_COLOR[groupOf(brand)],
          imageUrl: flagUrl(brand.country),
          tooltip: { title: brand.name, lines: tipLines(brand, rankById.get(r.id), year, ranking.length, t, lang) },
        };
      }),
    [frame, brandById, rankById, year, ranking.length, t, lang],
  );

  // Columns are sized once per race (group), so nothing jumps between frames.
  const longest = useMemo(() => {
    let label = '';
    let top = 0;
    for (const f of frames) {
      for (const r of f.rows) {
        const name = brandById.get(r.id)!.name;
        if (name.length > label.length) label = name;
        top = Math.max(top, r.value);
      }
    }
    return { label: `${SLOTS}  ${label}`, value: usd(top, lang) };
  }, [frames, brandById, lang]);

  const valueFormat = useCallback((v: number) => usd(v, lang), [lang]);
  const tickFormat = useCallback((v: number) => formatUsdTick(v * 1e6, lang), [lang]);

  const leaderRow = frame.rows[0];
  const leader = leaderRow ? brandById.get(leaderRow.id)! : undefined;
  const inGroup = settings.group === 'all' ? ranking : ranking.filter((r) => groupOf(r.brand) === settings.group);
  const groupSuffix = settings.group === 'all' ? '' : fill(t(txt.statusGroup), { group: groupName });
  const yearLeader = inGroup[0];
  const status = yearLeader
    ? fill(t(txt.status), {
        year,
        leader: yearLeader.brand.name,
        value: usd(yearLeader.value, lang),
        count: inGroup.length,
        group: groupSuffix,
      })
    : fill(t(txt.statusEmpty), { year });
  const chartLabel = fill(t(txt.chartLabel), {
    year,
    group: groupSuffix,
    n: Math.min(SLOTS, frame.rows.length),
    leader: leader && leaderRow ? `${leader.name}, ${usd(leaderRow.value, lang)}` : '—',
  });

  const lastIndex = frames.length - 1;
  const atEnd = frameIndex >= lastIndex;
  const playLabel = playing ? t(txt.pause) : atEnd ? t(txt.replay) : t(txt.play);

  return (
    <>
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <div className="field field-chips">
          <span className="field-label" id={`${base}-groups`}>
            {t(txt.groups)}
          </span>
          <ul className="legend chip-row" aria-labelledby={`${base}-groups`}>
            <li>
              <button
                type="button"
                className="legend-item"
                aria-pressed={settings.group === 'all'}
                onClick={() => update({ group: 'all' })}
              >
                {t(txt.allGroups)}
              </button>
            </li>
            {GROUPS.map((g) => (
              <li key={g}>
                <button
                  type="button"
                  className="legend-item"
                  aria-pressed={settings.group === g}
                  onClick={() => update({ group: settings.group === g ? 'all' : g })}
                >
                  <span className="swatch" style={{ background: SECTOR_COLOR[g] }} aria-hidden="true" />
                  {t(GROUP_LABELS[g])}
                </button>
              </li>
            ))}
          </ul>
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
                  onChange={() => changeView(v)}
                />
                {t(v === 'chart' ? ui.viewChart : ui.viewTable)}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="race-player" role="group" aria-label={t(txt.player)}>
        {settings.view === 'chart' && (
          <button type="button" className="btn race-play" aria-pressed={playing} onClick={togglePlay}>
            <PlayIcon playing={playing} replay={!playing && atEnd} />
            {playLabel}
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label={t(txt.prevYear)}
          disabled={frameIndex <= 0}
          onClick={() => jumpTo(Math.ceil(frame.time) - 1)}
        >
          ‹
        </button>
        <input
          type="range"
          className="race-slider"
          id={`${base}-slider`}
          aria-label={t(txt.slider)}
          aria-valuetext={String(year)}
          min={0}
          max={lastIndex}
          step={1}
          value={frameIndex}
          onChange={(e) => scrub(Number(e.target.value))}
        />
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label={t(txt.nextYear)}
          disabled={atEnd}
          onClick={() => jumpTo(Math.floor(frame.time) + 1)}
        >
          ›
        </button>
        <output className="race-year" htmlFor={`${base}-slider`}>
          {year}
        </output>
      </div>

      <p className="viz-status" aria-live={playing ? 'off' : 'polite'}>
        {status}
      </p>

      {settings.view === 'chart' ? (
        <>
          <BarRace
            rows={rows}
            slots={SLOTS}
            duration={reducedMotion ? 0 : playing ? frameMs : JUMP_MS}
            ticker={String(year)}
            longestLabel={longest.label}
            longestValue={longest.value}
            valueFormat={valueFormat}
            tickFormat={tickFormat}
            label={chartLabel}
          />
          <ShareStrip dataset={dataset} year={year} />
        </>
      ) : (
        <BrandTable rows={inGroup} year={year} caption={fill(t(txt.tableCaption), { year, group: groupName })} />
      )}

      <p className="chart-note muted">
        {settings.group !== 'all' && `${t(txt.noteGroup)} `}
        {t(txt.note)}
      </p>
    </>
  );
}

function tipLines(brand: Brand, ranked: RankedBrand | undefined, year: number, total: number, t: T, lang: Lang): string[] {
  const lines = [
    fill(t(txt.tipSector), { sector: t(SECTOR_LABELS[brand.sector]), group: t(GROUP_LABELS[groupOf(brand)]) }),
    fill(t(txt.tipCountry), { country: countryName(brand.country, lang) }),
  ];
  if (!ranked) {
    lines.push(fill(t(txt.tipOut), { year }));
    return lines;
  }
  lines.push(fill(t(txt.tipValue), { year, value: usd(ranked.value, lang) }));
  lines.push(fill(t(txt.tipRank), { year, rank: ranked.rank, total }));
  if (ranked.change !== null) lines.push(fill(t(txt.tipChange), { prev: year - 1, change: formatChange(ranked.change, lang) }));
  else if (year > FIRST_YEAR) lines.push(fill(t(txt.tipNew), { year }));
  return lines;
}

function PlayIcon({ playing, replay }: { playing: boolean; replay: boolean }) {
  // Inline SVG, not a text glyph: ▶ / ⏸ render as emoji on some systems.
  return (
    <svg className="race-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      {playing ? (
        <path d="M4 3h3v10H4zM9 3h3v10H9z" />
      ) : replay ? (
        <path className="race-icon-stroke" d="M3.2 9.5A5 5 0 1 0 4.6 4.4M4.4 1.8v2.8h2.8" />
      ) : (
        <path d="M4 2.5v11l9-5.5z" />
      )}
    </svg>
  );
}

function ShareStrip({ dataset, year }: { dataset: BrandDataset; year: number }) {
  const { t, lang } = useLang();
  const shares = useMemo(() => groupShares(dataset, year), [dataset, year]);
  const titleId = useId();
  const total = shares.reduce((s, g) => s + g.value, 0);
  const segments = useMemo(
    (): StripSegment[] =>
      shares
        .filter((g) => g.value > 0)
        .map((g) => ({
          key: g.group,
          label: t(GROUP_LABELS[g.group]),
          value: g.value,
          valueLabel: formatShare(g.share, lang),
          color: SECTOR_COLOR[g.group],
          tooltip: {
            title: t(GROUP_LABELS[g.group]),
            lines: [fill(t(txt.shareTip), { share: formatShare(g.share, lang), count: g.count, value: usd(g.value, lang) })],
          },
        })),
    [shares, t, lang],
  );
  return (
    <section className="race-share" aria-labelledby={titleId}>
      <h3 className="race-share-title" id={titleId}>
        {fill(t(txt.shareTitle), { year, total: usd(total, lang) })}
      </h3>
      <Strip segments={segments} label={fill(t(txt.shareLabel), { year })} barHeight={28} />
    </section>
  );
}

function BrandTable({ rows, year, caption }: { rows: readonly RankedBrand[]; year: number; caption: string }) {
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
            <th scope="col">{t(txt.colBrand)}</th>
            <th scope="col">{t(txt.colSector)}</th>
            <th scope="col">{t(txt.colCountry)}</th>
            <th scope="col" className="num">
              {t(txt.colValue)}
            </th>
            <th scope="col" className="num">
              {t(txt.colChange)}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const flag = flagUrl(r.brand.country);
            const group: Group = groupOf(r.brand);
            return (
              <tr key={r.brand.id}>
                <td className="num">{r.rank}</td>
                <th scope="row">{r.brand.name}</th>
                <td>
                  <span className="swatch" style={{ background: SECTOR_COLOR[group] }} aria-hidden="true" />{' '}
                  {t(SECTOR_LABELS[r.brand.sector])}
                </td>
                <td>
                  {flag && <img className="flag" src={flag} alt="" width={20} height={15} loading="lazy" />}{' '}
                  {countryName(r.brand.country, lang)}
                </td>
                <td className="num">{formatUsdBillions(r.value * 1e6, lang)}</td>
                <td className="num">{r.change !== null ? formatChange(r.change, lang) : year > FIRST_YEAR ? t(txt.isNew) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
