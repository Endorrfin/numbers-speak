// race.tsx — CHANGED (S3-oil): angle B, sixty years of oil consumption as a bar chart race (BarRace, the brands race's
// player). The page owns the clock: `time` is a fractional year; only the whole year reaches the URL (on pause, at the
// end, on a jump). The USSR is one row until 1984; from 1985 the EI lists its successor states.
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { BarRace } from '../../charts/BarRace';
import type { BarRaceRow } from '../../charts/renderBarRace';
import { usePrefersReducedMotion } from '../../charts/hooks';
import { REGION_COLOR } from '../../charts/palette';
import { useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { countryName, flagUrl } from '../../lib/countries';
import { formatKbd, formatKbdTick, formatNumber, formatShare } from '../../lib/format';
import { REGIONS, REGION_LABELS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { DataState } from './common';
import type { AngleProps } from './common';
import { FILES, consumptionYear, parseConsumption, raceFrames } from './data';
import type { ConsumptionDataset } from './data';
import { txt as shared } from './text';

/** Bars on screen. */
const SLOTS = 12;
/** Frames per year while playing (1 with reduced motion). 61 years × 0.8 s ≈ 49 s for the whole race. */
const STEPS = 6;
const YEAR_MS = 800;
const JUMP_MS = 350;

const parse = (json: unknown): ConsumptionDataset => parseConsumption(json, FILES.consumption);

const txt = {
  player: { en: 'Race controls', uk: 'Керування перегонами' },
  play: { en: 'Play', uk: 'Відтворити' },
  pause: { en: 'Pause', uk: 'Пауза' },
  replay: { en: 'Replay', uk: 'Спочатку' },
  prevYear: { en: 'Previous year', uk: 'Попередній рік' },
  nextYear: { en: 'Next year', uk: 'Наступний рік' },
  slider: { en: 'Year', uk: 'Рік' },
  status: {
    en: '{year} · #1 {leader}, {value} · world {world}',
    uk: '{year} · №1 {leader}, {value} · світ {world}',
  },
  statusRegion: { en: '{year} · {region}: #1 {leader}, {value}', uk: '{year} · {region}: №1 {leader}, {value}' },
  chartLabel: {
    en: 'Bar chart race of oil consumption, barrels a day, {year}{region}: the {n} largest consumers. Leader: {leader}. Play or move the year slider; the table view lists every country of that year.',
    uk: 'Перегони стовпців — споживання нафти, барелів на добу, {year}{region}: {n} найбільших споживачів. Лідер: {leader}. Відтворіть або рухайте повзунок року; таблиця містить усі країни цього року.',
  },
  inRegion: { en: ', {region}', uk: ', {region}' },
  tipUse: { en: 'Consumption, {year}: {value}', uk: 'Споживання, {year}: {value}' },
  tipShare: { en: 'Share of the world: {share}', uk: 'Частка світу: {share}' },
  colUse: { en: 'Consumption, kb/d', uk: 'Споживання, тис. б/д' },
  colShare: { en: 'Share of world', uk: 'Частка у світі' },
  tableCaption: { en: 'Oil consumption by country, {year} — {region}', uk: 'Споживання нафти за країнами, {year} — {region}' },
  note: {
    en: 'Frames between two years are interpolated. Before 1985 several of today’s countries are inside the USSR row; Croatia, Slovenia and North Macedonia start in 1990.',
    uk: 'Кадри між двома роками інтерпольовано. До 1985 року кілька нинішніх країн входять до рядка СРСР; Хорватія, Словенія й Північна Македонія — з 1990 року.',
  },
} as const;

export function RaceAngle({ settings, update }: AngleProps) {
  const state = useDataset(dataUrl('oil', FILES.consumption), parse);
  if (state.status !== 'ready') return <DataState status={state.status} retry={state.status === 'error' ? state.retry : undefined} />;
  return <RaceView ds={state.data} settings={settings} update={update} />;
}

function RaceView({ ds, settings, update }: AngleProps & { ds: ConsumptionDataset }) {
  const { t, lang } = useLang();
  const base = useId();
  const reducedMotion = usePrefersReducedMotion();
  const steps = reducedMotion ? 1 : STEPS;
  const frameMs = YEAR_MS / steps;
  const urlYear = settings.year !== null && settings.year >= ds.from && settings.year <= ds.to ? settings.year : ds.to;

  const [time, setTime] = useState<number>(urlYear);
  const [playing, setPlaying] = useState(false);
  const [syncedYear, setSyncedYear] = useState(urlYear);
  if (syncedYear !== urlYear) {
    setSyncedYear(urlYear);
    if (Math.round(time) !== urlYear) setTime(urlYear);
  }

  const frames = useMemo(() => raceFrames(ds, { steps, top: SLOTS, region: settings.region }), [ds, steps, settings.region]);
  const frameIndex = Math.min(frames.length - 1, Math.max(0, Math.round((time - ds.from) * steps)));
  const frame = frames[frameIndex]!;
  const year = Math.round(frame.time);
  const latest = ds.to;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setTime((tm) => Math.min(latest, (Math.round((tm - ds.from) * steps) + 1) / steps + ds.from));
    }, frameMs);
    return () => window.clearInterval(id);
  }, [playing, steps, frameMs, latest, ds.from]);

  const commit = useCallback((y: number) => update({ year: y === ds.to ? null : y }), [update, ds.to]);
  useEffect(() => {
    if (playing && time >= latest) {
      setPlaying(false);
      commit(latest);
    }
  }, [playing, time, latest, commit]);

  const togglePlay = (): void => {
    if (playing) {
      setPlaying(false);
      commit(year);
      return;
    }
    if (time >= latest) setTime(ds.from);
    setPlaying(true);
  };
  const jumpTo = (y: number): void => {
    const next = Math.min(latest, Math.max(ds.from, y));
    setPlaying(false);
    setTime(next);
    commit(next);
  };
  const scrub = (index: number): void => {
    const next = ds.from + index / steps;
    setPlaying(false);
    setTime(next);
    commit(Math.round(next));
  };

  const world = ds.world[year - ds.from]!;
  const regionName = settings.region === 'all' ? t(ui.allRegions) : t(REGION_LABELS[settings.region]);
  const rows = useMemo(
    (): BarRaceRow[] =>
      frame.rows.map((r, i) => {
        const name = countryName(r.code, lang);
        const exact = ds.rows.find((x) => x.code === r.code)?.values[year - ds.from] ?? null;
        return {
          key: r.code,
          label: `${i + 1}  ${name}`,
          value: r.value,
          color: REGION_COLOR[ds.rows.find((x) => x.code === r.code)!.region],
          imageUrl: flagUrl(r.code),
          tooltip: {
            title: name,
            lines:
              exact === null
                ? []
                : [fill(t(txt.tipUse), { year, value: formatKbd(exact, lang) }), fill(t(txt.tipShare), { share: formatShare(exact / world, lang) })],
          },
        };
      }),
    [frame, ds, year, world, lang, t],
  );

  // Columns sized once per race (region), so nothing jumps between frames.
  const longest = useMemo(() => {
    let label = '';
    let top = 0;
    for (const f of frames) {
      for (const r of f.rows) {
        const name = countryName(r.code, lang);
        if (name.length > label.length) label = name;
        top = Math.max(top, r.value);
      }
    }
    return { label: `${SLOTS}  ${label}`, value: formatKbd(top, lang) };
  }, [frames, lang]);
  const valueFormat = useCallback((v: number) => formatKbd(v, lang), [lang]);
  const tickFormat = useCallback((v: number) => formatKbdTick(v, lang), [lang]);

  const yearRows = useMemo(() => consumptionYear(ds, year, settings.region), [ds, year, settings.region]);
  const leader = yearRows[0];
  const status = leader
    ? settings.region === 'all'
      ? fill(t(txt.status), { year, leader: countryName(leader.code, lang), value: formatKbd(leader.kbd, lang), world: formatKbd(world, lang) })
      : fill(t(txt.statusRegion), { year, region: regionName, leader: countryName(leader.code, lang), value: formatKbd(leader.kbd, lang) })
    : String(year);
  const chartLabel = fill(t(txt.chartLabel), {
    year,
    region: settings.region === 'all' ? '' : fill(t(txt.inRegion), { region: regionName }),
    n: Math.min(SLOTS, frame.rows.length),
    leader: leader ? `${countryName(leader.code, lang)}, ${formatKbd(leader.kbd, lang)}` : '—',
  });

  const lastIndex = frames.length - 1;
  const atEnd = frameIndex >= lastIndex;
  const playLabel = playing ? t(txt.pause) : atEnd ? t(txt.replay) : t(txt.play);

  return (
    <>
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <div className="field">
          <label htmlFor={`${base}-region`}>{t(ui.region)}</label>
          <select
            id={`${base}-region`}
            value={settings.region}
            onChange={(e) => {
              setPlaying(false);
              update({ region: e.target.value as Region | 'all', year: year === ds.to ? null : year });
            }}
          >
            <option value="all">{t(ui.allRegions)}</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {t(REGION_LABELS[r])}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="race-player" role="group" aria-label={t(txt.player)}>
        {settings.view === 'chart' && (
          <button type="button" className="btn race-play" aria-pressed={playing} onClick={togglePlay}>
            <PlayIcon playing={playing} replay={!playing && atEnd} />
            {playLabel}
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-icon" aria-label={t(txt.prevYear)} disabled={frameIndex <= 0} onClick={() => jumpTo(Math.ceil(frame.time) - 1)}>
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
        <button type="button" className="btn btn-ghost btn-icon" aria-label={t(txt.nextYear)} disabled={atEnd} onClick={() => jumpTo(Math.floor(frame.time) + 1)}>
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
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <caption>{fill(t(txt.tableCaption), { year, region: regionName })}</caption>
            <thead>
              <tr>
                <th scope="col" className="num">
                  {t(ui.rank)}
                </th>
                <th scope="col">{t(ui.country)}</th>
                <th scope="col">{t(ui.region)}</th>
                <th scope="col" className="num">
                  {t(txt.colUse)}
                </th>
                <th scope="col" className="num">
                  {t(txt.colShare)}
                </th>
              </tr>
            </thead>
            <tbody>
              {yearRows.map((r) => {
                const flag = flagUrl(r.code);
                return (
                  <tr key={r.code}>
                    <td className="num">{r.rank}</td>
                    <th scope="row">
                      {flag && <img className="flag" src={flag} alt="" width={20} height={15} loading="lazy" />} {countryName(r.code, lang)}
                    </th>
                    <td>
                      <span className="swatch" style={{ background: REGION_COLOR[r.region] }} aria-hidden="true" /> {t(REGION_LABELS[r.region])}
                    </td>
                    <td className="num">{formatNumber(Math.round(r.kbd), lang)}</td>
                    <td className="num">{formatShare(r.share, lang)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ul className="legend" aria-label={t(ui.legend)}>
        {REGIONS.map((r) => (
          <li key={r}>
            <span className="legend-item">
              <span className="swatch" style={{ background: REGION_COLOR[r] }} aria-hidden="true" />
              {t(REGION_LABELS[r])}
            </span>
          </li>
        ))}
      </ul>
      <p className="chart-note muted">
        {t(txt.note)} {t(shared.historic)}
      </p>
    </>
  );
}

function PlayIcon({ playing, replay }: { playing: boolean; replay: boolean }) {
  // Inline SVG, not a text glyph: ▶ / ⏸ render as emoji on some systems (same icon as global-brands-race).
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
