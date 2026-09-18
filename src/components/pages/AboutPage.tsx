import type { Localized } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { ui } from '../../i18n/ui';
import { ISSUES_URL, PORTFOLIO_URL, REPO_URL } from '../../lib/links';

type Principle = { title: Localized; body: Localized };

const PRINCIPLES: readonly Principle[] = [
  {
    title: { en: 'Every number has a source', uk: 'Кожне число має джерело' },
    body: {
      en: 'Each visualization lists its data sources with the date the data was retrieved, and lets you download the data it draws.',
      uk: 'Кожна візуалізація вказує джерела даних і дату їх отримання та дає завантажити дані, з яких вона побудована.',
    },
  },
  {
    title: { en: 'You control the view', uk: 'Вигляд обираєте ви' },
    body: {
      en: 'Filters, sorting, units and time are settings, not screenshots. The address bar keeps them, so a copied link opens exactly what you see.',
      uk: 'Фільтри, сортування, одиниці й час — це налаштування, а не скриншоти. Адресний рядок їх зберігає, тож скопійоване посилання відкриває саме те, що ви бачите.',
    },
  },
  {
    title: { en: 'Two languages, one dataset', uk: 'Дві мови — один набір даних' },
    body: {
      en: 'English and Ukrainian share the same data and the same chart; only the words change. Technical terms stay in English.',
      uk: 'Англійська й українська версії мають ті самі дані й той самий графік — змінюються лише слова. Технічні терміни лишаються англійською.',
    },
  },
  {
    title: { en: 'Open and accessible', uk: 'Відкрито й доступно' },
    body: {
      en: 'The code is open (MIT). Charts work with a keyboard, respect reduced-motion settings and adapt to phone screens.',
      uk: 'Код відкритий (MIT). Графіками можна керувати з клавіатури, вони враховують налаштування «менше руху» й адаптуються до екранів телефонів.',
    },
  },
];

const INTRO: Localized = {
  en: 'Numbers Speak is a growing gallery of interactive data visualizations about Ukraine and the world, built with D3.js. New visualizations are added every month; existing ones are refreshed when their sources publish new data.',
  uk: '«Цифри говорять» — галерея інтерактивних візуалізацій даних про Україну і світ, що постійно поповнюється. Побудована на D3.js. Щомісяця додаються нові візуалізації, а наявні оновлюються, коли джерела публікують нові дані.',
};

const FEEDBACK: Localized = {
  en: 'Found a wrong number or a broken chart? Open an issue — corrections with a source are especially welcome.',
  uk: 'Помітили неточне число чи зламаний графік? Створіть issue — особливо цінні виправлення з посиланням на джерело.',
};

export function AboutPage() {
  const { t } = useLang();
  return (
    <div className="page about">
      <header className="page-head">
        <h1>{t(ui.about)}</h1>
        <p className="lede">{t(INTRO)}</p>
      </header>

      <ul className="principles">
        {PRINCIPLES.map((p) => (
          <li key={p.title.en} className="panel">
            <h2>{t(p.title)}</h2>
            <p>{t(p.body)}</p>
          </li>
        ))}
      </ul>

      <section className="panel">
        <h2>{t(ui.stack)}</h2>
        <p>D3.js 7 · React 19 · TypeScript · Vite · GitHub Pages</p>
        <p>{t(FEEDBACK)}</p>
        <p className="link-row">
          <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer">
            {t(ui.reportIssue)}
          </a>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            {t(ui.repository)}
          </a>
          <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
            {t(ui.portfolio)}
          </a>
        </p>
      </section>
    </div>
  );
}
