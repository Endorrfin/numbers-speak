// origins.tsx — CHANGED (S3-ai1): angle F, language and multimodal models a year by the developer's country (first listed)
// or by access to the weights (StackedRows, one row a year; ?split=access). Counts of models, not shares of compute:
// the question is who releases. The last year is partial and marked "*".
import { useId, useMemo } from 'react';
import { StackedRows } from '../../charts/StackedRows';
import type { SrRow, SrSpec } from '../../charts/renderStackedRows';
import { AI_COLOR } from '../../charts/palette';
import { useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { formatDate, formatNumber, formatShare } from '../../lib/format';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { DataState, EpochCredit } from './common';
import type { AngleProps } from './common';
import { FILES, SEGMENTS, SPLITS, parseOrigins, partialYear, yearTotal } from './data';
import type { OriginsDataset, Split } from './data';
import { ACCESS_TEXT, ORIGIN_TEXT, txt as shared } from './text';

const parse = (json: unknown): OriginsDataset => parseOrigins(json, FILES.origins);

const txt = {
  split: { en: 'Split by', uk: 'Розбити за' },
  splitCountry: { en: 'Country', uk: 'Країною' },
  splitAccess: { en: 'Weights', uk: 'Вагами' },
  chartLabel: {
    en: 'Stacked bars: language and multimodal AI models recorded each year, {from}–{to}, by {split}. {last}: {parts}. The table view lists every year.',
    uk: 'Складені стовпці: мовні й мультимодальні AI-моделі за роками, {from}–{to}, за {split}. {last}: {parts}. Таблиця містить усі роки.',
  },
  byCountry: { en: 'developer country', uk: 'країною розробника' },
  byAccess: { en: 'access to the weights', uk: 'доступом до ваг' },
  status: { en: '{n} models, {from}–{to}', uk: 'Моделей — {n}, {from}–{to}' },
  partial: { en: '* {year}: to {date}', uk: '* {year}: до {date}' },
  kpiRace: { en: 'China vs the U.S., {year}', uk: 'Китай проти США, {year}' },
  kpiOpen: { en: 'with open weights, {year}', uk: 'з відкритими вагами, {year}' },
  kpiOpenNow: { en: 'with open weights, {year}*', uk: 'з відкритими вагами, {year}*' },
  kpiTotal: { en: 'models counted, {from}–{to}', uk: 'моделей враховано, {from}–{to}' },
  note: {
    en: 'These are the models Epoch AI has recorded, not every model released: the latest months and smaller labs (in China and elsewhere) are added with a delay. Country = the first developer listed; “Not recorded” = Epoch gives no access for the model.',
    uk: 'Це моделі, які записав Epoch AI, а не всі випущені: останні місяці й менші лабораторії (у Китаї та деінде) додаються із запізненням. Країна — першого розробника в списку; «Не зазначено» — Epoch не вказує доступу для моделі.',
  },
  colYear: { en: 'Year', uk: 'Рік' },
  colTotal: { en: 'Models', uk: 'Моделей' },
  tableCaption: { en: 'Language and multimodal models a year, {from}–{to}, by {split}', uk: 'Мовні й мультимодальні моделі за роками, {from}–{to}, за {split}' },
} as const;

const segmentText = (split: Split, key: string) => (split === 'country' ? ORIGIN_TEXT[key as keyof typeof ORIGIN_TEXT] : ACCESS_TEXT[key as keyof typeof ACCESS_TEXT]);

export function OriginsAngle(props: AngleProps) {
  const state = useDataset(dataUrl('ai-models', FILES.origins), parse);
  if (state.status !== 'ready') return <DataState status={state.status} retry={state.status === 'error' ? state.retry : undefined} />;
  return <OriginsView ds={state.data} {...props} />;
}

function OriginsView({ ds, settings, update }: AngleProps & { ds: OriginsDataset }) {
  const { t, lang } = useLang();
  const base = useId();
  const split = settings.split;
  const keys = SEGMENTS[split];
  const counts = (k: string): number[] => (split === 'country' ? ds.country[k as keyof OriginsDataset['country']] : ds.access[k as keyof OriginsDataset['access']]);
  const partial = partialYear(ds);
  const last = ds.years.length - 1;
  const yearLabel = (i: number): string => `${ds.years[i]}${partial && i === last ? '*' : ''}`;
  const from = ds.years[0]!;
  const to = ds.years[last]!;
  const total = ds.years.reduce((s, _, i) => s + yearTotal(ds, i), 0);

  const spec = useMemo((): SrSpec => {
    const rows: SrRow[] = ds.years.map((_, i) => {
      const sum = yearTotal(ds, i);
      return {
        key: String(ds.years[i]),
        label: yearLabel(i),
        segments: keys.map((k) => ({ key: k, value: counts(k)[i]!, color: AI_COLOR[k as keyof typeof AI_COLOR] })),
        valueLabel: formatNumber(sum, lang),
        tooltip: {
          title: yearLabel(i),
          lines: keys.map((k) => ({ label: t(segmentText(split, k)), value: `${formatNumber(counts(k)[i]!, lang)} · ${formatShare(sum ? counts(k)[i]! / sum : 0, lang)}`, color: AI_COLOR[k as keyof typeof AI_COLOR] })),
        },
      };
    });
    return { rows };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yearLabel/counts derive from ds and split
  }, [ds, split, lang, t]);

  // KPIs on the last complete year and the partial one (the data, not a judgement).
  const full = partial ? last - 1 : last;
  const fy = ds.years[full]!;
  const openShare = (i: number): string => formatShare(ds.access.open[i]! / Math.max(1, yearTotal(ds, i)), lang);
  const lastParts = keys.map((k) => `${t(segmentText(split, k))} ${formatNumber(counts(k)[last]!, lang)}`).join(', ');
  const label = fill(t(txt.chartLabel), { from, to, split: t(split === 'country' ? txt.byCountry : txt.byAccess), last: yearLabel(last), parts: lastParts });

  return (
    <>
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <div className="field field-auto">
          <span className="field-label" id={`${base}-split`}>
            {t(txt.split)}
          </span>
          <div className="segmented" role="radiogroup" aria-labelledby={`${base}-split`}>
            {SPLITS.map((s) => (
              <label key={s} className={split === s ? 'is-on' : undefined}>
                <input type="radio" name={`${base}-split`} value={s} checked={split === s} onChange={() => update({ split: s })} />
                {t(s === 'country' ? txt.splitCountry : txt.splitAccess)}
              </label>
            ))}
          </div>
        </div>
      </div>
      <p className="viz-status" aria-live="polite">
        {fill(t(txt.status), { n: formatNumber(total, lang), from, to })}
      </p>
      {settings.view === 'table' ? (
        <div className="table-wrap">
          <table className="data-table">
            <caption>{fill(t(txt.tableCaption), { from, to, split: t(split === 'country' ? txt.byCountry : txt.byAccess) })}</caption>
            <thead>
              <tr>
                <th scope="col">{t(txt.colYear)}</th>
                {keys.map((k) => (
                  <th key={k} scope="col" className="num">
                    {t(segmentText(split, k))}
                  </th>
                ))}
                <th scope="col" className="num">
                  {t(txt.colTotal)}
                </th>
              </tr>
            </thead>
            <tbody>
              {ds.years.map((_, i) => (
                <tr key={ds.years[i]}>
                  <th scope="row">{yearLabel(i)}</th>
                  {keys.map((k) => (
                    <td key={k} className="num">
                      {formatNumber(counts(k)[i]!, lang)} · {formatShare(counts(k)[i]! / Math.max(1, yearTotal(ds, i)), lang)}
                    </td>
                  ))}
                  <td className="num">{formatNumber(yearTotal(ds, i), lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <ul className="key-list" aria-label={t(shared.legend)}>
            {keys.map((k) => (
              <li key={k}>
                <span className="swatch" style={{ background: AI_COLOR[k as keyof typeof AI_COLOR] }} aria-hidden="true" />
                {t(segmentText(split, k))}
              </li>
            ))}
          </ul>
          <StackedRows spec={spec} label={label} />
        </>
      )}
      <ul className="kpi-row" aria-label={t(shared.keyFigures)}>
        <li className="kpi">
          <span className="kpi-value">
            {formatNumber(ds.country.cn[full]!, lang)} : {formatNumber(ds.country.us[full]!, lang)}
          </span>
          <span className="kpi-label">{fill(t(txt.kpiRace), { year: fy })}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{openShare(full)}</span>
          <span className="kpi-label">{fill(t(txt.kpiOpen), { year: fy })}</span>
        </li>
        {partial && (
          <li className="kpi">
            <span className="kpi-value">{openShare(last)}</span>
            <span className="kpi-label">{fill(t(txt.kpiOpenNow), { year: to })}</span>
          </li>
        )}
        <li className="kpi">
          <span className="kpi-value">{formatNumber(total, lang)}</span>
          <span className="kpi-label">{fill(t(txt.kpiTotal), { from, to })}</span>
        </li>
      </ul>
      {partial && <p className="chart-note">{fill(t(txt.partial), { year: to, date: formatDate(ds.through, lang) })}</p>}
      <p className="chart-note muted">{t(txt.note)}</p>
      <EpochCredit ds={ds} />
    </>
  );
}
