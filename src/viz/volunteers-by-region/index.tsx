// volunteers-by-region — registered volunteers by region, Nov 2024 (S3-cd).
import { useCallback, useMemo } from 'react';
import { RankedBar } from '../../charts/RankedBar';
import { SERIES_COLOR } from '../../charts/palette';
import type { RankedBarRow } from '../../charts/renderRankedBar';
import type { Lang, VizBodyProps } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { formatNumber, formatShare } from '../../lib/format';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { DATA_FILE, REGION_NAME, parseRegions } from './data';
import type { RegionDataset, RegionRow } from './data';
import { parseViewState, toViewParams } from './state';
import type { View } from './state';

const DATA_URL = dataUrl('volunteers-by-region', DATA_FILE);
const parse = (json: unknown): RegionDataset => parseRegions(json);

const txt = {
  headline: { en: 'Key numbers', uk: 'Головні числа' },
  kpiTotal: { en: 'registered volunteers, {asOf}', uk: 'зареєстрованих волонтерів, {asOf}' },
  kpiTop: { en: 'largest region: {name}', uk: 'найбільше в реєстрі: {name}' },
  kpiTop3: { en: 'in the three largest regions', uk: 'у трьох найбільших областях' },
  crimeaNote: {
    en: 'The AR of Crimea shows 0, not a gap: the registry is run by Ukraine’s State Tax Service and is unreachable under occupation.',
    uk: 'АР Крим показує 0 — це не прогалина: реєстр веде податкова служба України, недоступна на окупованій території.',
  },
  kyivNote: {
    en: '“Kyiv city & Kyiv Oblast” combines both, as exported. Opendatabot’s article lists them separately (1,600 city + 896 oblast, Nov 2024) — close to, but not exactly, the combined figure here.',
    uk: '«Київ і Київська область» об’єднує обидва, як у вихідному файлі. Стаття Opendatabot подає їх окремо (1 600 місто + 896 область, листопад 2024) — близько, але не точно збігається з об’єднаною тут цифрою.',
  },
  tableCaption: { en: 'Registered volunteers by region, {asOf}', uk: 'Волонтери за областями, {asOf}' },
  region: { en: 'Region', uk: 'Область' },
  count: { en: 'Volunteers', uk: 'Волонтерів' },
} as const;

export default function VolunteersByRegion({ params, setParams }: VizBodyProps) {
  const { t } = useLang();
  const state = useDataset(DATA_URL, parse);
  const settings = useMemo(() => parseViewState(params), [params]);
  const update = useCallback((view: View) => setParams(toViewParams({ view })), [setParams]);

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
  return <RegionView dataset={state.data} view={settings.view} setView={update} />;
}

function RegionView({
  dataset,
  view,
  setView,
}: {
  dataset: RegionDataset;
  view: View;
  setView: (v: View) => void;
}) {
  const { t, lang } = useLang();
  const sorted = useMemo(() => [...dataset.rows].sort((a, b) => b.count - a.count), [dataset.rows]);
  const total = useMemo(() => dataset.rows.reduce((s, r) => s + r.count, 0), [dataset.rows]);
  const top = sorted[0]!;
  const top3Share = (sorted[0]!.count + sorted[1]!.count + sorted[2]!.count) / total;
  const caption = fill(t(txt.tableCaption), { asOf: dataset.asOf });

  const rows: RankedBarRow[] = useMemo(
    () =>
      sorted.map((r, i) => ({
        key: r.id,
        label: `${i + 1}  ${t(REGION_NAME[r.id])}`,
        value: r.count,
        color: r.id === 'crimea' ? 'var(--c-life-other)' : SERIES_COLOR.primary,
        valueLabel: formatNumber(r.count, lang),
        tooltip: {
          title: t(REGION_NAME[r.id]),
          lines: [`${formatNumber(r.count, lang)} ${t(txt.count).toLowerCase()}`],
        },
      })),
    [sorted, t, lang],
  );

  return (
    <div className="viz-body">
      <ul className="kpi-row" aria-label={t(txt.headline)}>
        <li className="kpi">
          <span className="kpi-value">{formatNumber(total, lang)}</span>
          <span className="kpi-label">{fill(t(txt.kpiTotal), { asOf: dataset.asOf })}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{formatNumber(top.count, lang)}</span>
          <span className="kpi-label">{fill(t(txt.kpiTop), { name: t(REGION_NAME[top.id]) })}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{formatShare(top3Share, lang)}</span>
          <span className="kpi-label">{t(txt.kpiTop3)}</span>
        </li>
      </ul>

      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <div className="field field-auto">
          <span className="field-label" id="vbr-view">
            {t(ui.view)}
          </span>
          <div className="segmented" role="radiogroup" aria-labelledby="vbr-view">
            {(['chart', 'table'] as const).map((v) => (
              <label key={v} className={view === v ? 'is-on' : undefined}>
                <input type="radio" name="vbr-view" value={v} checked={view === v} onChange={() => setView(v)} />
                {t(v === 'chart' ? ui.viewChart : ui.viewTable)}
              </label>
            ))}
          </div>
        </div>
      </div>

      {view === 'chart' ? (
        <RankedBar rows={rows} label={caption} tickFormat={(v) => formatNumber(v, lang)} />
      ) : (
        <RegionTable rows={sorted} lang={lang} caption={caption} />
      )}

      <div className="notice">
        <p>{t(txt.kyivNote)}</p>
        <p>{t(txt.crimeaNote)}</p>
      </div>
    </div>
  );
}

function RegionTable({ rows, lang, caption }: { rows: readonly RegionRow[]; lang: Lang; caption: string }) {
  const { t } = useLang();
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t(txt.region)}</th>
            <th scope="col" className="num">
              {t(txt.count)}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <th scope="row">{t(REGION_NAME[r.id])}</th>
              <td className="num">{formatNumber(r.count, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
