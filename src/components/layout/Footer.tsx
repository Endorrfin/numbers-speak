import { useLang } from '../../i18n/lang';
import { ui } from '../../i18n/ui';
import { REPO_URL } from '../../lib/links';

export function Footer() {
  const { t } = useLang();
  return (
    <footer className="footer">
      <p>{t(ui.footerData)}</p>
      <p className="footer-links">
        <span className="footer-author">
          {t(ui.footerAuthor)}
          {/* An SVG flag: Windows renders flag emoji as two letters. */}
          <svg className="flag" viewBox="0 0 3 2" width="18" height="12" role="img" aria-label="Ukraine">
            <rect width="3" height="1" fill="#0057b7" />
            <rect y="1" width="3" height="1" fill="#ffd700" />
          </svg>
        </span>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          {t(ui.repository)}
        </a>
      </p>
    </footer>
  );
}
