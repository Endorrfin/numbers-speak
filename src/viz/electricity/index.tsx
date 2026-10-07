// electricity — CHANGED (S3-el): who generates the world's electricity, from what, how clean, who has none — and Ukraine.
// Layers: data.ts (contract, parsers, derivations) → state.ts (URL state) → this shell (angle tabs, view switch)
// → one component per angle (producers, mix, world, race, carbon, access, ukraine). Each angle loads only the files
// it draws, so the first view does not wait for the race or the World Bank data.
import { useCallback, useId, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { VizBodyProps } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { ui } from '../../i18n/ui';
import { AccessAngle } from './access';
import { CarbonAngle } from './carbon';
import { MixAngle } from './mix';
import { ProducersAngle } from './producers';
import { RaceAngle } from './race';
import { UkraineAngle } from './ukraine';
import { WorldAngle } from './world';
import { SHOWS, parseElectricityState, switchShow, toElectricityParams } from './state';
import type { ElectricityState, Show } from './state';
import { SHOW_TEXT, txt } from './text';

export default function Electricity({ params, setParams }: VizBodyProps) {
  const { t } = useLang();
  const base = useId();
  const settings = useMemo(() => parseElectricityState(params), [params]);
  const update = useCallback((patch: Partial<ElectricityState>) => setParams(toElectricityParams({ ...settings, ...patch })), [settings, setParams]);
  const show = (s: Show): void => setParams(toElectricityParams(switchShow(settings, s)));

  const angles: Record<Show, ReactNode> = {
    producers: <ProducersAngle settings={settings} update={update} />,
    mix: <MixAngle settings={settings} update={update} />,
    world: <WorldAngle settings={settings} update={update} />,
    race: <RaceAngle settings={settings} update={update} />,
    carbon: <CarbonAngle settings={settings} update={update} />,
    access: <AccessAngle settings={settings} update={update} />,
    ukraine: <UkraineAngle settings={settings} update={update} />,
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
