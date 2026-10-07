// text.ts — CHANGED (S3-cp): words of the country profile page. Kept out of i18n/ui.ts, which ships in the initial
// chunk; this file loads with the page.
import type { FactGroup } from '../../catalog/facts';
import type { Lang, Localized } from '../../catalog/types';

export const txt = {
  title: { en: '{country} in numbers', uk: '{country} в цифрах' },
  lede: {
    en: 'Where {country} stands in {n} {rankings} of the gallery. Every number comes from the same file and the same calculation as on the visualization’s own page; each row opens that page with the country highlighted.',
    uk: 'Де {country} у {n} {rankings} галереї. Кожне число взято з того самого файлу й того самого розрахунку, що на сторінці інфографіки; кожен рядок відкриває ту сторінку з виділеною країною.',
  },
  howRead: {
    en: 'The dot is the place between #1 and last; what #1 means is written under each name.',
    uk: 'Точка — місце між №1 і останнім; що означає №1, написано під кожною назвою.',
  },
  howYear: {
    en: 'The year sits next to every value: sources update at different times.',
    uk: 'Рік стоїть біля кожного значення: джерела оновлюються в різний час.',
  },
  rank: { en: '#{rank}', uk: '№{rank}' },
  of: { en: 'of {of}', uk: 'з {of}' },
  shared: { en: 'shared {from}–{to}', uk: 'спільне {from}–{to}' },
  sameAs: { en: 'same as {k} other {countries}', uk: 'як і ще {k} {countries}' },
  ownYear: { en: 'Figure for {own}; the ranking is for {year}', uk: 'Дані за {own} рік, рейтинг — за {year}' },
  up: { en: '▲{n} since {year}', uk: '▲{n} з {year}' },
  down: { en: '▼{n} since {year}', uk: '▼{n} з {year}' },
  same: { en: 'same place as in {year}', uk: 'те саме місце, що у {year}' },
  open: { en: 'Open →', uk: 'Відкрити →' },
  openLabel: { en: 'Open the ranking: {label}', uk: 'Відкрити рейтинг: {label}' },
  missing: { en: 'Not in the data:', uk: 'Немає в даних:' },
  missingItem: { en: '{label} (the ranking lists {of} {countries})', uk: '{label} (у рейтингу {of} {countries})' },
  onlyTitle: { en: 'About Ukraine only', uk: 'Лише про Україну' },
  noteMarked: {
    en: '* Internationally recognized borders, as on the visualization’s page.',
    uk: '* У міжнародно визнаних кордонах, як на сторінці інфографіки.',
  },
  noteSources: {
    en: 'The sources of every number are listed under “About the data” on the visualization’s page.',
    uk: 'Джерела кожного числа — у блоці «Про дані» на сторінці інфографіки.',
  },
  chartLabel: { en: 'Place {rank} of {of}', uk: 'Місце {rank} з {of}' },
} satisfies Record<string, Localized>;

export const GROUP_TITLES: Record<FactGroup, Localized> = {
  economy: { en: 'Economy', uk: 'Економіка' },
  people: { en: 'People', uk: 'Люди' },
  land: { en: 'Land', uk: 'Територія' },
  security: { en: 'Security', uk: 'Безпека' },
  energy: { en: 'Energy', uk: 'Енергетика' },
};

const plural = (lang: Lang) => new Intl.PluralRules(lang === 'uk' ? 'uk' : 'en');

/** "3 rankings" / "3 рейтинги" — a section's count. */
export function rankingsCount(n: number, lang: Lang): string {
  const form = plural(lang).select(n);
  const words: Record<string, string> =
    lang === 'uk' ? { one: 'рейтинг', few: 'рейтинги', many: 'рейтингів', other: 'рейтингу' } : { one: 'ranking', other: 'rankings' };
  return `${n} ${words[form] ?? words.other!}`;
}

/** The word after "in {n}" in the lede: "rankings" / "рейтингах" (UK locative: 1, 21 → "рейтингу"). */
export function rankingsIn(n: number, lang: Lang): string {
  const one = plural(lang).select(n) === 'one';
  return lang === 'uk' ? (one ? 'рейтингу' : 'рейтингах') : one ? 'ranking' : 'rankings';
}

/** "countries" after a number: 1 country / 2 країни / 5 країн. */
export function countriesWord(n: number, lang: Lang): string {
  const form = plural(lang).select(n);
  const words: Record<string, string> =
    lang === 'uk' ? { one: 'країна', few: 'країни', many: 'країн', other: 'країни' } : { one: 'country', other: 'countries' };
  return words[form] ?? words.other!;
}
