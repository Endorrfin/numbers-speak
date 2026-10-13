// ai-models — CHANGED (S3-ai1): AI models 2017–2026 — who released what and when, how much computing went into them, and
// where they come from. Layers: data.ts (contract, the rule, derivations) → state.ts (URL state) → this shell (angle tabs,
// view switch) → one component per angle (timeline, scale, origins; arena, users and lineage arrive in S3-ai2). Each angle
// loads only the files it draws.
import { useCallback, useId, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { VizBodyProps } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { ui } from '../../i18n/ui';
import { OriginsAngle } from './origins';
import { ScaleAngle } from './scale';
import { SHOWS, parseAiState, switchShow, toAiParams } from './state';
import type { AiState, Show } from './state';
import { SHOW_TEXT, txt } from './text';
import { TimelineAngle } from './timeline';

export default function AiModels({ params, setParams }: VizBodyProps) {
  const { t } = useLang();
  const base = useId();
  const settings = useMemo(() => parseAiState(params), [params]);
  const update = useCallback((patch: Partial<AiState>) => setParams(toAiParams({ ...settings, ...patch })), [settings, setParams]);
  const show = (s: Show): void => setParams(toAiParams(switchShow(settings, s)));

  const angles: Record<Show, ReactNode> = {
    timeline: <TimelineAngle settings={settings} update={update} />,
    scale: <ScaleAngle settings={settings} update={update} />,
    origins: <OriginsAngle settings={settings} update={update} />,
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
      {angles[settings.show]}
    </div>
  );
}
