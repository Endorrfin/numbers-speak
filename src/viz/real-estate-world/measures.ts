// measures.ts — CHANGED (S3-re): how the page names, formats and explains each of the eight measures (pure; the
// ranking, the map, the tables and the comparison cards all read it, so a measure reads the same everywhere).
import type { Lang } from '../../i18n/lang';
import { countryName } from '../../lib/countries';
import {
  formatMultiple,
  formatNumber,
  formatPercentTick,
  formatShare,
  formatSquareMetres,
  formatUsdPrice,
  formatUsdTick,
  formatYears,
} from '../../lib/format';
import type { CityRow, Measure } from './data';

type L = { en: string; uk: string };

export type MeasureText = {
  /** The measure picker and table headers. */
  name: L;
  /** Short column header. */
  column: L;
  /** KPI caption of the city ranked first: "{city}: …". */
  top: L;
  /** One sentence on what the number means (under the chart). */
  note: L;
};

export const MEASURE_TEXT: Record<Measure, MeasureText> = {
  centre: {
    name: { en: 'Price per m², city centre', uk: 'Ціна м², центр міста' },
    column: { en: 'Centre, $/m²', uk: 'Центр, $/м²' },
    top: { en: '{city}: the dearest city centre', uk: '{city}: найдорожчий центр' },
    note: {
      en: 'US dollars per square metre to buy an apartment in the city centre — Numbeo’s users’ asking prices, not registered sales.',
      uk: 'Доларів США за квадратний метр квартири в центрі міста — ціни пропозиції від користувачів Numbeo, а не зареєстровані угоди.',
    },
  },
  outside: {
    name: { en: 'Price per m², outside the centre', uk: 'Ціна м², поза центром' },
    column: { en: 'Outside, $/m²', uk: 'Поза центром, $/м²' },
    top: { en: '{city}: the dearest outside the centre', uk: '{city}: найдорожче поза центром' },
    note: {
      en: 'US dollars per square metre to buy an apartment outside the city centre — asking prices reported by Numbeo’s users.',
      uk: 'Доларів США за квадратний метр квартири поза центром міста — ціни пропозиції від користувачів Numbeo.',
    },
  },
  premium: {
    name: { en: 'Centre premium (centre ÷ outside)', uk: 'Націнка центру (центр ÷ поза центром)' },
    column: { en: 'Centre ÷ outside', uk: 'Центр ÷ поза центром' },
    top: { en: '{city}: the widest gap between the centre and the outskirts', uk: '{city}: найбільший розрив між центром і околицями' },
    note: {
      en: 'How many times a square metre in the centre costs more than outside it; below 1× the outskirts are dearer.',
      uk: 'У скільки разів квадратний метр у центрі дорожчий, ніж поза ним; менше 1× — околиці дорожчі.',
    },
  },
  income: {
    name: { en: 'Years of income for a 90 m² home', uk: 'Років доходу за житло 90 м²' },
    column: { en: 'Years of income', uk: 'Років доходу' },
    top: { en: '{city}: the least affordable', uk: '{city}: найменш доступне житло' },
    note: {
      en: 'Numbeo’s price-to-income ratio: a 90 m² home at the average of the centre and outside prices ÷ a family’s yearly net income (1.5 average net salaries).',
      uk: 'Співвідношення «ціна / дохід» Numbeo: житло 90 м² за середньою ціною центру й околиць ÷ річний чистий дохід сім’ї (1,5 середньої чистої зарплати).',
    },
  },
  m2: {
    name: { en: 'm² a year of income buys', uk: 'м² за рік доходу' },
    column: { en: 'm² a year', uk: 'м² за рік' },
    top: { en: '{city}: the most home for a year of income', uk: '{city}: найбільше житла за рік доходу' },
    note: {
      en: 'Square metres a family’s yearly net income buys: 90 m² ÷ the years of income — the same ratio turned into floor space.',
      uk: 'Скільки квадратних метрів купує річний чистий дохід сім’ї: 90 м² ÷ роки доходу — те саме співвідношення, переведене в площу.',
    },
  },
  mortgage: {
    name: { en: 'Mortgage payment, % of income', uk: 'Платіж за іпотекою, % доходу' },
    column: { en: 'Mortgage, % of income', uk: 'Іпотека, % доходу' },
    top: { en: '{city}: the heaviest mortgage', uk: '{city}: найважча іпотека' },
    note: {
      en: 'Numbeo: the monthly payment of a 20-year loan for the full price as a share of the family’s net income; above 100% the payment exceeds the income.',
      uk: 'Numbeo: щомісячний платіж за 20-річним кредитом на всю ціну як частка чистого доходу сім’ї; понад 100% платіж більший за дохід.',
    },
  },
  rent: {
    name: { en: 'Price ÷ yearly rent, centre', uk: 'Ціна ÷ річна оренда, центр' },
    column: { en: 'Price ÷ rent, centre', uk: 'Ціна ÷ оренда, центр' },
    top: { en: '{city}: the most years of rent to buy in the centre', uk: '{city}: найбільше років оренди, щоб купити в центрі' },
    note: {
      en: 'Numbeo’s price-to-rent ratio in the centre: how many years of rent equal the price of the same flat (gross rental yield = 100 ÷ this number, in %).',
      uk: 'Співвідношення «ціна / оренда» Numbeo в центрі: скільки років оренди дорівнюють ціні такої самої квартири (валова дохідність оренди = 100 ÷ це число, у %).',
    },
  },
  rentOutside: {
    name: { en: 'Price ÷ yearly rent, outside', uk: 'Ціна ÷ річна оренда, поза центром' },
    column: { en: 'Price ÷ rent, outside', uk: 'Ціна ÷ оренда, поза центром' },
    top: { en: '{city}: the most years of rent to buy outside the centre', uk: '{city}: найбільше років оренди, щоб купити поза центром' },
    note: {
      en: 'Numbeo’s price-to-rent ratio outside the centre: how many years of rent equal the price of the same flat.',
      uk: 'Співвідношення «ціна / оренда» Numbeo поза центром: скільки років оренди дорівнюють ціні такої самої квартири.',
    },
  },
};

/** A value in its unit: '$30,964', '1.5×', '11.4 years', '7.9 m²', '211.1%'. `short` shortens years ('11.4 yr'). */
export function measureText(m: Measure, value: number, lang: Lang, display: 'long' | 'short' = 'long'): string {
  switch (m) {
    case 'centre':
    case 'outside':
      return formatUsdPrice(value, lang);
    case 'premium':
      return formatMultiple(value, lang);
    case 'm2':
      return formatSquareMetres(value, lang);
    case 'mortgage':
      return formatShare(value / 100, lang);
    default:
      return formatYears(value, lang, display);
  }
}

/** Axis tick text of a measure's scale. */
export function measureTick(m: Measure, value: number, lang: Lang): string {
  switch (m) {
    case 'centre':
    case 'outside':
      return formatUsdTick(value, lang);
    case 'premium':
      return `${formatNumber(value, lang)}×`;
    case 'mortgage':
      return formatPercentTick(value, lang);
    default:
      return formatNumber(value, lang);
  }
}

/** "Zug, Switzerland"; a city that shares its country's name (Hong Kong, Singapore) is named once. */
export function cityWithCountry(r: CityRow, lang: Lang): string {
  const country = countryName(r.code, lang);
  return country === r.name[lang] ? country : `${r.name[lang]}, ${country}`;
}
