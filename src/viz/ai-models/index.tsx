// ai-models — CHANGED (S3-ai1): AI models 2017–2026 — who released what and when, how much computing went into them, and
// where they come from. Layers: data.ts (contract, the rule, derivations) → state.ts (URL state) → this shell (angle tabs,
// view switch) → one component per angle (timeline, scale, origins; CHANGED (S3-ai2): arena, users, lineage). Each angle
// loads only the files it draws. CHANGED (S3-ai2): C · D · E are lazy chunks of their own (with the Spans, Milestones and
// Tree cores and d3-hierarchy), so the default angle loads ≈ 21 kB gzip, not 36 (docs/AI-MODELS-PLAN.md §4: ≤ 30).
import { Suspense, lazy, useCallback, useId, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { VizBodyProps } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { ui } from '../../i18n/ui';
import { DataState } from './common';
import { OriginsAngle } from './origins';
import { ScaleAngle } from './scale';
import { SHOWS, parseAiState, switchShow, toAiParams } from './state';
import type { AiState, Show } from './state';
import { SHOW_TEXT, txt } from './text';
import { TimelineAngle } from './timeline';

// CHANGED (S3-ai2): one chunk per new angle; a chunk that fails to load goes through the site's chunkReload like a page.
const ArenaAngle = lazy(() => import('./arena').then((m) => ({ default: m.ArenaAngle })));
const UsersAngle = lazy(() => import('./users').then((m) => ({ default: m.UsersAngle })));
const LineageAngle = lazy(() => import('./lineage').then((m) => ({ default: m.LineageAngle })));
// CHANGED (S3-ai4): G — "Then and now", a lazy chunk too (the main chunk keeps its 30 kB gzip budget).
const DayAngle = lazy(() => import('./day').then((m) => ({ default: m.DayAngle })));

export default function AiModels({ params, setParams }: VizBodyProps) {
  const { t } = useLang();
  const base = useId();
  const settings = useMemo(() => parseAiState(params), [params]);
  const update = useCallback((patch: Partial<AiState>) => setParams(toAiParams({ ...settings, ...patch })), [settings, setParams]);
  const show = (s: Show): void => setParams(toAiParams(switchShow(settings, s)));

  const angles: Record<Show, ReactNode> = {
    timeline: <TimelineAngle settings={settings} update={update} />,
    scale: <ScaleAngle settings={settings} update={update} />,
    arena: <ArenaAngle settings={settings} update={update} />,
    users: <UsersAngle settings={settings} update={update} />,
    lineage: <LineageAngle settings={settings} update={update} />,
    origins: <OriginsAngle settings={settings} update={update} />,
    day: <DayAngle settings={settings} update={update} />,
  };

  return (
    <div className="viz-body">
      <div className="controls" role="group" aria-label={t(txt.angles)}>
        <div className="field field-subtabs">
          <span className="field-label" id={`${base}-show`}>
            {t(txt.angle)}
          </span>
          <div className="subtabs" role="radiogroup" aria-labelledby={`${base}-show`}>
            {SHOWS.map((s) => (
              <label key={s} className={settings.show === s ? 'is-on' : undefined}>
                <input type="radio" name={`${base}-show`} value={s} checked={settings.show === s} onChange={() => show(s)} />
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
                <input type="radio" name={`${base}-view`} value={v} checked={settings.view === v} onChange={() => update({ view: v })} />
                {t(v === 'chart' ? ui.viewChart : ui.viewTable)}
              </label>
            ))}
          </div>
        </div>
      </div>
      <p className="show-intro">{t(SHOW_TEXT[settings.show].intro)}</p>
      <Suspense fallback={<DataState status="loading" />}>{angles[settings.show]}</Suspense>
    </div>
  );
}
