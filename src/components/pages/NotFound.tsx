import { useLang } from '../../i18n/lang';
import { ui } from '../../i18n/ui';
import { hrefCatalog } from '../../lib/hashRouter';

export function NotFound({ message }: { message?: string }) {
  const { t } = useLang();
  return (
    <div className="page not-found">
      <h1>{t(ui.notFoundTitle)}</h1>
      <p className="lede">{message ?? t(ui.notFoundBody)}</p>
      <p>
        <a className="btn" href={hrefCatalog()}>
          {t(ui.backToGallery)}
        </a>
      </p>
    </div>
  );
}
