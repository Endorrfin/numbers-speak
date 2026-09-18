import type { Localized } from '../catalog/types';

/**
 * UI chrome strings (bilingual). Technical terms stay English in both languages.
 * Resolve with `t()` from useLang(): t(ui.search).
 */
export const ui = {
  brandTitle: { en: 'Numbers Speak', uk: 'Цифри говорять' },
  brandSubtitle: { en: 'Interactive D3 data stories', uk: 'Інтерактивні історії даних на D3' },
  skipToContent: { en: 'Skip to content', uk: 'Перейти до змісту' },
  mainNav: { en: 'Main', uk: 'Головна навігація' },
  gallery: { en: 'Gallery', uk: 'Галерея' },
  about: { en: 'About', uk: 'Про проєкт' },
  languageToggle: { en: 'Українською', uk: 'In English' },
  languageToggleLabel: { en: 'Switch the language to Ukrainian', uk: 'Перемкнути мову на англійську' },
  theme: { en: 'Theme', uk: 'Тема' },
  themeSystem: { en: 'System', uk: 'Системна' },
  themeDark: { en: 'Dark', uk: 'Темна' },
  themeLight: { en: 'Light', uk: 'Світла' },
  loading: { en: 'Loading…', uk: 'Завантаження…' },

  heroTitle: {
    en: 'Ukraine and the world, in numbers',
    uk: 'Україна і світ у цифрах',
  },
  heroLede: {
    en: 'Interactive charts built with D3. Each one lets you change the view, share the exact state by link and check where every number comes from.',
    uk: 'Інтерактивні графіки на D3. Кожен можна налаштувати, поділитися точним виглядом за посиланням і перевірити, звідки кожне число.',
  },
  topics: { en: 'Topics', uk: 'Теми' },
  tabAll: { en: 'All', uk: 'Усі' },
  tabNew: { en: 'New', uk: 'Нові' },
  tabAllLede: {
    en: 'Every visualization in the gallery.',
    uk: 'Усі візуалізації галереї.',
  },
  tabNewLede: {
    en: 'Added in the last 30 days.',
    uk: 'Додані за останні 30 днів.',
  },

  filters: { en: 'Filters', uk: 'Фільтри' },
  searchLabel: { en: 'Search', uk: 'Пошук' },
  searchPlaceholder: { en: 'Title or keyword…', uk: 'Назва або ключове слово…' },
  chartKind: { en: 'Chart', uk: 'Графік' },
  geography: { en: 'Geography', uk: 'Географія' },
  origin: { en: 'Origin', uk: 'Походження' },
  any: { en: 'Any', uk: 'Будь-який' },
  originOriginal: { en: 'Original', uk: 'Власна' },
  originAdapted: { en: 'Adapted', uk: 'Адаптована' },
  clearFilters: { en: 'Clear filters', uk: 'Скинути фільтри' },
  resultsCount: { en: 'Shown: {n}', uk: 'Показано: {n}' },
  emptyTitle: { en: 'Nothing matches these filters', uk: 'Нічого не відповідає фільтрам' },
  emptyTab: {
    en: 'This topic has no visualizations yet — they are on the way.',
    uk: 'У цій темі ще немає візуалізацій — вони вже в роботі.',
  },

  badgeSoon: { en: 'Soon', uk: 'Незабаром' },
  badgeNew: { en: 'New', uk: 'Нове' },
  badgeDraft: { en: 'Draft', uk: 'Чернетка' },
  open: { en: 'Open', uk: 'Відкрити' },

  backToGallery: { en: 'Gallery', uk: 'Галерея' },
  breadcrumbs: { en: 'Breadcrumbs', uk: 'Навігаційний ланцюжок' },
  soonNotice: {
    en: 'This visualization is being rebuilt. The chart, its settings and the data download arrive in an upcoming release.',
    uk: 'Цю візуалізацію перебудовуємо. Графік, налаштування й завантаження даних з’являться в одному з наступних релізів.',
  },
  draftNotice: {
    en: 'Draft — visible only in development.',
    uk: 'Чернетка — видно лише в режимі розробки.',
  },
  share: { en: 'Copy link', uk: 'Копіювати посилання' },
  shareDone: { en: 'Link copied — it keeps the current settings.', uk: 'Посилання скопійовано — з поточними налаштуваннями.' },
  shareFailed: { en: 'Copy failed — copy the address bar instead.', uk: 'Не вдалося скопіювати — скопіюйте адресний рядок.' },
  chartError: {
    en: 'This chart failed to load. Reload the page; if it keeps failing, please report it.',
    uk: 'Графік не завантажився. Оновіть сторінку; якщо не допоможе — повідомте, будь ласка.',
  },
  reportIssue: { en: 'Report an issue', uk: 'Повідомити про проблему' },

  aboutData: { en: 'About the data', uk: 'Про дані' },
  howBuilt: { en: 'How it’s built', uk: 'Як побудовано' },
  period: { en: 'Period', uk: 'Період' },
  sources: { en: 'Sources', uk: 'Джерела' },
  retrieved: { en: 'retrieved', uk: 'отримано' },
  noSources: { en: 'Sources are being verified.', uk: 'Джерела перевіряються.' },
  licence: { en: 'Licence & attribution', uk: 'Ліцензія й атрибуція' },
  originalWork: {
    en: 'Original work: data selection, design and code by Vasyl Krupka (code under MIT). Data keeps the terms of its sources.',
    uk: 'Власна робота: добір даних, дизайн і код — Vasyl Krupka (код під MIT). Дані — за умовами своїх джерел.',
  },
  adaptedFrom: { en: 'Adapted from', uk: 'Адаптовано з' },
  dataFiles: { en: 'Data files', uk: 'Файли даних' },
  noDataFiles: { en: 'Data download arrives with the chart.', uk: 'Завантаження даних з’явиться разом із графіком.' },
  updated: { en: 'Updated', uk: 'Оновлено' },
  added: { en: 'Added', uk: 'Додано' },
  chartType: { en: 'Chart type', uk: 'Тип графіка' },
  d3Modules: { en: 'D3 modules', uk: 'Модулі D3' },
  d3ModulesSoon: { en: 'Listed when the chart ships.', uk: 'З’являться разом із графіком.' },
  sourceCode: { en: 'Source code on GitHub', uk: 'Код на GitHub' },
  stack: { en: 'Stack', uk: 'Стек' },

  // CHANGED (S2): shared chart controls and states.
  chartSettings: { en: 'Chart settings', uk: 'Налаштування графіка' },
  region: { en: 'Region', uk: 'Регіон' },
  allRegions: { en: 'All regions', uk: 'Усі регіони' },
  rows: { en: 'Rows', uk: 'Рядки' },
  prevPage: { en: 'Previous rows', uk: 'Попередні рядки' },
  nextPage: { en: 'Next rows', uk: 'Наступні рядки' },
  view: { en: 'View', uk: 'Вигляд' },
  viewChart: { en: 'Chart', uk: 'Графік' },
  viewTable: { en: 'Table', uk: 'Таблиця' },
  legend: { en: 'Legend — select a region to filter', uk: 'Легенда — виберіть регіон для фільтра' },
  showingRange: { en: 'Showing {from}–{to} of {total}', uk: 'Показано {from}–{to} з {total}' },
  showingAll: { en: '{total} rows', uk: 'Рядків: {total}' },
  rank: { en: 'Rank', uk: 'Місце' },
  country: { en: 'Country or economy', uk: 'Країна чи економіка' },
  dataLoadError: {
    en: 'The data could not be loaded. Check your connection and try again.',
    uk: 'Не вдалося завантажити дані. Перевірте з’єднання й спробуйте ще раз.',
  },
  retry: { en: 'Try again', uk: 'Спробувати ще раз' },

  notFoundTitle: { en: 'Page not found', uk: 'Сторінку не знайдено' },
  notFoundBody: {
    en: 'The link may be outdated, or the visualization has moved.',
    uk: 'Можливо, посилання застаріло або візуалізацію перенесено.',
  },
  vizNotFound: {
    en: 'There is no visualization with this address.',
    uk: 'Візуалізації з такою адресою немає.',
  },

  footerData: {
    en: 'Every chart lists its data sources. Code: MIT.',
    uk: 'Кожен графік містить свої джерела даних. Код: MIT.',
  },
  footerAuthor: { en: 'Made by Vasyl Krupka', uk: 'Автор — Vasyl Krupka' },
  portfolio: { en: 'Portfolio', uk: 'Портфоліо' },
  repository: { en: 'Repository', uk: 'Репозиторій' },
} satisfies Record<string, Localized>;

/** Replace `{name}` placeholders. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in values ? String(values[key]) : m));
}
