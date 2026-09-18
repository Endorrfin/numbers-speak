import { useEffect, useState } from 'react';
import { useLang } from '../../i18n/lang';
import { ui } from '../../i18n/ui';

type Status = 'idle' | 'done' | 'failed';

/** Copies the current URL — it already carries the chart settings in the hash query. */
export function ShareButton() {
  const { t } = useLang();
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    if (status === 'idle') return;
    const timer = window.setTimeout(() => setStatus('idle'), 4000);
    return () => window.clearTimeout(timer);
  }, [status]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus('done');
    } catch {
      setStatus('failed');
    }
  };

  return (
    <div className="share">
      <button type="button" className="btn" onClick={() => void copy()}>
        {t(ui.share)}
      </button>
      <span className="share-status" role="status" aria-live="polite">
        {status === 'done' ? t(ui.shareDone) : status === 'failed' ? t(ui.shareFailed) : ''}
      </span>
    </div>
  );
}
