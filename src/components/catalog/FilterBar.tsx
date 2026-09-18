import { useId } from 'react';
import { CHART_LABELS, GEO_LABELS } from '../../catalog/rubrics';
import { hasActiveFilters } from '../../catalog/filter';
import type { CatalogQuery, OriginFilter } from '../../catalog/filter';
import { CHART_KINDS, GEOS } from '../../catalog/types';
import type { ChartKind, Geo, VizMeta } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { ui } from '../../i18n/ui';

type Props = {
  query: CatalogQuery;
  /** Entries of the current tab — facet options come from them, so no option leads to nothing. */
  pool: readonly VizMeta[];
  onChange: (next: CatalogQuery) => void;
};

export function FilterBar({ query, pool, onChange }: Props) {
  const { t } = useLang();
  const base = useId();

  const charts = CHART_KINDS.filter((c) => c === query.chart || pool.some((m) => m.chart === c));
  const geos = GEOS.filter((g) => g === query.geo || pool.some((m) => m.geo === g));
  const origins: OriginFilter[] = (['original', 'adapted'] as const).filter(
    (o) => o === query.origin || pool.some((m) => m.origin.kind === o),
  );

  return (
    <form className="filterbar" role="search" aria-label={t(ui.filters)} onSubmit={(e) => e.preventDefault()}>
      <div className="field field-search">
        <label htmlFor={`${base}-q`}>{t(ui.searchLabel)}</label>
        <input
          id={`${base}-q`}
          type="search"
          value={query.q ?? ''}
          placeholder={t(ui.searchPlaceholder)}
          maxLength={80}
          autoComplete="off"
          onChange={(e) => onChange({ ...query, q: e.target.value || undefined })}
        />
      </div>

      <div className="field">
        <label htmlFor={`${base}-chart`}>{t(ui.chartKind)}</label>
        <select
          id={`${base}-chart`}
          value={query.chart ?? ''}
          onChange={(e) => onChange({ ...query, chart: (e.target.value || undefined) as ChartKind | undefined })}
        >
          <option value="">{t(ui.any)}</option>
          {charts.map((c) => (
            <option key={c} value={c}>
              {t(CHART_LABELS[c])}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${base}-geo`}>{t(ui.geography)}</label>
        <select
          id={`${base}-geo`}
          value={query.geo ?? ''}
          onChange={(e) => onChange({ ...query, geo: (e.target.value || undefined) as Geo | undefined })}
        >
          <option value="">{t(ui.any)}</option>
          {geos.map((g) => (
            <option key={g} value={g}>
              {t(GEO_LABELS[g])}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${base}-origin`}>{t(ui.origin)}</label>
        <select
          id={`${base}-origin`}
          value={query.origin ?? ''}
          onChange={(e) =>
            onChange({ ...query, origin: (e.target.value || undefined) as OriginFilter | undefined })
          }
        >
          <option value="">{t(ui.any)}</option>
          {origins.map((o) => (
            <option key={o} value={o}>
              {t(o === 'original' ? ui.originOriginal : ui.originAdapted)}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters(query) && (
        <button type="button" className="btn btn-ghost" onClick={() => onChange({ tab: query.tab })}>
          {t(ui.clearFilters)}
        </button>
      )}
    </form>
  );
}
