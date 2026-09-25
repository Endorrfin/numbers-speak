import type { Localized, VizParams } from '../../catalog/types';
import { useLang } from '../../i18n/lang';
import { ui } from '../../i18n/ui';
import { storedOptOut } from '../../lib/analytics';
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

// CHANGED (S3-an): what the visit counter sends — and what it never does. A full-width panel, not a fifth
// principle card (the principles grid is four columns wide).
const STATS: { title: Localized; body: Localized } = {
  title: { en: 'Anonymous visit counts', uk: 'Знеособлена статистика' },
  body: {
    en: 'To see which visualizations people open, the site counts page views with GoatCounter: no cookies, no identifier in your browser, no personal data. After a page has loaded, only its address and title, the site you came from and your screen width are sent. Like any web request, it also carries your IP address and browser version: GoatCounter uses them only to tell unique visits apart (in memory, for up to 8 hours) and does not store them. If your browser asks not to be tracked (Do Not Track or Global Privacy Control), nothing is sent.',
    uk: 'Щоб бачити, які візуалізації відкривають, сайт рахує перегляди сторінок через GoatCounter: без cookies, без ідентифікаторів у вашому браузері й без персональних даних. Після завантаження сторінки надсилаються лише її адреса й назва, сайт, з якого ви прийшли, і ширина екрана. Як і будь-який вебзапит, він містить вашу IP-адресу та версію браузера: GoatCounter використовує їх лише щоб розрізнити унікальні візити (у пам’яті, до 8 годин), і не зберігає їх. Якщо браузер просить не відстежувати (Do Not Track або Global Privacy Control), не надсилається нічого.',
  },
};

// CHANGED (S3-an): shown only in a browser where the owner set #/about?no-count=1 — visitors never see it.
const NOT_COUNTED: Localized = {
  en: 'Visits from this browser are not counted (no-count). Open #/about?no-count=0 to count them again.',
  uk: 'Візити з цього браузера не рахуються (no-count). Відкрийте #/about?no-count=0, щоб рахувати їх знову.',
};

const INTRO: Localized = {
  en: 'Numbers Speak is a growing gallery of interactive data visualizations about Ukraine and the world, built with D3.js. New visualizations are added every month; existing ones are refreshed when their sources publish new data.',
  uk: '«Цифри говорять» — галерея інтерактивних візуалізацій даних про Україну і світ, що постійно поповнюється. Побудована на D3.js. Щомісяця додаються нові візуалізації, а наявні оновлюються, коли джерела публікують нові дані.',
};

const FEEDBACK: Localized = {
  en: 'Found a wrong number or a broken chart? Open an issue — corrections with a source are especially welcome.',
  uk: 'Помітили неточне число чи зламаний графік? Створіть issue — особливо цінні виправлення з посиланням на джерело.',
};

// CHANGED (S3-an): params (optional, so the smoke can render it bare) — `no-count` in this URL wins over the
// stored flag, because App's effect writes the flag only after this render.
export function AboutPage({ params = {} }: { params?: VizParams }) {
  const { t } = useLang();
  const noCount = params['no-count'];
  const notCounted = noCount === '1' || (noCount !== '0' && storedOptOut());
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

      {/* CHANGED (S3-an): visit statistics + the owner's opt-out confirmation. */}
      <section className="panel">
        <h2>{t(STATS.title)}</h2>
        <p>{t(STATS.body)}</p>
        {notCounted && (
          <p className="muted" role="status">
            {t(NOT_COUNTED)}
          </p>
        )}
      </section>

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
