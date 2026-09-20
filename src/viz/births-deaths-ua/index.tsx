// births-deaths-ua — births vs deaths in Ukraine, 1990–2025: five angles on one dataset (S3-bd).
// Layers: data.ts (contract + derivations) → state.ts (URL state) → specs.ts (chart specs) → this page.
import { useCallback, useId, useMemo } from 'react';
import type { ReactNode } from 'react';
import { YearChart } from '../../charts/YearChart';
import { DEMO_COLOR } from '../../charts/palette';
import type { Localized, VizBodyProps } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { DATA_FILE, deriveRows, parseBirthsDeaths, summarize } from './data';
import type { BirthsDeathsDataset, DemoRow } from './data';
import { COVERAGE_MARK, buildSpec, chartLabel, millionsUnit, persons, ratio, thousandsUnit } from './specs';
import { SHOWS, parseDemoState, toDemoParams } from './state';
import type { DemoState, Show } from './state';

const DATA_URL = dataUrl('births-deaths-ua', DATA_FILE);
const parse = (json: unknown): BirthsDeathsDataset => parseBirthsDeaths(json);

type ShowText = { key: string; tab: Localized; intro: Localized; see: Localized; mind: Localized };

const SHOW_TEXT: Readonly<Record<Show, ShowText>> = {
  gap: {
    key: 'A',
    tab: { en: 'The gap', uk: 'Розрив' },
    intro: {
      en: 'Two lines, and the area between them is natural decrease — how many more people died than were born.',
      uk: 'Дві лінії, а площа між ними — природне скорочення: на скільки більше людей померло, ніж народилося.',
    },
    see: {
      en: 'Both levels and the gap at once: the 1990s peak of deaths, the COVID-19 spike of 2021 and the fall of births after 2022.',
      uk: 'І рівні, і розрив водночас: пік смертей 1990-х, сплеск COVID-19 у 2021-му і обвал народжень після 2022-го.',
    },
    mind: {
      en: '“How many times more” is easier to read on the next tab, B.',
      uk: '«У скільки разів наочніше» та зручніше читати на наступній вкладці, B.',
    },
  },
  ratio: {
    key: 'B',
    tab: { en: 'Deaths per birth', uk: 'Смертей на 1 народження' },
    intro: {
      en: 'One line, one number: how many deaths there were for every birth.',
      uk: 'Одна лінія — одне число: скільки смертей припадало на кожне народження.',
    },
    see: {
      en: 'The headline in one number: from {r0} in {from} to {r1} in {to}. A ratio depends far less on the covered territory than absolute numbers do.',
      uk: 'Головне в одному числі: від {r0} у {from} до {r1} у {to}. Відношення значно менше залежить від охопленої території, ніж абсолютні числа.',
    },
    mind: {
      en: 'The absolute numbers are hidden: both births and deaths are falling (tab A).',
      uk: 'Абсолютні числа приховано: і народження, і смерті зменшуються (вкладка A).',
    },
  },
  net: {
    key: 'C',
    tab: { en: 'Natural change', uk: 'Природний приріст' },
    intro: {
      en: 'Each bar is one year’s balance: births minus deaths.',
      uk: 'Кожен стовпець — баланс року: народження мінус смерті.',
    },
    see: {
      en: 'Only {from} is above zero. The largest decrease was in {worstYear}: {worst}.',
      uk: 'Над нулем — лише {from} рік. Найбільше скорочення — у {worstYear}: {worst}.',
    },
    mind: {
      en: 'The balance hides its parts: 2021 is a spike of deaths, 2022–2025 a collapse of births.',
      uk: 'Баланс приховує складові: 2021 — це сплеск смертей, 2022–2025 — обвал народжень.',
    },
  },
  mirror: {
    key: 'D',
    tab: { en: 'Mirrored bars', uk: 'Дзеркальні стовпці' },
    intro: {
      en: 'Births grow up, deaths grow down; the length of a bar is the number of people.',
      uk: 'Народження — вгору, смерті — вниз; довжина стовпця — кількість людей.',
    },
    see: {
      en: 'The blue side melts away while the red side stays heavy.',
      uk: 'Синя частина тане, а червона лишається важкою.',
    },
    mind: {
      en: 'Comparing an upward and a downward bar is harder than comparing two points on lines (tab A).',
      uk: 'Порівнювати стовпець угору зі стовпцем униз важче, ніж дві точки на лініях (вкладка A).',
    },
  },
  index: {
    key: 'E',
    tab: { en: 'Index 1990 = 100', uk: 'Індекс 1990 = 100' },
    intro: {
      en: 'Both series relative to their {from} level.',
      uk: 'Обидва ряди відносно рівня {from} року.',
    },
    see: {
      en: 'Why the gap grew: births fell to {bi} % of the {from} level, deaths only to {di} %.',
      uk: 'Чому розрив зріс: народження впали до {bi} % від рівня {from} року, смерті — лише до {di} %.',
    },
    mind: {
      en: 'Part of the fall after 2014 and 2022 comes from the smaller covered territory (the shaded bands).',
      uk: 'Частина падіння після 2014 і 2022 років — через меншу охоплену територію (тоновані смуги).',
    },
  },
};

const txt = {
  kpiBirths: { en: 'births in {year}{mark}', uk: 'народжень у {year}{mark}' },
  kpiDeaths: { en: 'deaths in {year}{mark}', uk: 'смертей у {year}{mark}' },
  kpiRatio: { en: 'deaths per birth in {year} ({first}: {r0})', uk: 'смертей на одне народження у {year} ({first}: {r0})' },
  kpiTotal: {
    en: 'natural decrease in {from}–{to}, registered data',
    uk: 'природне скорочення за {from}–{to}, за зареєстрованими даними',
  },
  headline: { en: 'Key numbers', uk: 'Головні числа' },
  angle: { en: 'Angle', uk: 'Погляд' },
  angles: { en: 'Angles on the data', uk: 'Погляди на дані' },
  see: { en: 'What you see', uk: 'Що видно' },
  mind: { en: 'Keep in mind', uk: 'Зверніть увагу' },
  births: { en: 'Births', uk: 'Народження' },
  deaths: { en: 'Deaths', uk: 'Смерті' },
  gapKey: { en: 'Natural decrease', uk: 'Природне скорочення' },
  perBirthKey: { en: 'Deaths per birth', uk: 'Смертей на 1 народження' },
  excessKey: { en: 'More deaths than births', uk: 'Смертей більше, ніж народжень' },
  growthKey: { en: 'Natural growth', uk: 'Природний приріст' },
  decreaseKey: { en: 'Natural decrease', uk: 'Природне скорочення' },
  status: { en: '{key} · {name} · {from}–{to}', uk: '{key} · {name} · {from}–{to}' },
  coverage: {
    en: 'Coverage changed. {a} — all of Ukraine. {b}* — without the AR of Crimea, Sevastopol and the occupied parts of Donetsk and Luhansk oblasts. {c}** — without Crimea and the temporarily occupied territories (Ministry of Justice data).',
    uk: 'Облік змінювався. {a} — уся Україна. {b}* — без АР Крим, Севастополя та окупованих частин Донецької й Луганської областей. {c}** — без Криму й тимчасово окупованих територій (дані Мін’юсту).',
  },
  coverage2: {
    en: 'Part of the fall after 2014 and 2022 is a change of coverage, not only of demography — the shaded bands mark these years.',
    uk: 'Частина падіння після 2014 і 2022 років — це зміна охоплення, а не лише демографія; ці роки позначено тонованими смугами.',
  },
  tableCaption: { en: 'Births and deaths in Ukraine, {from}–{to}', uk: 'Народження і смерті в Україні, {from}–{to}' },
  year: { en: 'Year', uk: 'Рік' },
  net: { en: 'Natural change', uk: 'Природний приріст' },
  perBirth: { en: 'Deaths per birth', uk: 'Смертей на 1 народження' },
} as const;

export default function BirthsDeathsUa({ params, setParams }: VizBodyProps) {
  const { t } = useLang();
  const state = useDataset(DATA_URL, parse);
  const settings = useMemo(() => parseDemoState(params), [params]);
  const update = useCallback(
    (patch: Partial<DemoState>) => setParams(toDemoParams({ ...settings, ...patch })),
    [settings, setParams],
  );

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
  return <DemoView dataset={state.data} settings={settings} update={update} />;
}

type ViewProps = {
  dataset: BirthsDeathsDataset;
  settings: DemoState;
  update: (patch: Partial<DemoState>) => void;
};

function DemoView({ dataset, settings, update }: ViewProps) {
  const { t, lang } = useLang();
  const base = useId();
  const rows = useMemo(() => deriveRows(dataset), [dataset]);
  const summary = useMemo(() => summarize(rows), [rows]);
  const spec = useMemo(
    () => buildSpec(settings.show, { dataset, rows, summary, lang, t }),
    [settings.show, dataset, rows, summary, lang, t],
  );
  const { first, last, worst } = summary;
  const show = SHOW_TEXT[settings.show];
  const values = {
    from: first.year,
    to: last.year,
    r0: ratio(first.ratio, lang),
    r1: ratio(last.ratio, lang),
    worstYear: worst.year,
    worst: thousandsUnit(worst.net, lang, true),
    bi: Math.round(last.birthsIndex),
    di: Math.round(last.deathsIndex),
  };
  const seg = (c: 'full' | 'no-crimea-ordlo' | 'no-occupied'): string => {
    const s = dataset.coverage.find((x) => x.coverage === c);
    return s ? (s.from === s.to ? String(s.from) : `${s.from}–${s.to}`) : '—';
  };
  const mark = COVERAGE_MARK[last.coverage];

  return (
    <div className="viz-body">
      <ul className="kpi-row" aria-label={t(txt.headline)}>
        <li className="kpi">
          <span className="kpi-value">{thousandsUnit(last.births, lang)}</span>
          <span className="kpi-label">
            <span className="swatch" style={{ background: DEMO_COLOR.births }} aria-hidden="true" />{' '}
            {fill(t(txt.kpiBirths), { year: last.year, mark })}
          </span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{thousandsUnit(last.deaths, lang)}</span>
          <span className="kpi-label">
            <span className="swatch" style={{ background: DEMO_COLOR.deaths }} aria-hidden="true" />{' '}
            {fill(t(txt.kpiDeaths), { year: last.year, mark })}
          </span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{ratio(last.ratio, lang)}×</span>
          <span className="kpi-label">{fill(t(txt.kpiRatio), { year: last.year, first: first.year, r0: ratio(first.ratio, lang) })}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">−{millionsUnit(summary.totalDecrease, lang)}</span>
          <span className="kpi-label">{fill(t(txt.kpiTotal), { from: summary.decreaseSince, to: last.year })}</span>
        </li>
      </ul>

      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <div className="field field-subtabs">
          <span className="field-label" id={`${base}-show`}>
            {t(txt.angle)}
          </span>
          <div className="subtabs" role="radiogroup" aria-labelledby={`${base}-show`}>
            {SHOWS.map((s) => (
              <label key={s} className={settings.show === s ? 'is-on' : undefined}>
                <input
                  type="radio"
                  name={`${base}-show`}
                  value={s}
                  checked={settings.show === s}
                  onChange={() => update({ show: s })}
                />
                <span className="subtab-key" aria-hidden="true">
                  {SHOW_TEXT[s].key}
                </span>
                {t(SHOW_TEXT[s].tab)}
              </label>
            ))}
          </div>
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
                  onChange={() => update({ view: v })}
                />
                {t(v === 'chart' ? ui.viewChart : ui.viewTable)}
              </label>
            ))}
          </div>
        </div>
      </div>

      <p className="viz-status" aria-live="polite">
        {fill(t(txt.status), { key: show.key, name: t(show.tab), from: first.year, to: last.year })}
      </p>

      {settings.view === 'chart' ? (
        <>
          <p className="show-intro">{fill(t(show.intro), values)}</p>
          <ChartKey show={settings.show} />
          <YearChart spec={spec} label={chartLabel(settings.show, summary, lang, t)} />
          <dl className="pros-cons">
            <div>
              <dt>{t(txt.see)}</dt>
              <dd>{fill(t(show.see), values)}</dd>
            </div>
            <div>
              <dt>{t(txt.mind)}</dt>
              <dd>{fill(t(show.mind), values)}</dd>
            </div>
          </dl>
        </>
      ) : (
        <DemoTable rows={rows} caption={fill(t(txt.tableCaption), { from: first.year, to: last.year })} />
      )}

      <div className="notice coverage-note">
        <p>{fill(t(txt.coverage), { a: seg('full'), b: seg('no-crimea-ordlo'), c: seg('no-occupied') })}</p>
        <p>{t(txt.coverage2)}</p>
      </div>
    </div>
  );
}

/** The legend: identity is never colour-alone (it is also named here and in the tooltip). */
function ChartKey({ show }: { show: Show }) {
  const { t } = useLang();
  const line = (color: string, label: Localized) => (
    <li key={t(label)}>
      <span className="key-line" style={{ background: color }} aria-hidden="true" />
      {t(label)}
    </li>
  );
  const box = (color: string, label: Localized) => (
    <li key={t(label)}>
      <span className="swatch" style={{ background: color }} aria-hidden="true" />
      {t(label)}
    </li>
  );
  const items: Record<Show, ReactNode[]> = {
    gap: [line(DEMO_COLOR.births, txt.births), line(DEMO_COLOR.deaths, txt.deaths), box(DEMO_COLOR.deathsSoft, txt.gapKey)],
    ratio: [line(DEMO_COLOR.deaths, txt.perBirthKey), box(DEMO_COLOR.deathsSoft, txt.excessKey)],
    net: [box(DEMO_COLOR.births, txt.growthKey), box(DEMO_COLOR.deaths, txt.decreaseKey)],
    mirror: [box(DEMO_COLOR.births, txt.births), box(DEMO_COLOR.deaths, txt.deaths)],
    index: [line(DEMO_COLOR.births, txt.births), line(DEMO_COLOR.deaths, txt.deaths)],
  };
  return (
    <ul className="key-list" aria-label={t(ui.legend)}>
      {items[show]}
    </ul>
  );
}

function DemoTable({ rows, caption }: { rows: readonly DemoRow[]; caption: string }) {
  const { t, lang } = useLang();
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t(txt.year)}</th>
            <th scope="col" className="num">
              {t(txt.births)}
            </th>
            <th scope="col" className="num">
              {t(txt.deaths)}
            </th>
            <th scope="col" className="num">
              {t(txt.net)}
            </th>
            <th scope="col" className="num">
              {t(txt.perBirth)}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.year}>
              <th scope="row">
                {r.year}
                {COVERAGE_MARK[r.coverage]}
              </th>
              <td className="num">{persons(r.births, lang)}</td>
              <td className="num">{persons(r.deaths, lang)}</td>
              <td className="num">{r.net > 0 ? '+' : ''}{persons(r.net, lang)}</td>
              <td className="num">{ratio(r.ratio, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
