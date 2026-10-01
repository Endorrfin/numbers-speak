// real-estate-world — CHANGED (S3-re): housing in ~530 cities (Numbeo, one snapshot) from six angles: a ranking
// of eight measures, price vs affordability, a year of income & the mortgage, the centre vs the outskirts (+ rent),
// a world map and a side-by-side comparison. A city picker highlights up to five cities on every angle (default:
// the Ukrainian cities; presets; state in the URL). Layers: data.ts (contract, parser, rankings) → state.ts (URL
// state) → measures.ts / text.ts (formats, words) → angles.tsx (the six angles) → this shell.
import { useCallback, useId, useMemo } from 'react';
import type { ReactNode } from 'react';
import { FocusPicker } from '../../components/viz/FocusPicker'; // CHANGED (S3-uf)
import type { FocusOption, FocusPickerText, FocusPreset } from '../../components/viz/FocusPicker';
import type { VizBodyProps } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { ui } from '../../i18n/ui';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { CentreAngle, CompareAngle, IncomeAngle, MapAngle, RankingAngle, ScatterAngle } from './angles';
import { DATA_FILE, allRanks, parseRealEstateDataset } from './data';
import type { CityRow, RealEstateDataset } from './data';
import { cityWithCountry } from './measures';
import { MAX_CITIES, NEIGHBOURS, SHOWS, defaultCities, parseRealEstateState, toRealEstateParams } from './state';
import type { RealEstateState } from './state';
import { txt } from './text';

const NUMBEO_PRICES = 'https://www.numbeo.com/cost-of-living/city_price_rankings?displayCurrency=USD&itemId=100';
const NUMBEO_INDEX = 'https://www.numbeo.com/property-investment/rankings_current.jsp';
const NUMBEO_METHOD = 'https://www.numbeo.com/property-investment/indicators_explained.jsp';

export default function RealEstateWorld({ params, setParams }: VizBodyProps) {
  const { t } = useLang();
  const settings = useMemo(() => parseRealEstateState(params), [params]);
  const state = useDataset(dataUrl('real-estate-world', DATA_FILE), parseRealEstateDataset);
  const update = useCallback(
    (patch: Partial<RealEstateState>) => setParams(toRealEstateParams({ ...settings, ...patch })),
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
  } else body = <RealEstateView data={state.data} settings={settings} update={update} />;

  return <div className="viz-body">{body}</div>;
}

type ViewProps = { data: RealEstateDataset; settings: RealEstateState; update: (patch: Partial<RealEstateState>) => void };

function RealEstateView({ data, settings, update }: ViewProps) {
  const { t } = useLang();
  const base = useId();
  const ranks = useMemo(() => allRanks(data), [data]);
  const byId = useMemo(() => new Map(data.rows.map((r) => [r.id, r])), [data]);
  const fallback = useMemo(() => defaultCities(data.rows), [data]);
  const ids = settings.cities ?? fallback;
  const highlighted = useMemo(() => ids.map((id) => byId.get(id)).filter((r): r is CityRow => r !== undefined), [ids, byId]);
  const setCities = (next: string[] | null): void => update({ cities: next && next.join(',') === fallback.join(',') ? null : next });
  const props = { data, settings, update, highlighted, ranks };

  return (
    <>
      <div className="controls" role="group" aria-label={t(txt.angle)}>
        <div className="field field-subtabs">
          <span className="field-label" id={`${base}-show`}>
            {t(txt.angle)}
          </span>
          <div className="subtabs" role="radiogroup" aria-labelledby={`${base}-show`}>
            {SHOWS.map((s) => (
              <label key={s} className={settings.show === s ? 'is-on' : undefined}>
                <input type="radio" name={`${base}-show`} value={s} checked={settings.show === s} onChange={() => update({ show: s, page: 1 })} />
                {t(txt.shows[s])}
              </label>
            ))}
          </div>
        </div>
      </div>

      <CityPicker data={data} highlighted={highlighted} onChange={setCities} />

      {settings.show === 'ranking' && <RankingAngle {...props} />}
      {settings.show === 'scatter' && <ScatterAngle {...props} />}
      {settings.show === 'income' && <IncomeAngle {...props} />}
      {settings.show === 'centre' && <CentreAngle {...props} />}
      {settings.show === 'map' && <MapAngle {...props} />}
      {settings.show === 'compare' && <CompareAngle {...props} />}

      <p className="chart-note muted">
        {t(txt.numbeoNote)}{' '}
        <a href={NUMBEO_PRICES} rel="noopener noreferrer" target="_blank">
          {t(txt.linkPrices)}
        </a>
        {' · '}
        <a href={NUMBEO_INDEX} rel="noopener noreferrer" target="_blank">
          {t(txt.linkIndex)}
        </a>
        {' · '}
        <a href={NUMBEO_METHOD} rel="noopener noreferrer" target="_blank">
          {t(txt.linkMethod)}
        </a>
      </p>
    </>
  );
}

type PickerProps = { data: RealEstateDataset; highlighted: readonly CityRow[]; onChange: (ids: string[] | null) => void };

/**
 * CHANGED (S3-uf): the shared FocusPicker (components/viz) with the city options — the suggestion is "city, country";
 * the Numbeo name and a city name that is unique in the list also pick a city when typed in full.
 */
function CityPicker({ data, highlighted, onChange }: PickerProps) {
  const { t, lang } = useLang();
  const options = useMemo<FocusOption[]>(() => {
    const names = new Map<string, number>();
    for (const r of data.rows) {
      const n = r.name[lang].toLowerCase();
      names.set(n, (names.get(n) ?? 0) + 1);
    }
    return data.rows.map((r) => ({
      id: r.id,
      label: cityWithCountry(r, lang),
      name: r.name[lang],
      keys: names.get(r.name[lang].toLowerCase()) === 1 ? [r.numbeo, r.name[lang]] : [r.numbeo],
    }));
  }, [data, lang]);
  const text: FocusPickerText = {
    label: t(txt.picker),
    hint: t(txt.pickerHint),
    placeholder: t(txt.pickerPlaceholder),
    remove: t(txt.remove),
    notFound: t(txt.notFound),
    full: t(txt.full),
    already: t(txt.already),
    none: t(txt.noneSelected),
    chips: t(txt.highlightLegend),
    presets: t(txt.presets),
  };
  const presets: FocusPreset[] = [
    { label: t(txt.presetUa), ids: null },
    { label: t(txt.presetNeighbours), ids: NEIGHBOURS.filter((id) => data.rows.some((r) => r.id === id)) },
  ];
  return <FocusPicker options={options} selected={highlighted.map((r) => r.id)} max={MAX_CITIES} text={text} presets={presets} onChange={onChange} />;
}
