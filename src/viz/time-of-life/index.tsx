// time-of-life — "Human life in numbers": the OECD average day stretched over the 50 years from 15 to 64,
// in six angles (S3-tl). Layers: data.ts (contract + derivations) → state.ts (URL state) → text.ts (labels,
// formats) → this page. Charts: Waffle, Strip (new), RankedBar and Butterfly (reused).
import { useCallback, useId, useMemo } from 'react';
import { Butterfly } from '../../charts/Butterfly';
import { LIFE_COLOR } from '../../charts/palette';
import { RankedBar } from '../../charts/RankedBar';
import type { RankedBarRow } from '../../charts/renderRankedBar';
import type { ButterflyRow } from '../../charts/renderButterfly';
import { ALT_OPACITY } from '../../charts/renderWaffle';
import type { WaffleBlock } from '../../charts/renderWaffle';
import type { StripSegment } from '../../charts/renderStrip';
import { Strip } from '../../charts/Strip';
import { Waffle } from '../../charts/Waffle';
import type { Lang, VizBodyProps } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { countryName, flagUrl } from '../../lib/countries';
import { dataUrl, useDataset } from '../../lib/useDataset';
import {
  AGE_FROM,
  DATA_FILE,
  DISPLAY_IDS,
  GROUP_IDS,
  GROUP_OF,
  MEASURE_IDS,
  OECD,
  SEXES,
  SPAN_WEEKS,
  WEEKS_PER_YEAR,
  activityRows,
  amounts,
  groupRows,
  measureOf,
  minutesFor,
  oecdAverage,
  oecdCount,
  parseTimeUse,
  totalOf,
  weeksOf,
} from './data';
import type { ActivityRow, DisplayId, GroupId, MeasureId, Minutes, Sex, TimeUseDataset } from './data';
import { SHOWS, UNITS, parseLifeState, toLifeParams, usesCountry, usesMeasure, usesSex } from './state';
import type { LifeState, Unit } from './state';
import {
  ACTIVITY_SHORT,
  ACTIVITY_TEXT,
  GROUP_HINT,
  GROUP_TEXT,
  MEASURE_TEXT,
  SEX_TEXT,
  SHOW_TEXT,
  UNIT_TEXT,
  fmtDays,
  fmtDuration,
  fmtDurationSigned,
  fmtHourTick,
  fmtHours,
  fmtNumber,
  fmtShare,
  fmtYears,
  txt,
} from './text';

const DATA_URL = dataUrl('time-of-life', DATA_FILE);
const parse = (json: unknown): TimeUseDataset => parseTimeUse(json);

// Module-level chart options: stable references, so charts redraw only when data changes.
const WEEK_TICKS: ReadonlyArray<[number, string]> = [
  [0, '1'],
  [25, '26'],
  [51, '52'],
];
const rowLabel = (row: number): string | null => (row % 5 === 0 ? String(AGE_FROM + row) : null);
const DAY_TICKS = [0, 180, 360, 540, 720, 900, 1080, 1260, 1440];

const MEASURE_GROUP: Readonly<Record<MeasureId, GroupId>> = {
  free: 'free',
  needs: 'needs',
  duties: 'duties',
  paid: 'duties',
  unpaid: 'duties',
  ...GROUP_OF,
};

/** Activities alternate full / lighter tone inside their group, so neighbours of one colour stay apart. */
function altFlags(rows: readonly ActivityRow[]): Record<DisplayId, boolean> {
  const seen: Partial<Record<GroupId, number>> = {};
  const out = {} as Record<DisplayId, boolean>;
  for (const r of rows) {
    const n = seen[r.group] ?? 0;
    out[r.id] = n % 2 === 1;
    seen[r.group] = n + 1;
  }
  return out;
}

const AGE_MARK = '†';
const mark = (ages: string): string => (ages === '15-64' ? '' : AGE_MARK);

export default function TimeOfLife({ params, setParams }: VizBodyProps) {
  const { t } = useLang();
  const state = useDataset(DATA_URL, parse);

  if (state.status === 'loading') return <p className="muted stage-loading">{t(ui.loading)}</p>;
  if (state.status === 'error') {
    return (
      <div className="notice notice-warn load-error" role="alert">
        <p>{t(ui.dataLoadError)}</p>
        <button type="button" className="btn btn-ghost" onClick={state.retry}>
          {t(ui.retry)}
        </button>
      </div>
    );
  }
  return <LifeView dataset={state.data} params={params} setParams={setParams} />;
}

type ViewProps = { dataset: TimeUseDataset } & VizBodyProps;

function LifeView({ dataset, params, setParams }: ViewProps) {
  const { t, lang } = useLang();
  const base = useId();
  const codes = useMemo(() => dataset.countries.map((c) => c.code), [dataset]);
  const settings = useMemo(() => parseLifeState(params, codes), [params, codes]);
  const update = useCallback(
    (patch: Partial<LifeState>) => setParams(toLifeParams({ ...settings, ...patch })),
    [settings, setParams],
  );
  const average = useMemo(() => oecdAverage(dataset), [dataset]);
  const members = oecdCount(dataset);
  const minutes = minutesFor(dataset, settings.country, settings.sex, average);
  const rows = useMemo(() => activityRows(minutes), [minutes]);
  const groups = useMemo(() => groupRows(rows), [rows]);

  const placeName = useCallback(
    (code: string): string => (code === OECD ? fill(t(txt.oecdAverage), { n: members }) : countryName(code, lang)),
    [t, lang, members],
  );
  const place = placeName(settings.country);
  const who = t(SEX_TEXT[settings.sex]);
  const show = SHOW_TEXT[settings.show];
  const byId = (id: DisplayId): ActivityRow => rows.find((r) => r.id === id)!;
  const group = (id: GroupId) => groups.find((g) => g.id === id)!;

  const sortedCountries = useMemo(
    () => [...dataset.countries].sort((a, b) => countryName(a.code, lang).localeCompare(countryName(b.code, lang), lang)),
    [dataset, lang],
  );
  const ageList = dataset.countries
    .filter((c) => c.ages !== '15-64')
    .map((c) => `${countryName(c.code, lang)} ${c.ages.replace('-', '–').replace(' and more', '+')}`)
    .join(', ');

  const statusPlace = settings.show === 'gender' ? fill(t(txt.allCountries), { n: dataset.countries.length }) : place;
  const statusWho = settings.show === 'gender' ? `${t(txt.women)} / ${t(txt.men)}` : who;

  return (
    <div className="viz-body">
      <ul className="kpi-row" aria-label={t(txt.headline)}>
        <Kpi value={fmtYears(byId('sleep').years, lang)} color={LIFE_COLOR.needs} label={fill(t(txt.kpiSleep), { share: fmtShare(byId('sleep').share, lang) })} />
        <Kpi value={fmtYears(byId('paid-work').years, lang)} color={LIFE_COLOR.duties} label={t(txt.kpiWork)} />
        <Kpi value={fmtYears(amounts(measureOf(minutes, 'unpaid'), totalOf(minutes)).years, lang)} color={LIFE_COLOR.duties} label={t(txt.kpiUnpaid)} />
        <Kpi value={fmtYears(group('free').years, lang)} color={LIFE_COLOR.free} label={t(txt.kpiFree)} />
      </ul>

      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <div className="field field-subtabs">
          <span className="field-label" id={`${base}-show`}>
            {t(txt.angle)}
          </span>
          <div className="subtabs" role="radiogroup" aria-labelledby={`${base}-show`}>
            {SHOWS.map((s) => (
              <label key={s} className={settings.show === s ? 'is-on' : undefined}>
                <input type="radio" name={`${base}-show`} value={s} checked={settings.show === s} onChange={() => update({ show: s })} />
                <span className="subtab-key" aria-hidden="true">
                  {SHOW_TEXT[s].key}
                </span>
                {t(SHOW_TEXT[s].tab)}
              </label>
            ))}
          </div>
        </div>

        {usesCountry(settings.show) && (
          <div className="field">
            <label htmlFor={`${base}-country`}>{t(txt.country)}</label>
            <select id={`${base}-country`} value={settings.country} onChange={(e) => update({ country: e.target.value })}>
              <option value={OECD}>{fill(t(txt.oecdAverage), { n: members })}</option>
              <optgroup label={t(txt.oecdGroup)}>
                {sortedCountries.filter((c) => c.oecd).map((c) => (
                  <option key={c.code} value={c.code}>
                    {countryName(c.code, lang)}
                    {mark(c.ages)} · {c.surveyYear}
                  </option>
                ))}
              </optgroup>
              <optgroup label={t(txt.partnerGroup)}>
                {sortedCountries.filter((c) => !c.oecd).map((c) => (
                  <option key={c.code} value={c.code}>
                    {countryName(c.code, lang)}
                    {mark(c.ages)} · {c.surveyYear}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        )}

        {usesMeasure(settings.show) && (
          <div className="field">
            <label htmlFor={`${base}-measure`}>{t(txt.measure)}</label>
            <select id={`${base}-measure`} value={settings.measure} onChange={(e) => update({ measure: e.target.value as MeasureId })}>
              <optgroup label={t(txt.groupsGroup)}>
                {MEASURE_IDS.filter((m) => !(DISPLAY_IDS as readonly string[]).includes(m)).map((m) => (
                  <option key={m} value={m}>
                    {t(MEASURE_TEXT[m])}
                  </option>
                ))}
              </optgroup>
              <optgroup label={t(txt.activitiesGroup)}>
                {DISPLAY_IDS.map((m) => (
                  <option key={m} value={m}>
                    {t(ACTIVITY_SHORT[m])}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        )}

        {usesSex(settings.show) && (
          <Segmented
            id={`${base}-sex`}
            label={t(txt.sex)}
            options={SEXES.map((s) => ({ value: s, label: t(SEX_TEXT[s]) }))}
            value={settings.sex}
            onChange={(sex) => update({ sex })}
          />
        )}

        {settings.show === 'ranking' && (
          <Segmented
            id={`${base}-unit`}
            label={t(txt.unit)}
            options={UNITS.map((u) => ({ value: u, label: t(UNIT_TEXT[u]) }))}
            value={settings.unit}
            onChange={(unit) => update({ unit })}
          />
        )}

        <Segmented
          id={`${base}-view`}
          label={t(ui.view)}
          options={(['chart', 'table'] as const).map((v) => ({ value: v, label: t(v === 'chart' ? ui.viewChart : ui.viewTable) }))}
          value={settings.view}
          onChange={(view) => update({ view })}
        />
      </div>

      <p className="viz-status" aria-live="polite">
        {fill(t(txt.status), { key: show.key, name: t(show.tab), place: statusPlace, who: statusWho })}
      </p>

      {settings.view === 'chart' ? (
        <ChartArea dataset={dataset} settings={settings} rows={rows} place={place} placeName={placeName} />
      ) : settings.show === 'countries' || settings.show === 'gender' ? (
        <CountryTable dataset={dataset} settings={settings} average={average} placeName={placeName} />
      ) : (
        <ActivityTable rows={rows} caption={fill(t(txt.tableActivities), { place, who })} />
      )}

      <div className="notice coverage-note">
        <p>{fill(t(txt.method), { n: members })}</p>
        <p>{fill(t(txt.ageNote), { list: ageList })}</p>
        <p>{t(txt.noUkraine)}</p>
      </div>
    </div>
  );
}

function Kpi({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <li className="kpi">
      <span className="kpi-value">{value}</span>
      <span className="kpi-label">
        <span className="swatch" style={{ background: color }} aria-hidden="true" /> {label}
      </span>
    </li>
  );
}

function Segmented<T extends string>(props: {
  id: string;
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="field field-auto">
      <span className="field-label" id={props.id}>
        {props.label}
      </span>
      <div className="segmented" role="radiogroup" aria-labelledby={props.id}>
        {props.options.map((o) => (
          <label key={o.value} className={props.value === o.value ? 'is-on' : undefined}>
            <input
              type="radio"
              name={props.id}
              value={o.value}
              checked={props.value === o.value}
              onChange={() => props.onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Chart area: intro, legend, chart and "what you see / keep in mind" ─────────────────────────────
type ChartProps = {
  dataset: TimeUseDataset;
  settings: LifeState;
  rows: ActivityRow[];
  place: string;
  placeName: (code: string) => string;
};

function ChartArea({ dataset, settings, rows, place, placeName }: ChartProps) {
  const { t, lang } = useLang();
  const show = settings.show;
  const text = SHOW_TEXT[show];
  const who = t(SEX_TEXT[settings.sex]);
  const byId = (id: DisplayId): ActivityRow => rows.find((r) => r.id === id)!;
  const groups = useMemo(() => groupRows(rows), [rows]);
  const average = useMemo(() => oecdAverage(dataset), [dataset]);

  // Values for the "what you see" sentences.
  const ranked = useMemo(
    () =>
      dataset.countries
        .map((c) => ({ code: c.code, value: measureOf(c.minutes[settings.sex], settings.measure) }))
        .sort((a, b) => b.value - a.value),
    [dataset, settings.sex, settings.measure],
  );
  const womenAvg = measureOf(average.women, settings.measure);
  const menAvg = measureOf(average.men, settings.measure);
  const values: Record<string, string | number> = {
    sleepUntil: Math.round(AGE_FROM + byId('sleep').years),
    free: fmtYears(groups.find((g) => g.id === 'free')!.years, lang),
    needs: fmtYears(groups.find((g) => g.id === 'needs')!.years, lang),
    duties: fmtYears(groups.find((g) => g.id === 'duties')!.years, lang),
    sleepDay: fmtDuration(byId('sleep').minutes, lang),
    workDay: fmtDuration(byId('paid-work').minutes, lang),
    work: fmtYears(byId('paid-work').years, lang),
    housework: fmtYears(byId('housework').years, lang),
    tv: fmtYears(byId('tv').years, lang),
    top: countryName(ranked[0]!.code, lang),
    topValue: fmtDuration(ranked[0]!.value, lang),
    bottom: countryName(ranked[ranked.length - 1]!.code, lang),
    bottomValue: fmtDuration(ranked[ranked.length - 1]!.value, lang),
    women: fmtDuration(womenAvg, lang),
    men: fmtDuration(menAvg, lang),
    gapYears: fmtYears((Math.abs(womenAvg - menAvg) / 1440) * 50, lang),
  };

  return (
    <>
      <p className="show-intro">{t(text.intro)}</p>
      {show === 'weeks' && <WeeksChart rows={rows} place={place} who={who} />}
      {show === 'day' && <DayChart rows={rows} place={place} who={who} />}
      {show === 'ranking' && <RankingChart rows={rows} unit={settings.unit} place={place} who={who} />}
      {show === 'groups' && <GroupsChart rows={rows} place={place} who={who} />}
      {show === 'countries' && (
        <CountriesChart dataset={dataset} settings={settings} average={average} placeName={placeName} />
      )}
      {show === 'gender' && <GenderChart dataset={dataset} measure={settings.measure} average={average} placeName={placeName} />}
      <dl className="pros-cons">
        <div>
          <dt>{t(txt.see)}</dt>
          <dd>{fill(t(text.see), values)}</dd>
        </div>
        <div>
          <dt>{t(txt.mind)}</dt>
          <dd>{fill(t(text.mind), values)}</dd>
        </div>
      </dl>
    </>
  );
}

/** Legend with the value of every activity — identity is never colour alone. */
function ActivityKey({ rows, value }: { rows: readonly ActivityRow[]; value: (r: ActivityRow) => string }) {
  const { t } = useLang();
  const alt = altFlags(rows);
  return (
    <ul className="key-list life-key" aria-label={t(txt.legend)}>
      {rows.map((r) => (
        <li key={r.id}>
          <span
            className="swatch"
            style={{ background: LIFE_COLOR[r.group], opacity: alt[r.id] ? ALT_OPACITY : 1 }}
            aria-hidden="true"
          />
          <span>
            {t(ACTIVITY_SHORT[r.id])} <b>{value(r)}</b>
          </span>
        </li>
      ))}
    </ul>
  );
}

function tip(r: ActivityRow, lang: Lang, t: (l: { en: string; uk: string }) => string) {
  return {
    title: t(ACTIVITY_TEXT[r.id]),
    lines: [
      fill(t(txt.ofSpan), { value: fmtYears(r.years, lang) }),
      fill(t(txt.perDay), { value: fmtDuration(r.minutes, lang) }),
      fill(t(txt.shareOf), { share: fmtShare(r.share, lang) }),
    ],
  };
}

function WeeksChart({ rows, place, who }: { rows: ActivityRow[]; place: string; who: string }) {
  const { t, lang } = useLang();
  const blocks = useMemo<WaffleBlock[]>(() => {
    const alt = altFlags(rows);
    const weeks = weeksOf(rows, SPAN_WEEKS);
    return rows.map((r, i) => ({
      key: r.id,
      count: weeks[i]!.weeks,
      color: LIFE_COLOR[r.group],
      alt: alt[r.id],
      label: `${t(ACTIVITY_SHORT[r.id])} · ${fmtYears(r.years, lang)}`,
      tooltip: { ...tip(r, lang, t), lines: [fill(t(txt.weeksUnit), { n: fmtNumber(weeks[i]!.weeks, lang) }), ...tip(r, lang, t).lines] },
    }));
  }, [rows, lang, t]);
  const items = rows.map((r) => `${t(ACTIVITY_SHORT[r.id])} ${fmtYears(r.years, lang)}`).join(', ');
  return (
    <>
      <ActivityKey rows={rows} value={(r) => fmtYears(r.years, lang)} />
      <Waffle
        blocks={blocks}
        label={fill(t(txt.weeksLabel), { place, who, items })}
        columns={WEEKS_PER_YEAR}
        rowLabel={rowLabel}
        columnTicks={WEEK_TICKS}
      />
    </>
  );
}

function DayChart({ rows, place, who }: { rows: ActivityRow[]; place: string; who: string }) {
  const { t, lang } = useLang();
  const segments = useMemo<StripSegment[]>(() => {
    const alt = altFlags(rows);
    return rows.map((r) => ({
      key: r.id,
      label: t(ACTIVITY_SHORT[r.id]),
      value: r.minutes,
      valueLabel: fmtDuration(r.minutes, lang),
      color: LIFE_COLOR[r.group],
      alt: alt[r.id],
      tooltip: tip(r, lang, t),
    }));
  }, [rows, lang, t]);
  const ticks = useMemo(() => ({ values: DAY_TICKS, format: (v: number) => fmtHourTick(v, lang) }), [lang]);
  const items = rows.map((r) => `${t(ACTIVITY_SHORT[r.id])} ${fmtDuration(r.minutes, lang)}`).join(', ');
  return (
    <>
      <ActivityKey rows={rows} value={(r) => fmtDuration(r.minutes, lang)} />
      <Strip segments={segments} ticks={ticks} label={fill(t(txt.dayLabel), { place, who, items })} />
    </>
  );
}

function unitValue(r: ActivityRow, unit: Unit): number {
  return unit === 'years' ? r.years : unit === 'days' ? r.days : unit === 'hours' ? r.hours : r.share;
}
function unitFormat(v: number, unit: Unit, lang: Lang): string {
  return unit === 'years' ? fmtYears(v, lang) : unit === 'days' ? fmtDays(v, lang) : unit === 'hours' ? fmtHours(v, lang) : fmtShare(v, lang);
}
function unitTick(v: number, unit: Unit, lang: Lang): string {
  if (unit === 'share') return fmtShare(v, lang).replace(/[.,]0(?=\s?%)/, '');
  return fmtNumber(v, lang, unit === 'years' && v < 10 && v % 1 !== 0 ? 1 : 0);
}

function RankingChart({ rows, unit, place, who }: { rows: ActivityRow[]; unit: Unit; place: string; who: string }) {
  const { t, lang } = useLang();
  const bars = useMemo<RankedBarRow[]>(
    () =>
      [...rows]
        .sort((a, b) => b.minutes - a.minutes)
        .map((r) => ({
          key: r.id,
          label: t(ACTIVITY_SHORT[r.id]),
          value: unitValue(r, unit),
          color: LIFE_COLOR[r.group],
          valueLabel: unitFormat(unitValue(r, unit), unit, lang),
          tooltip: tip(r, lang, t),
        })),
    [rows, unit, lang, t],
  );
  const tickFormat = useCallback((v: number) => unitTick(v, unit, lang), [unit, lang]);
  return (
    <>
      <GroupKey />
      <RankedBar rows={bars} label={fill(t(txt.rankingLabel), { unit: t(UNIT_TEXT[unit]).toLowerCase(), place, who })} tickFormat={tickFormat} />
    </>
  );
}

function GroupKey() {
  const { t } = useLang();
  return (
    <ul className="key-list" aria-label={t(txt.legend)}>
      {GROUP_IDS.map((g) => (
        <li key={g}>
          <span className="swatch" style={{ background: LIFE_COLOR[g] }} aria-hidden="true" />
          {t(GROUP_TEXT[g])}
        </li>
      ))}
    </ul>
  );
}

function GroupsChart({ rows, place, who }: { rows: ActivityRow[]; place: string; who: string }) {
  const { t, lang } = useLang();
  const groups = useMemo(() => groupRows(rows), [rows]);
  const segments = useMemo<StripSegment[]>(
    () =>
      groups.map((g) => ({
        key: g.id,
        label: t(GROUP_TEXT[g.id]),
        value: g.minutes,
        valueLabel: fmtYears(g.years, lang),
        color: LIFE_COLOR[g.id],
        tooltip: {
          title: t(GROUP_TEXT[g.id]),
          lines: [fill(t(txt.ofSpan), { value: fmtYears(g.years, lang) }), fill(t(txt.perDay), { value: fmtDuration(g.minutes, lang) })],
        },
      })),
    [groups, lang, t],
  );
  const items = groups.map((g) => `${t(GROUP_TEXT[g.id])} ${fmtYears(g.years, lang)}`).join(', ');
  return (
    <>
      <Strip segments={segments} barHeight={56} label={fill(t(txt.groupsLabel), { place, who, items })} />
      <div className="life-groups">
        {groups
          .filter((g) => g.id !== 'other')
          .map((g) => (
            <section key={g.id} className={`life-group life-group-${g.id}`}>
              <h3>
                <span className="swatch" style={{ background: LIFE_COLOR[g.id] }} aria-hidden="true" /> {t(GROUP_TEXT[g.id])}
              </h3>
              <p className="life-group-value">{fmtYears(g.years, lang)}</p>
              <p className="life-group-hint">
                {fmtShare(g.share, lang)} · {t(GROUP_HINT[g.id])}
              </p>
              <ul>
                {g.activities.map((a) => (
                  <li key={a.id}>
                    <span>{t(ACTIVITY_SHORT[a.id])}</span>
                    <b>{fmtYears(a.years, lang)}</b>
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>
    </>
  );
}

type CountryChartProps = {
  dataset: TimeUseDataset;
  average: Record<Sex, Minutes>;
  placeName: (code: string) => string;
};

function CountriesChart({ dataset, settings, average, placeName }: CountryChartProps & { settings: LifeState }) {
  const { t, lang } = useLang();
  const { measure, sex, country } = settings;
  const color = LIFE_COLOR[MEASURE_GROUP[measure]];
  const bars = useMemo<RankedBarRow[]>(() => {
    const list = [
      { code: OECD, ages: '15-64', value: measureOf(average[sex], measure) },
      ...dataset.countries.map((c) => ({ code: c.code, ages: c.ages, value: measureOf(c.minutes[sex], measure) })),
    ].sort((a, b) => b.value - a.value);
    return list.map((c) => ({
      key: c.code,
      label: `${c.code === OECD ? t(txt.oecdShort) : countryName(c.code, lang)}${mark(c.ages)}`,
      value: c.value / 60, // hours: the axis gets round ticks (0, 1, 2 … h)
      color: c.code === OECD || c.code === country ? 'var(--accent)' : color,
      valueLabel: fmtDuration(c.value, lang),
      imageUrl: c.code === OECD ? undefined : flagUrl(c.code),
      tooltip: {
        title: placeName(c.code),
        lines: [
          fill(t(txt.perDay), { value: fmtDuration(c.value, lang) }),
          fill(t(txt.ofSpan), { value: fmtYears((c.value / 1440) * 50, lang) }),
        ],
      },
    }));
  }, [dataset, average, sex, measure, country, color, lang, t, placeName]);
  const tickFormat = useCallback((hours: number) => fmtHourTick(hours * 60, lang), [lang]);
  return (
    <>
      <ul className="key-list" aria-label={t(txt.legend)}>
        <li>
          <span className="swatch" style={{ background: color }} aria-hidden="true" />
          {t(MEASURE_TEXT[measure])}
        </li>
        <li>
          <span className="swatch" style={{ background: 'var(--accent)' }} aria-hidden="true" />
          {t(txt.highlightKey)}
        </li>
      </ul>
      <RankedBar
        rows={bars}
        label={fill(t(txt.countriesLabel), { measure: t(MEASURE_TEXT[measure]), who: t(SEX_TEXT[sex]).toLowerCase() })}
        tickFormat={tickFormat}
      />
    </>
  );
}

function GenderChart({ dataset, measure, average, placeName }: CountryChartProps & { measure: MeasureId }) {
  const { t, lang } = useLang();
  const rows = useMemo<ButterflyRow[]>(() => {
    const list = [
      { code: OECD, ages: '15-64', women: measureOf(average.women, measure), men: measureOf(average.men, measure) },
      ...dataset.countries.map((c) => ({
        code: c.code,
        ages: c.ages,
        women: measureOf(c.minutes.women, measure),
        men: measureOf(c.minutes.men, measure),
      })),
    ].sort((a, b) => b.women - b.men - (a.women - a.men));
    return list.map((c) => ({
      key: c.code,
      label: `${c.code === OECD ? t(txt.oecdShort) : countryName(c.code, lang)}${mark(c.ages)}`,
      left: c.women / 60, // hours: round axis ticks
      right: c.men / 60,
      leftLabel: fmtDuration(c.women, lang),
      rightLabel: fmtDuration(c.men, lang),
      imageUrl: c.code === OECD ? undefined : flagUrl(c.code),
      tint: c.women > c.men,
      highlight: c.code === OECD,
      tooltip: {
        title: placeName(c.code),
        lines: [
          `${t(txt.women)}: ${fmtDuration(c.women, lang)}`,
          `${t(txt.men)}: ${fmtDuration(c.men, lang)}`,
          `${t(txt.gap)}: ${fmtDurationSigned(c.women - c.men, lang)}`,
        ],
      },
    }));
  }, [dataset, average, measure, lang, t, placeName]);
  const tickFormat = useCallback((hours: number) => fmtHourTick(hours * 60, lang), [lang]);
  return (
    <>
      <ul className="key-list" aria-label={t(txt.legend)}>
        <li>
          <span className="swatch" style={{ background: LIFE_COLOR.women }} aria-hidden="true" />
          {t(txt.women)}
        </li>
        <li>
          <span className="swatch" style={{ background: LIFE_COLOR.men }} aria-hidden="true" />
          {t(txt.men)}
        </li>
        <li>
          <span className="swatch swatch-tint" aria-hidden="true" />
          {t(txt.moreWomen)}
        </li>
      </ul>
      <Butterfly
        rows={rows}
        label={fill(t(txt.genderLabel), { measure: t(MEASURE_TEXT[measure]) })}
        tickFormat={tickFormat}
        leftColor={LIFE_COLOR.women}
        rightColor={LIFE_COLOR.men}
        leftTitle={t(txt.women)}
        rightTitle={t(txt.men)}
      />
    </>
  );
}

// ── Tables: the keyboard / screen-reader path ─────────────────────────────────────────────────────
function ActivityTable({ rows, caption }: { rows: ActivityRow[]; caption: string }) {
  const { t, lang } = useLang();
  const weeks = weeksOf(rows, SPAN_WEEKS);
  const total = rows.reduce((s, r) => s + r.minutes, 0);
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t(txt.group)}</th>
            <th scope="col">{t(txt.activity)}</th>
            <th scope="col" className="num">{t(txt.colPerDay)}</th>
            <th scope="col" className="num">{t(txt.colShare)}</th>
            <th scope="col" className="num">{t(txt.colYears)}</th>
            <th scope="col" className="num">{t(txt.colDays)}</th>
            <th scope="col" className="num">{t(txt.colHours)}</th>
            <th scope="col" className="num">{t(txt.colWeeks)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td>{t(GROUP_TEXT[r.group])}</td>
              <th scope="row">{t(ACTIVITY_TEXT[r.id])}</th>
              <td className="num">{fmtDuration(r.minutes, lang)}</td>
              <td className="num">{fmtShare(r.share, lang)}</td>
              <td className="num">{fmtNumber(r.years, lang, 2)}</td>
              <td className="num">{fmtNumber(r.days, lang)}</td>
              <td className="num">{fmtNumber(r.hours, lang)}</td>
              <td className="num">{fmtNumber(weeks[i]!.weeks, lang)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td />
            <th scope="row">{t(txt.total)}</th>
            <td className="num">{fmtDuration(total, lang)}</td>
            <td className="num">{fmtShare(1, lang)}</td>
            <td className="num">{fmtNumber(50, lang, 2)}</td>
            <td className="num">{fmtNumber(rows.reduce((s, r) => s + r.days, 0), lang)}</td>
            <td className="num">{fmtNumber(rows.reduce((s, r) => s + r.hours, 0), lang)}</td>
            <td className="num">{fmtNumber(SPAN_WEEKS, lang)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function CountryTable({ dataset, settings, average, placeName }: CountryChartProps & { settings: LifeState }) {
  const { t, lang } = useLang();
  const { measure } = settings;
  const list = [
    { code: OECD, surveyYear: '—', ages: '15-64', minutes: average },
    ...[...dataset.countries].sort((a, b) => measureOf(b.minutes.total, measure) - measureOf(a.minutes.total, measure)),
  ];
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{fill(t(txt.tableCountries), { measure: t(MEASURE_TEXT[measure]) })}</caption>
        <thead>
          <tr>
            <th scope="col">{t(txt.country)}</th>
            <th scope="col">{t(txt.colSurvey)}</th>
            <th scope="col">{t(txt.colAges)}</th>
            <th scope="col" className="num">{t(txt.everyone)}</th>
            <th scope="col" className="num">{t(txt.women)}</th>
            <th scope="col" className="num">{t(txt.men)}</th>
            <th scope="col" className="num">{t(txt.gap)}</th>
          </tr>
        </thead>
        <tbody>
          {list.map((c) => {
            const v = (s: Sex) => measureOf(c.minutes[s], measure);
            return (
              <tr key={c.code} className={c.code === settings.country ? 'is-home' : undefined}>
                <th scope="row">
                  {placeName(c.code)}
                  {mark(c.ages)}
                </th>
                <td>{c.surveyYear}</td>
                <td>{c.ages.replace('-', '–').replace(' and more', '+')}</td>
                <td className="num">{fmtDuration(v('total'), lang)}</td>
                <td className="num">{fmtDuration(v('women'), lang)}</td>
                <td className="num">{fmtDuration(v('men'), lang)}</td>
                <td className="num">{fmtDurationSigned(v('women') - v('men'), lang)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

