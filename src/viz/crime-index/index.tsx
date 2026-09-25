// crime-index — two measures of crime by country as sub-tabs (S3-rb): UNODC homicide rate (official) and
// Numbeo's Crime Index (perceived). Layers: data.ts (contracts + parsers + ranking) → state.ts (URL state) → this
// page, on the shared RankedBar core with the gdp-by-country paging / region filter / table pattern.
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
import { paginate } from '../../lib/paginate';
import { Pager } from '../../components/viz/Pager';
import { REGIONS, REGION_LABELS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { FILE_OF, SHOWS, parseHomicideDataset, parseNumbeoDataset, rankHomicide, rankNumbeo } from './data';
import type { HomicideNote, RankedCrimeRow, Show } from './data';
import meta from './meta';
import { PAGE_SIZE, parseCrimeState, toCrimeParams } from './state';
import type { CrimeState } from './state';

type L = { en: string; uk: string };
type T = (v: L) => string;

/** What a page needs from either file: ranked rows plus the context line. */
type Loaded = { rows: RankedCrimeRow[]; worldRate?: number; latestYear?: number; edition: string };
const PARSE: Record<Show, (json: unknown) => Loaded> = {
  homicide: (json) => {
    const d = parseHomicideDataset(json, FILE_OF.homicide);
    return { rows: rankHomicide(d), worldRate: d.worldRate, latestYear: d.latestYear, edition: d.edition };
  },
  numbeo: (json) => {
    const d = parseNumbeoDataset(json, FILE_OF.numbeo);
    return { rows: rankNumbeo(d), edition: d.edition };
  },
};

const txt = {
  measure: { en: 'Measure', uk: 'Показник' },
  tab: {
    homicide: { en: 'Homicide rate (UNODC)', uk: 'Рівень убивств (UNODC)' },
    numbeo: { en: 'Crime Index (Numbeo)', uk: 'Індекс злочинності (Numbeo)' },
  },
  chartLabel: {
    homicide: {
      en: 'Horizontal bar chart: victims of intentional homicide per 100,000 people, {region}, ranks {from} to {to} of {total}. Highest: {top}. The table view lists every value.',
      uk: 'Горизонтальна стовпчикова діаграма: жертв умисних убивств на 100 000 населення ({region}), місця {from}–{to} з {total}. Найвище: {top}. Таблиця містить усі значення.',
    },
    numbeo: {
      en: 'Horizontal bar chart: Numbeo Crime Index (0–100, perceived crime), {region}, ranks {from} to {to} of {total}. Highest: {top}. The table view lists every value.',
      uk: 'Горизонтальна стовпчикова діаграма: індекс злочинності Numbeo (0–100, сприйняття), {region}, місця {from}–{to} з {total}. Найвищий: {top}. Таблиця містить усі значення.',
    },
  },
  worldHomicide: {
    en: 'World estimate, {year}: {value} per 100,000 (UNODC)',
    uk: 'Світова оцінка, {year}: {value} на 100 000 (UNODC)',
  },
  numbeoEdition: {
    en: 'Numbeo {edition} · higher = more crime perceived by respondents',
    uk: 'Numbeo {edition} · вище = більше злочинності, за відчуттями респондентів',
  },
  regionCount: { en: '{region}: {count}', uk: '{region}: {count}' },
  colHomicide: { en: 'Per 100,000', uk: 'На 100 000' },
  colVictims: { en: 'Victims', uk: 'Жертв' },
  colYear: { en: 'Year', uk: 'Рік' },
  colRatio: { en: '× world', uk: '× світ' },
  colCrime: { en: 'Crime Index', uk: 'Індекс злочинності' },
  colSafety: { en: 'Safety Index', uk: 'Індекс безпеки' },
  colNote: { en: 'Note', uk: 'Примітка' },
  tipRank: { en: 'Rank: {rank} of {total}', uk: 'Місце: {rank} з {total}' },
  tipRegion: { en: 'Region: {region}', uk: 'Регіон: {region}' },
  tipHomicide: { en: '{value} per 100,000 · {victims} victims · {year}', uk: '{value} на 100 000 · жертв: {victims} · {year}' },
  tipRatio: { en: 'World: {ratio}', uk: 'Від світового рівня: {ratio}' },
  tipCrime: { en: 'Crime Index: {value} · Safety Index: {safety}', uk: 'Індекс злочинності: {value} · безпеки: {safety}' },
  olderYear: { en: 'latest UNODC figure is for {year}', uk: 'останнє значення UNODC — за {year} рік' },
  note: {
    combined: {
      en: 'UNODC reports England and Wales, Scotland and Northern Ireland separately; combined here from their counts and rates.',
      uk: 'UNODC подає Англію й Уельс, Шотландію та Північну Ірландію окремо; тут об’єднано з їхніх кількостей і рівнів.',
    },
    'partial-territory': {
      en: 'Central Iraq only — without the Kurdistan Region (the only recent figure).',
      uk: 'Лише Центральний Ірак, без Курдистану (єдине недавнє значення).',
    },
  } satisfies Record<HomicideNote, L>,
  homicideNote: {
    en: 'Latest year per country since 2015 from UNODC’s data file of {edition}; values older than {year} are marked * with their year. War deaths are not intentional homicides; for Ukraine the latest UNODC figure is for 2021.',
    uk: 'Останній рік для кожної країни з 2015-го, з файлу даних UNODC від {edition}; значення, старші за {year} рік, позначено * з роком. Загибель на війні не є умисним убивством; для України останнє значення UNODC — за 2021 рік.',
  },
  numbeoNote: {
    en: 'Numbeo’s Crime Index is a crowd-sourced online survey of how people perceive crime, not a count of crimes; Safety Index = 100 − Crime Index. Data © Numbeo, used under its terms for personal websites.',
    uk: 'Індекс злочинності Numbeo — онлайн-опитування про те, як люди сприймають злочинність, а не підрахунок злочинів; індекс безпеки = 100 − індекс злочинності. Дані © Numbeo, використано за їхніми умовами для особистих сайтів.',
  },
  numbeoLink: { en: 'Numbeo — Crime Index by Country', uk: 'Numbeo — Crime Index by Country' },
  rankNote: { en: 'Rank is the global rank, also when a region is selected.', uk: 'Місце — глобальне, навіть коли вибрано регіон.' },
  tableCaption: {
    homicide: { en: 'Intentional homicide rate by country — {region}', uk: 'Рівень умисних убивств за країнами — {region}' },
    numbeo: { en: 'Numbeo Crime Index by country, {edition} — {region}', uk: 'Індекс злочинності Numbeo за країнами, {edition} — {region}' },
  },
} as const;

const NUMBEO_URL = 'https://www.numbeo.com/crime/rankings_by_country.jsp';

// A measure is offered only when its file ships (listed in meta.data) — adding Numbeo's file turns its tab on.
const AVAILABLE: readonly Show[] = SHOWS.filter((s) => meta.data.includes(FILE_OF[s]));

function rowNote(r: RankedCrimeRow, t: T): string {
  const parts: string[] = [];
  if (r.olderYear !== undefined) parts.push(fill(t(txt.olderYear), { year: r.olderYear }));
  if (r.note) parts.push(t(txt.note[r.note]));
  return parts.join(' ');
}

function valueText(r: RankedCrimeRow, show: Show, lang: Lang): string {
  return show === 'homicide' ? formatNumber(Math.round(r.value * 10) / 10, lang) : formatNumber(r.value, lang);
}

function toBarRow(r: RankedCrimeRow, show: Show, lang: Lang, total: number, t: T, worldRate: number | undefined, latestYear: number | undefined): RankedBarRow {
  const name = countryName(r.code, lang);
  const note = rowNote(r, t);
  const lines = [fill(t(txt.tipRank), { rank: r.rank, total }), fill(t(txt.tipRegion), { region: t(REGION_LABELS[r.region]) })];
  if (show === 'homicide') {
    lines.push(
      fill(t(txt.tipHomicide), { value: valueText(r, show, lang), victims: formatNumber(r.victims ?? 0, lang), year: r.olderYear ?? latestYear ?? '' }),
    );
    if (worldRate) lines.push(fill(t(txt.tipRatio), { ratio: formatMultiple(r.value / worldRate, lang) }));
  } else {
    lines.push(fill(t(txt.tipCrime), { value: valueText(r, show, lang), safety: formatNumber(r.safetyIndex ?? 0, lang) }));
  }
  if (note) lines.push(`* ${note}`);
  const mark = note ? '*' : '';
  const ratio = show === 'homicide' && worldRate ? ` · ${formatMultiple(r.value / worldRate, lang)}` : '';
  return {
    key: r.code,
    label: `${r.rank}  ${name}`,
    value: r.value,
    color: REGION_COLOR[r.region],
    valueLabel: `${valueText(r, show, lang)}${mark}${ratio}`,
    imageUrl: flagUrl(r.code),
    tooltip: { title: name, lines },
  };
}

export default function CrimeIndex({ params, setParams }: VizBodyProps) {
  const { t } = useLang();
  const base = useId();
  const settings = useMemo((): CrimeState => {
    const parsed = parseCrimeState(params);
    return AVAILABLE.includes(parsed.show) ? parsed : { ...parsed, show: AVAILABLE[0] ?? 'homicide' };
  }, [params]);
  const state = useDataset(dataUrl('crime-index', FILE_OF[settings.show]), PARSE[settings.show]);
  const update = useCallback(
    (patch: Partial<CrimeState>) => setParams(toCrimeParams({ ...settings, ...patch })),
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
  } else body = <CrimeView data={state.data} settings={settings} update={update} />;

  return (
    <div className="viz-body">
      {AVAILABLE.length > 1 && (
        <div className="controls" role="group" aria-label={t(txt.measure)}>
          <div className="field field-subtabs">
            <span className="field-label" id={`${base}-show`}>
              {t(txt.measure)}
            </span>
            <div className="subtabs" role="radiogroup" aria-labelledby={`${base}-show`}>
              {AVAILABLE.map((s) => (
                <label key={s} className={settings.show === s ? 'is-on' : undefined}>
                  <input type="radio" name={`${base}-show`} value={s} checked={settings.show === s} onChange={() => update({ show: s, page: 1 })} />
                  {t(txt.tab[s])}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
      {body}
    </div>
  );
}

type ViewProps = { data: Loaded; settings: CrimeState; update: (patch: Partial<CrimeState>) => void };

function CrimeView({ data, settings, update }: ViewProps) {
  const { t, lang } = useLang();
  const base = useId();
  const show = settings.show;
  const ranked = data.rows;
  const filtered = useMemo(
    () => (settings.region === 'all' ? ranked : ranked.filter((r) => r.region === settings.region)),
    [ranked, settings.region],
  );
  const page = useMemo(() => paginate(filtered, settings.page, PAGE_SIZE), [filtered, settings.page]);
  const pageItems = page.items;
  const rows = useMemo(
    () => pageItems.map((r) => toBarRow(r, show, lang, ranked.length, t, data.worldRate, data.latestYear)),
    [pageItems, show, lang, ranked.length, t, data.worldRate, data.latestYear],
  );
  const tickFormat = useCallback((v: number) => formatNumber(v, lang), [lang]);

  const regionName = settings.region === 'all' ? t(ui.allRegions) : t(REGION_LABELS[settings.region]);
  const top = pageItems[0];
  const chartLabel = fill(t(txt.chartLabel[show]), {
    region: regionName,
    from: page.from,
    to: page.to,
    total: page.total,
    top: top ? `${countryName(top.code, lang)}, ${valueText(top, show, lang)}` : '—',
  });
  const context =
    show === 'homicide'
      ? fill(t(txt.worldHomicide), { year: data.latestYear ?? '', value: formatNumber(Math.round((data.worldRate ?? 0) * 10) / 10, lang) })
      : fill(t(txt.numbeoEdition), { edition: data.edition });
  const summary = settings.region === 'all' ? context : fill(t(txt.regionCount), { region: regionName, count: filtered.length });
  const withNotes = ranked.some((r) => rowNote(r, t));

  return (
    <>
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <div className="field">
          <label htmlFor={`${base}-region`}>{t(ui.region)}</label>
          <select id={`${base}-region`} value={settings.region} onChange={(e) => update({ region: e.target.value as Region | 'all', page: 1 })}>
            <option value="all">{t(ui.allRegions)}</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {t(REGION_LABELS[r])}
              </option>
            ))}
          </select>
        </div>

        {settings.view === 'chart' && (
          // CHANGED (S3-fx): shared Pager — the select no longer clips on phones
          <Pager id={`${base}-page`} page={page} size={PAGE_SIZE} onPage={(p) => update({ page: p })} />
        )}

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
        {settings.view === 'chart'
          ? fill(t(ui.showingRange), { from: page.from, to: page.to, total: page.total })
          : fill(t(ui.showingAll), { total: page.total })}
        {' · '}
        {summary}
      </p>

      {settings.view === 'chart' ? (
        <RankedBar rows={rows} label={chartLabel} tickFormat={tickFormat} />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <caption>{fill(t(txt.tableCaption[show]), { region: regionName, edition: data.edition })}</caption>
            <thead>
              <tr>
                <th scope="col" className="num">
                  {t(ui.rank)}
                </th>
                <th scope="col">{t(ui.country)}</th>
                <th scope="col">{t(ui.region)}</th>
                {show === 'homicide' ? (
                  <>
                    <th scope="col" className="num">
                      {t(txt.colHomicide)}
                    </th>
                    <th scope="col" className="num">
                      {t(txt.colVictims)}
                    </th>
                    <th scope="col" className="num">
                      {t(txt.colYear)}
                    </th>
                    <th scope="col" className="num">
                      {t(txt.colRatio)}
                    </th>
                  </>
                ) : (
                  <>
                    <th scope="col" className="num">
                      {t(txt.colCrime)}
                    </th>
                    <th scope="col" className="num">
                      {t(txt.colSafety)}
                    </th>
                  </>
                )}
                {withNotes && <th scope="col">{t(txt.colNote)}</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const flag = flagUrl(r.code);
                const note = rowNote(r, t);
                return (
                  <tr key={r.code}>
                    <td className="num">{r.rank}</td>
                    <th scope="row">
                      {flag && <img className="flag" src={flag} alt="" width={20} height={15} loading="lazy" />} {countryName(r.code, lang)}
                    </th>
                    <td>
                      <span className="swatch" style={{ background: REGION_COLOR[r.region] }} aria-hidden="true" /> {t(REGION_LABELS[r.region])}
                    </td>
                    {show === 'homicide' ? (
                      <>
                        <td className="num">
                          {valueText(r, show, lang)}
                          {note ? '*' : ''}
                        </td>
                        <td className="num">{formatNumber(r.victims ?? 0, lang)}</td>
                        <td className="num">{r.olderYear ?? data.latestYear}</td>
                        <td className="num">{data.worldRate ? formatMultiple(r.value / data.worldRate, lang) : '—'}</td>
                      </>
                    ) : (
                      <>
                        <td className="num">{valueText(r, show, lang)}</td>
                        <td className="num">{formatNumber(r.safetyIndex ?? 0, lang)}</td>
                      </>
                    )}
                    {withNotes && <td className="muted">{note}</td>}
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
              <button type="button" className="legend-item" aria-pressed={on} onClick={() => update({ region: on ? 'all' : r, page: 1 })}>
                <span className="swatch" style={{ background: REGION_COLOR[r] }} aria-hidden="true" />
                {t(REGION_LABELS[r])}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="chart-note muted">{t(txt.rankNote)}</p>
      {show === 'homicide' ? (
        <p className="chart-note muted">{fill(t(txt.homicideNote), { edition: data.edition, year: data.latestYear ?? '' })}</p>
      ) : (
        <p className="chart-note muted">
          {t(txt.numbeoNote)}{' '}
          <a href={NUMBEO_URL} rel="noopener noreferrer" target="_blank">
            {t(txt.numbeoLink)}
          </a>
        </p>
      )}
    </>
  );
}
