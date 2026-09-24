// air-attacks-on-ukraine — missiles and drones launched at Ukraine, 2022–2026: five angles on the Air Force
// reports + HRMMU civilian casualties (S3-aa). Layers: data.ts (contract + derivations) → state.ts (URL state)
// → specs.ts (chart specs, formatters) → text.ts (page copy) → this page. CHANGED (S3-aa): new.
import { useCallback, useId, useMemo } from 'react';
import type { ReactNode } from 'react';
import { CalendarHeatmap } from '../../charts/CalendarHeatmap'; // CHANGED (S3-aa3): new
import { StackedRows } from '../../charts/StackedRows';
import { TimeSeries } from '../../charts/TimeSeries';
import { AIR_COLOR } from '../../charts/palette';
import type { Lang, VizBodyProps } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { dataUrl, useDataset } from '../../lib/useDataset';
import {
  CIVILIANS_FILE,
  CLASSES,
  DATA_FILE,
  MISSILE_CLASSES,
  RANKS,
  RATE_MIN,
  STEPS,
  WHO,
  aggregate,
  coversAttackData,
  largestReports,
  launchedInMonths,
  modelTotals,
  parseAttacks,
  parseCivilians,
  rate,
  summarize,
  yearsOf,
} from './data';
import type { AttacksDataset, Bucket, CivilianYear, CiviliansDataset, ModelRow, Period, Rank, ReportTotals, Step, Summary, Totals, Who } from './data';
import { CLASS_LABEL, CLASS_MEMBERS, CLASS_SHORT, modelLabel } from './labels';
import {
  RATE_CLASSES,
  bucketLabel,
  calendarSpec,
  civiliansSpec,
  dateLabel,
  dec1,
  harmParts,
  int,
  interceptionSpec,
  largestSpec,
  monthsLabel,
  pct,
  perHundred,
  s as cs,
  timelineSpec,
  typesSpec,
  windowLabel,
} from './specs';
import { MODES, SHOWS, parseAirState, toAirParams } from './state';
import type { AirState, Mode, Show } from './state';
import { SHOW_TEXT, STEP_WORD, txt } from './text';

const ID = 'air-attacks-on-ukraine';
const ATTACKS_URL = dataUrl(ID, DATA_FILE);
const CIVILIANS_URL = dataUrl(ID, CIVILIANS_FILE);
const parseA = (json: unknown): AttacksDataset => parseAttacks(json);
const parseC = (json: unknown): CiviliansDataset => parseCivilians(json);
const LARGEST_N = 15;
const MODELS_N = 12;

export default function AirAttacksOnUkraine({ params, setParams }: VizBodyProps) {
  const { t } = useLang();
  const attacks = useDataset(ATTACKS_URL, parseA);
  const civilians = useDataset(CIVILIANS_URL, parseC);
  const years = useMemo(() => (attacks.status === 'ready' ? yearsOf(attacks.data) : []), [attacks]);
  const settings = useMemo(() => parseAirState(params, years), [params, years]);
  const update = useCallback(
    (patch: Partial<AirState>) => setParams(toAirParams({ ...settings, ...patch })),
    [settings, setParams],
  );

  const failed = attacks.status === 'error' ? attacks : civilians.status === 'error' ? civilians : null;
  if (failed) {
    return (
      <div className="notice notice-warn load-error" role="alert">
        <p>{t(ui.dataLoadError)}</p>
        <button type="button" className="btn btn-ghost" onClick={failed.retry}>
          {t(ui.retry)}
        </button>
      </div>
    );
  }
  if (attacks.status !== 'ready' || civilians.status !== 'ready') return <p className="muted stage-loading">{t(ui.loading)}</p>;
  return <AirView ds={attacks.data} civ={civilians.data} settings={settings} update={update} />;
}

type ViewProps = {
  ds: AttacksDataset;
  civ: CiviliansDataset;
  settings: AirState;
  update: (patch: Partial<AirState>) => void;
};

function AirView({ ds, civ, settings, update }: ViewProps) {
  const { t, lang } = useLang();
  const base = useId();
  const { show, period, step, mode, rank, who, view } = settings;
  const years = useMemo(() => yearsOf(ds), [ds]);
  const summary = useMemo(() => summarize(ds, period), [ds, period]);
  const effStep: Step = show === 'interception' ? 'month' : show === 'calendar' ? 'day' : step; // CHANGED (S3-aa3): day buckets for the calendar
  const buckets = useMemo(() => aggregate(ds, effStep, period), [ds, effStep, period]);
  const scope =
    period === 'all'
      ? fill(t(txt.scopeAll), { from: dateLabel(ds.first, lang), to: dateLabel(ds.last, lang) })
      : fill(t(txt.scopeYear), { year: period });
  const scopeLc = period === 'all' ? fill(t(txt.scopeAllLc), { from: dateLabel(ds.first, lang) }) : fill(t(txt.scopeYearLc), { year: period });
  const text = SHOW_TEXT[show];
  const usesPeriod = show !== 'civilians';
  const usesStep = show === 'timeline' || show === 'types';
  const statusScope = show === 'civilians' ? '2023 – 2026*' : `${scope}${usesStep ? fill(t(txt.byStep), { step: t(STEP_WORD[effStep]) }) : ''}`;
  const angle: AngleProps = { ds, buckets, summary, settings, scope, scopeLc };

  return (
    <div className="viz-body">
      <Kpis summary={summary} period={period} />

      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <div className="field field-subtabs">
          <span className="field-label" id={`${base}-show`}>
            {t(txt.angle)}
          </span>
          <div className="subtabs" role="radiogroup" aria-labelledby={`${base}-show`}>
            {SHOWS.map((v) => (
              <label key={v} className={show === v ? 'is-on' : undefined}>
                <input type="radio" name={`${base}-show`} value={v} checked={show === v} onChange={() => update({ show: v })} />
                <span className="subtab-key" aria-hidden="true">
                  {SHOW_TEXT[v].key}
                </span>
                {t(SHOW_TEXT[v].tab)}
              </label>
            ))}
          </div>
        </div>
        {usesPeriod && (
          <Segmented
            id={`${base}-period`}
            label={t(txt.period)}
            value={String(period)}
            options={[{ value: 'all', label: t(txt.allYears) }, ...years.map((y) => ({ value: String(y), label: String(y) }))]}
            onChange={(v) => update({ period: v === 'all' ? 'all' : Number(v) })}
          />
        )}
        {usesStep && (
          <Segmented
            id={`${base}-step`}
            label={t(txt.step)}
            value={step}
            options={STEPS.map((v) => ({ value: v, label: t(txt.stepLabel[v]) }))}
            onChange={(v) => update({ step: v as Step })}
          />
        )}
        {show === 'types' && (
          <Segmented
            id={`${base}-mode`}
            label={t(txt.mode)}
            value={mode}
            options={MODES.map((v) => ({ value: v, label: t(txt.modeLabel[v]) }))}
            onChange={(v) => update({ mode: v as Mode })}
          />
        )}
        {(show === 'largest' || show === 'calendar') && ( // CHANGED (S3-aa3): calendar also keys off rank
          <Segmented
            id={`${base}-rank`}
            label={t(txt.rank)}
            value={rank}
            options={RANKS.map((v) => ({ value: v, label: t(txt.rankLabel[v]) }))}
            onChange={(v) => update({ rank: v as Rank })}
          />
        )}
        {show === 'civilians' && (
          <Segmented
            id={`${base}-who`}
            label={t(txt.who)}
            value={who}
            options={WHO.map((v) => ({ value: v, label: t(txt.whoLabel[v]) }))}
            onChange={(v) => update({ who: v as Who })}
          />
        )}
        <Segmented
          id={`${base}-view`}
          label={t(ui.view)}
          value={view}
          options={[
            { value: 'chart', label: t(ui.viewChart) },
            { value: 'table', label: t(ui.viewTable) },
          ]}
          onChange={(v) => update({ view: v === 'table' ? 'table' : 'chart' })}
        />
      </div>

      <p className="viz-status" aria-live="polite">
        {fill(t(txt.status), { key: text.key, name: t(text.tab), scope: statusScope })}
      </p>

      {show === 'timeline' && <TimelineAngle {...angle} />}
      {show === 'types' && <TypesAngle {...angle} />}
      {show === 'interception' && <InterceptionAngle {...angle} />}
      {show === 'largest' && <LargestAngle {...angle} />}
      {show === 'civilians' && <CiviliansAngle ds={ds} civ={civ} who={who} view={view} />}
      {show === 'calendar' && <CalendarAngle {...angle} />}

      <div className="notice coverage-note">
        <p>
          <strong>{t(txt.methodTitle)}.</strong> {t(txt.method1)}
        </p>
        <p>
          {fill(t(txt.method2), {
            hidden: dateLabel(ds.hiddenFrom, lang),
            first: dateLabel(ds.first, lang),
            last: dateLabel(ds.last, lang),
          })}
        </p>
      </div>
    </div>
  );
}

// ── Shared pieces ───────────────────────────────────────────────────────────────────────────────────
type Option = { value: string; label: string };
type SegmentedProps = { id: string; label: string; value: string; options: readonly Option[]; onChange: (v: string) => void };

function Segmented({ id, label, value, options, onChange }: SegmentedProps) {
  return (
    <div className="field field-auto">
      <span className="field-label" id={id}>
        {label}
      </span>
      <div className="segmented" role="radiogroup" aria-labelledby={id}>
        {options.map((o) => (
          <label key={o.value} className={value === o.value ? 'is-on' : undefined}>
            <input type="radio" name={id} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  );
}

const rateText = (r: number | null, lang: Lang): string => (r === null ? '—' : pct(r, lang));

function Kpis({ summary, period }: { summary: Summary; period: Period }) {
  const { t, lang } = useLang();
  const sfx = period === 'all' ? '' : ` · ${period}`;
  return (
    <ul className="kpi-row" aria-label={t(txt.headline)}>
      <li className="kpi">
        <span className="kpi-value">{int(summary.drones.launched, lang)}</span>
        <span className="kpi-label">
          {t(txt.kpiDrones)}
          {sfx}
        </span>
      </li>
      <li className="kpi">
        <span className="kpi-value">{int(summary.missiles.launched, lang)}</span>
        <span className="kpi-label">
          {t(txt.kpiMissiles)}
          {sfx}
        </span>
      </li>
      <li className="kpi">
        <span className="kpi-value">{rateText(rate(summary.drones), lang)}</span>
        <span className="kpi-label">{t(txt.kpiDronesRate)}</span>
      </li>
      <li className="kpi">
        <span className="kpi-value">{rateText(rate(summary.missiles), lang)}</span>
        <span className="kpi-label">{t(txt.kpiMissilesRate)}</span>
      </li>
      {summary.largest && (
        <li className="kpi">
          <span className="kpi-value">{int(summary.largest.total, lang)}</span>
          <span className="kpi-label">{fill(t(txt.kpiLargest), { date: dateLabel(summary.largest.report.date, lang) })}</span>
        </li>
      )}
    </ul>
  );
}

function Explain({ show, values }: { show: Show; values: Record<string, string | number> }) {
  const { t } = useLang();
  const text = SHOW_TEXT[show];
  return (
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
  );
}

/** The legend: identity is never colour-alone (it is also named here, in the tooltip and in the table). */
function Key({ items }: { items: readonly ReactNode[] }) {
  const { t } = useLang();
  return (
    <ul className="key-list" aria-label={t(ui.legend)}>
      {items}
    </ul>
  );
}
const swatchItem = (key: string, color: string, label: string) => (
  <li key={key}>
    <span className="swatch" style={{ background: color }} aria-hidden="true" />
    {label}
  </li>
);
const lineItem = (key: string, color: string, label: string) => (
  <li key={key}>
    <span className="key-line" style={{ background: color }} aria-hidden="true" />
    {label}
  </li>
);

type AngleProps = { ds: AttacksDataset; buckets: Bucket[]; summary: Summary; settings: AirState; scope: string; scopeLc: string };

// ── A · Timeline ────────────────────────────────────────────────────────────────────────────────────
function TimelineAngle({ ds, buckets, summary, settings, scope, scopeLc }: AngleProps) {
  const { t, lang } = useLang();
  const { step, period, view } = settings;
  const spec = useMemo(() => timelineSpec(ds, buckets, step, period, lang, t), [ds, buckets, step, period, lang, t]);
  const stepWord = t(STEP_WORD[step]);
  const peak = buckets.reduce<Bucket | null>((a, b) => (!a || b.drones.launched > a.drones.launched ? b : a), null);
  const values = {
    step: stepWord,
    scope,
    drones: int(summary.drones.launched, lang),
    missiles: int(summary.missiles.launched, lang),
    dRate: rateText(rate(summary.drones), lang),
    mRate: rateText(rate(summary.missiles), lang),
    peakDrones: peak ? int(peak.drones.launched, lang) : '—',
    peakWhen: peak ? bucketLabel(peak, step, lang, t) : '—',
  };
  if (view === 'table') return <TimelineTable buckets={buckets} step={step} caption={fill(t(txt.capTimeline), { step: stepWord, scope: scopeLc })} />;
  return (
    <>
      <p className="show-intro">{fill(t(SHOW_TEXT.timeline.intro), values)}</p>
      <Key
        items={[
          swatchItem('down', AIR_COLOR.down, t(cs.down)),
          <li key="lost">
            <span className="key-hatch" style={{ color: AIR_COLOR.down }} aria-hidden="true" />
            {t(cs.lost)}
          </li>,
          swatchItem('through', AIR_COLOR.through, t(cs.through)),
        ]}
      />
      <TimeSeries spec={spec} label={fill(t(txt.labelTimeline), { step: stepWord, scope: scopeLc })} />
      <Explain show="timeline" values={values} />
    </>
  );
}

const stopped = (x: Totals): number => x.destroyed + x.lost;
const notIntercepted = (x: Totals): number => Math.max(0, x.launched - x.destroyed - x.lost);

function TimelineTable({ buckets, step, caption }: { buckets: readonly Bucket[]; step: Step; caption: string }) {
  const { t, lang } = useLang();
  const rows = buckets.filter((b) => b.missiles.launched + b.drones.launched > 0);
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t(txt.tPeriod)}</th>
            <th scope="col" className="num">{t(txt.tMissiles)}</th>
            <th scope="col" className="num">{t(txt.tStopped)}</th>
            <th scope="col" className="num">{t(txt.tThrough)}</th>
            <th scope="col" className="num">{t(txt.tDrones)}</th>
            <th scope="col" className="num">{t(txt.tStopped)}</th>
            <th scope="col" className="num">{t(txt.tThrough)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.start}>
              <th scope="row">{bucketLabel(b, step, lang, t)}</th>
              <td className="num">{int(b.missiles.launched, lang)}</td>
              <td className="num">{int(stopped(b.missiles), lang)}</td>
              <td className="num">{int(notIntercepted(b.missiles), lang)}</td>
              <td className="num">{int(b.drones.launched, lang)}</td>
              <td className="num">{int(stopped(b.drones), lang)}</td>
              <td className="num">{int(notIntercepted(b.drones), lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── B · Types ───────────────────────────────────────────────────────────────────────────────────────
function TypesAngle({ ds, buckets, summary, settings, scope, scopeLc }: AngleProps) {
  const { t, lang } = useLang();
  const { step, period, mode, view } = settings;
  const spec = useMemo(() => typesSpec(ds, buckets, step, period, mode, lang, t), [ds, buckets, step, period, mode, lang, t]);
  const models = useMemo(() => modelTotals(ds, period, MISSILE_CLASSES), [ds, period]);
  const modelSpec = useMemo(
    () => ({
      rows: models.slice(0, MODELS_N).map((m) => ({
        key: m.model,
        label: modelLabel(m.model, lang),
        segments: [{ key: m.class, value: m.launched, color: AIR_COLOR[m.class] }],
        valueLabel: int(m.launched, lang),
        tooltip: {
          title: modelLabel(m.model, lang),
          lines: [{ label: t(CLASS_SHORT[m.class]), value: int(m.launched, lang), color: AIR_COLOR[m.class] }],
        },
      })),
    }),
    [models, lang, t],
  );
  const total = summary.missiles.launched;
  const share = (n: number): string => (total > 0 ? pct(n / total, lang) : '—');
  const values = {
    step: t(STEP_WORD[step]),
    scope,
    cruiseShare: share(summary.byClass.cruise.launched),
    ballShare: share(summary.byClass.ballistic.launched),
    cruiseRate: rateText(rate(summary.byClass.cruise), lang),
    ballRate: rateText(rate(summary.byClass.ballistic), lang),
  };
  if (view === 'table') return <ModelsTable rows={models} total={total} caption={fill(t(txt.capModels), { scope: scopeLc })} />;
  return (
    <>
      <p className="show-intro">{fill(t(SHOW_TEXT.types.intro), values)}</p>
      <Key items={MISSILE_CLASSES.map((c) => swatchItem(c, AIR_COLOR[c], `${t(CLASS_LABEL[c])} — ${t(CLASS_MEMBERS[c])}`))} />
      <TimeSeries spec={spec} label={fill(t(txt.labelTypes), { step: t(STEP_WORD[step]), scope: scopeLc })} />
      {models.length > 0 && (
        <div className="race-share">
          <h3 className="race-share-title">{fill(t(txt.models), { scope: scopeLc })}</h3>
          <StackedRows spec={modelSpec} label={fill(t(txt.labelModels), { scope: scopeLc })} />
          {models.length > MODELS_N && <p className="chart-note muted">{fill(t(txt.modelsMore), { n: MODELS_N, all: models.length })}</p>}
        </div>
      )}
      <Explain show="types" values={values} />
    </>
  );
}

function ModelsTable({ rows, total, caption }: { rows: readonly ModelRow[]; total: number; caption: string }) {
  const { t, lang } = useLang();
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t(txt.tModel)}</th>
            <th scope="col">{t(txt.tClass)}</th>
            <th scope="col" className="num">{t(txt.tLaunched)}</th>
            <th scope="col" className="num">{t(txt.tShare)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.model}>
              <th scope="row">{modelLabel(m.model, lang)}</th>
              <td className="cls">
                <span className="swatch" style={{ background: AIR_COLOR[m.class] }} aria-hidden="true" /> {t(CLASS_SHORT[m.class])}
              </td>
              <td className="num">{int(m.launched, lang)}</td>
              <td className="num">{total > 0 ? pct(m.launched / total, lang, 1) : '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={2}>
              {t(txt.tTotal)}
            </th>
            <td className="num">{int(total, lang)}</td>
            <td className="num">{total > 0 ? pct(1, lang, 1) : '—'}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── C · Interception ────────────────────────────────────────────────────────────────────────────────
function InterceptionAngle({ ds, buckets, summary, settings, scope, scopeLc }: AngleProps) {
  const { t, lang } = useLang();
  const { period, view } = settings;
  const spec = useMemo(() => interceptionSpec(buckets, period, lang, t), [buckets, period, lang, t]);
  const values = {
    min: RATE_MIN,
    scope,
    dRate: rateText(rate(summary.drones), lang),
    cRate: rateText(rate(summary.byClass.cruise), lang),
    bRate: rateText(rate(summary.byClass.ballistic), lang),
    aRate: rateText(rate(summary.byClass.antiship), lang),
  };
  if (view === 'table') return <RatesTable ds={ds} />;
  return (
    <>
      <p className="show-intro">{fill(t(SHOW_TEXT.interception.intro), values)}</p>
      <Key items={RATE_CLASSES.map((c) => lineItem(c, AIR_COLOR[c], t(CLASS_LABEL[c])))} />
      <TimeSeries spec={spec} label={fill(t(txt.labelRates), { scope: scopeLc })} />
      <Explain show="interception" values={values} />
    </>
  );
}

function RatesTable({ ds }: { ds: AttacksDataset }) {
  const { t, lang } = useLang();
  const years = useMemo(() => yearsOf(ds), [ds]);
  const sums = useMemo(() => [...years.map((y) => summarize(ds, y)), summarize(ds, 'all')], [ds, years]);
  const cell = (x: Totals): string => {
    const r = rate(x);
    return r === null ? '—' : `${pct(r, lang)} (${int(x.ratedLaunched, lang)})`;
  };
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{t(txt.capRates)}</caption>
        <thead>
          <tr>
            <th scope="col">{t(txt.tClass)}</th>
            {years.map((y) => (
              <th key={y} scope="col" className="num">
                {y}
              </th>
            ))}
            <th scope="col" className="num">{t(txt.tAll)}</th>
          </tr>
        </thead>
        <tbody>
          {CLASSES.map((c) => (
            <tr key={c}>
              <th scope="row" className="cls">
                <span className="swatch" style={{ background: AIR_COLOR[c] }} aria-hidden="true" /> {t(CLASS_LABEL[c])}
              </th>
              {sums.map((sm, i) => (
                <td key={i} className="num">
                  {cell(sm.byClass[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── D · Largest ─────────────────────────────────────────────────────────────────────────────────────
function LargestAngle({ ds, settings, scope, scopeLc }: AngleProps) {
  const { t, lang } = useLang();
  const { period, rank, view } = settings;
  const list = useMemo(() => largestReports(ds, period, rank, LARGEST_N), [ds, period, rank]);
  const spec = useMemo(() => largestSpec(list, rank, lang, t), [list, rank, lang, t]);
  const top = list[0];
  const rankWord = t(txt.rankLabel[rank]).toLowerCase();
  const values = {
    n: list.length,
    scope: scopeLc,
    rank: rankWord,
    date: top ? dateLabel(top.report.date, lang) : '—',
    total: top ? int(top.total, lang) : '—',
    drones: top ? int(top.drones, lang) : '—',
    missiles: top ? int(top.missiles, lang) : '—',
    down: top && top.total > 0 ? pct(top.destroyed / top.total, lang) : '—',
  };
  if (list.length === 0) return <p className="muted">{t(txt.noData)}</p>;
  if (view === 'table') return <LargestTable list={list} caption={fill(t(txt.capLargest), { n: list.length, scope: scopeLc })} />;
  const shown = rank === 'drones' ? (['drones'] as const) : rank === 'missiles' ? MISSILE_CLASSES : CLASSES;
  return (
    <>
      <p className="show-intro">{fill(t(SHOW_TEXT.largest.intro), values)}</p>
      <Key items={shown.filter((c) => list.some((r) => r.byClass[c] > 0)).map((c) => swatchItem(c, AIR_COLOR[c], t(CLASS_SHORT[c])))} />
      <StackedRows spec={spec} label={fill(t(txt.labelLargest), { n: list.length, scope: scopeLc, rank: rankWord })} />
      <Explain show="largest" values={{ ...values, scope }} />
    </>
  );
}

function LargestTable({ list, caption }: { list: readonly ReportTotals[]; caption: string }) {
  const { t, lang } = useLang();
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="num">{t(txt.tRank)}</th>
            <th scope="col">{t(txt.tDate)}</th>
            <th scope="col">{t(txt.tWindow)}</th>
            <th scope="col" className="num">{t(txt.tMissiles)}</th>
            <th scope="col" className="num">{t(txt.tDrones)}</th>
            <th scope="col" className="num">{t(txt.tTotal)}</th>
            <th scope="col" className="num">{t(txt.tStoppedPct)}</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r, i) => (
            <tr key={`${r.report.date} ${r.report.start}`}>
              <td className="num">{i + 1}</td>
              <th scope="row">{dateLabel(r.report.date, lang)}</th>
              <td>{windowLabel(r.report) || '—'}</td>
              <td className="num">{int(r.missiles, lang)}</td>
              <td className="num">{int(r.drones, lang)}</td>
              <td className="num">{int(r.total, lang)}</td>
              <td className="num">{r.total > 0 ? pct(r.destroyed / r.total, lang) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── E · Civilians ───────────────────────────────────────────────────────────────────────────────────
type CivRow = { c: CivilianYear; launched: number; per: number | null };

function CiviliansAngle({ ds, civ, who, view }: { ds: AttacksDataset; civ: CiviliansDataset; who: Who; view: AirState['view'] }) {
  const { t, lang } = useLang();
  const spec = useMemo(() => civiliansSpec(civ, who, lang, t), [civ, who, lang, t]);
  const rows = useMemo(
    (): CivRow[] =>
      civ.years.map((c) => {
        const launched = coversAttackData(ds, c) ? launchedInMonths(ds, c.year, c.fromMonth, c.toMonth).launched : 0;
        return { c, launched, per: perHundred(c, launched) };
      }),
    [ds, civ],
  );
  const find = (year: number) => rows.find((r) => r.c.year === year);
  const share = (r: CivRow | undefined): string => {
    if (!r?.c.longRange) return '—';
    return pct((r.c.longRange.killed + r.c.longRange.injured) / (r.c.total.killed + r.c.total.injured), lang);
  };
  const per = (r: CivRow | undefined): string => (r?.per == null ? '—' : int(Math.round(r.per), lang));
  const values = { lr25: share(find(2025)), lr26: share(find(2026)), ph25: per(find(2025)), ph26: per(find(2026)) };
  if (view === 'table') return <CiviliansTable rows={rows} />;
  return (
    <>
      <p className="show-intro">{t(SHOW_TEXT.civilians.intro)}</p>
      <Key
        items={[
          swatchItem('lr', AIR_COLOR.through, t(cs.longRange)),
          swatchItem('sd', AIR_COLOR.harmShort, t(cs.shortDrones)),
          swatchItem('ot', AIR_COLOR.harmOther, t(cs.notBroken)),
        ]}
      />
      <TimeSeries spec={spec} label={fill(t(txt.labelCivilians), { who: t(txt.whoLabel[who]).toLowerCase() })} />
      <Explain show="civilians" values={values} />
    </>
  );
}

function CiviliansTable({ rows }: { rows: readonly CivRow[] }) {
  const { t, lang } = useLang();
  const pair = (h: { killed: number; injured: number } | undefined): string =>
    h ? `${int(h.killed, lang)} / ${int(h.injured, lang)}` : t(txt.notPublished);
  const ki = `${t(txt.tKilled).toLowerCase()} / ${t(txt.tInjured).toLowerCase()}`;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{t(txt.capCivilians)}</caption>
        <thead>
          <tr>
            <th scope="col">{t(txt.tYear)}</th>
            <th scope="col" className="num">{t(txt.tKilled)}</th>
            <th scope="col" className="num">{t(txt.tInjured)}</th>
            <th scope="col" className="num">{`${t(txt.tLongRange)}, ${ki}`}</th>
            <th scope="col" className="num">{`${t(txt.tShort)}, ${ki}`}</th>
            <th scope="col" className="num">{t(txt.tLaunchedAf)}</th>
            <th scope="col" className="num">{t(txt.tPerHundred)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ c, launched, per }) => {
            const p = harmParts(c, 'all');
            return (
              <tr key={c.year}>
                <th scope="row">{monthsLabel(c, lang, t)}</th>
                <td className="num">{int(c.total.killed, lang)}</td>
                <td className="num">{int(c.total.injured, lang)}</td>
                <td className="num">
                  {pair(c.longRange)}
                  {p.longRange !== undefined && p.total > 0 ? ` · ${pct(p.longRange / p.total, lang)}` : ''}
                </td>
                <td className="num">{pair(c.shortDrones)}</td>
                <td className="num">{launched > 0 ? int(launched, lang) : '—'}</td>
                <td className="num">{per === null ? '—' : dec1(per, lang)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── F · Calendar heatmap ────────────────────────────────────────────────────────────────────────────
function CalendarAngle({ buckets, settings, scope, scopeLc }: AngleProps) {
  const { t, lang } = useLang();
  const { rank, view } = settings;
  const spec = useMemo(() => calendarSpec(buckets, rank, lang, t), [buckets, rank, lang, t]);
  const rankWord = t(txt.rankLabel[rank]).toLowerCase();
  const values = { scope, rank: rankWord };
  if (view === 'table') return <CalendarTable buckets={buckets} caption={fill(t(txt.capCalendar), { rank: rankWord, scope: scopeLc })} />;
  return (
    <>
      <p className="show-intro">{fill(t(SHOW_TEXT.calendar.intro), values)}</p>
      <CalendarHeatmap spec={spec} label={fill(t(txt.labelCalendar), { rank: rankWord, scope: scopeLc })} />
      <Explain show="calendar" values={values} />
    </>
  );
}

function CalendarTable({ buckets, caption }: { buckets: readonly Bucket[]; caption: string }) {
  const { t, lang } = useLang();
  const rows = buckets.filter((b) => b.missiles.launched + b.drones.launched > 0);
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t(txt.tDate)}</th>
            <th scope="col" className="num">{t(txt.tMissiles)}</th>
            <th scope="col" className="num">{t(txt.tDrones)}</th>
            <th scope="col" className="num">{t(txt.tTotal)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.start}>
              <th scope="row">{dateLabel(b.start, lang)}</th>
              <td className="num">{int(b.missiles.launched, lang)}</td>
              <td className="num">{int(b.drones.launched, lang)}</td>
              <td className="num">{int(b.missiles.launched + b.drones.launched, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
