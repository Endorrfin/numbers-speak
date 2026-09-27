// real-estate-world — CHANGED (S3-re): housing in ~530 cities (Numbeo, one snapshot) from six angles: a ranking
// of eight measures, price vs affordability, a year of income & the mortgage, the centre vs the outskirts (+ rent),
// a world map and a side-by-side comparison. A city picker highlights up to five cities on every angle (default:
// the Ukrainian cities; presets; state in the URL). Layers: data.ts (contract, parser, rankings) → state.ts (URL
// state) → measures.ts / text.ts (formats, words) → angles.tsx (the six angles) → this shell.
import { useCallback, useId, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { VizBodyProps } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
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
 * Search (a native <datalist>, so keyboards and screen readers get the platform's own combobox) + removable chips +
 * presets. Picking a suggestion adds the city at once; typing a full name and pressing Enter or «Add» works too.
 */
function CityPicker({ data, highlighted, onChange }: PickerProps) {
  const { t, lang } = useLang();
  const base = useId();
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const options = useMemo(
    () =>
      data.rows
        .map((r) => ({ r, label: cityWithCountry(r, lang) }))
        .sort((a, b) => a.label.localeCompare(b.label, lang === 'uk' ? 'uk' : 'en')),
    [data, lang],
  );
  const labels = useMemo(() => new Map(options.map(({ r, label }) => [label.toLowerCase(), r])), [options]);
  const lookup = useMemo(() => {
    const map = new Map<string, CityRow>();
    const names = new Map<string, number>();
    for (const { r } of options) {
      const n = r.name[lang].toLowerCase();
      names.set(n, (names.get(n) ?? 0) + 1);
    }
    for (const { r, label } of options) {
      map.set(label.toLowerCase(), r);
      map.set(r.numbeo.toLowerCase(), r);
      if (names.get(r.name[lang].toLowerCase()) === 1) map.set(r.name[lang].toLowerCase(), r);
    }
    return map;
  }, [options, lang]);
  const ids = highlighted.map((r) => r.id);

  const add = (raw: string, strict: boolean): boolean => {
    const q = raw.trim();
    if (!q) return false;
    const r = lookup.get(q.toLowerCase());
    if (!r) {
      if (strict) setMessage(fill(t(txt.notFound), { q }));
      return false;
    }
    if (ids.includes(r.id)) setMessage(fill(t(txt.already), { city: r.name[lang] }));
    else if (ids.length >= MAX_CITIES) setMessage(fill(t(txt.full), { n: MAX_CITIES }));
    else {
      onChange([...ids, r.id]);
      setMessage('');
    }
    setQuery('');
    return true;
  };
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    add(query, true);
  };

  return (
    <div className="re-picker">
      <form className="re-picker-form" onSubmit={submit} role="search">
        <div className="field re-picker-field">
          <label htmlFor={`${base}-city`}>
            {t(txt.picker)} <span className="muted">({fill(t(txt.pickerHint), { n: MAX_CITIES })})</span>
          </label>
          <div className="re-picker-row">
            <input
              id={`${base}-city`}
              type="search"
              list={`${base}-cities`}
              value={query}
              placeholder={t(txt.pickerPlaceholder)}
              autoComplete="off"
              onChange={(e) => {
                setQuery(e.target.value);
                setMessage('');
                // A picked suggestion matches an option exactly: add it without waiting for Enter.
                if (labels.has(e.target.value.trim().toLowerCase())) add(e.target.value, false);
              }}
            />
            <button type="submit" className="btn btn-ghost">
              {t(txt.add)}
            </button>
          </div>
          <datalist id={`${base}-cities`}>
            {options.map(({ r, label }) => (
              <option key={r.id} value={label} />
            ))}
          </datalist>
        </div>
      </form>
      <p className="re-picker-message" role="status">
        {message}
      </p>
      <div className="re-picker-chips">
        {highlighted.length ? (
          <ul className="re-chips" aria-label={t(txt.highlightLegend)}>
            {highlighted.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="re-chip"
                  aria-label={fill(t(txt.remove), { city: r.name[lang] })}
                  onClick={() => onChange(ids.filter((id) => id !== r.id))}
                >
                  {r.name[lang]} <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <span className="muted">{t(txt.noneSelected)}</span>
        )}
        <span className="re-presets">
          <span className="field-label">{t(txt.presets)}:</span>
          <button type="button" className="btn btn-ghost re-preset" onClick={() => onChange(null)}>
            {t(txt.presetUa)}
          </button>
          <button type="button" className="btn btn-ghost re-preset" onClick={() => onChange(NEIGHBOURS.filter((id) => data.rows.some((r) => r.id === id)))}>
            {t(txt.presetNeighbours)}
          </button>
          {highlighted.length > 0 && (
            <button type="button" className="btn btn-ghost re-preset" onClick={() => onChange([])}>
              {t(txt.clear)}
            </button>
          )}
        </span>
      </div>
    </div>
  );
}
