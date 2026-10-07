// common.tsx — CHANGED (S3-oil): pieces the five angles share — props, the loading / error state.
import { useLang } from '../../i18n/lang';
import { ui } from '../../i18n/ui';
import type { OilState } from './state';

export type AngleProps = { settings: OilState; update: (patch: Partial<OilState>) => void };

/** Loading and error states shared by the angles (the same markup as the other entries). */
export function DataState({ status, retry }: { status: 'loading' | 'error'; retry?: () => void }) {
  const { t } = useLang();
  if (status === 'loading') return <p className="muted stage-loading">{t(ui.loading)}</p>;
  return (
    <div className="notice notice-warn load-error" role="alert">
      <p>{t(ui.dataLoadError)}</p>
      <button type="button" className="btn btn-ghost" onClick={retry}>
        {t(ui.retry)}
      </button>
    </div>
  );
}
