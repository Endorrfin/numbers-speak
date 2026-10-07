import { defineViz } from '../../catalog/types';

// CHANGED (S3-re): new entry (CATALOG §C #9), replacing the legacy `_examples/Contribution/real estate most expensive`
// page (top 15 cities, US$ per m², "2025", no source or date, page title "Robotization", Hong Kong under a Chinese
// flag). Its figures cannot be reproduced — Numbeo's city prices change continuously and its history is paid — so
// the entry is rebuilt from a fresh Numbeo snapshot: all cities, eight measures, six angles and a city picker
// (owner decisions 2026-09-25 and 2026-09-27).
const RETRIEVED = '2026-09-27'; // date of the owner's copy of the three Numbeo tables (data-raw/real-estate-world)

export default defineViz({
  id: 'real-estate-world',
  title: { en: 'Price per square metre in world cities, 2026', uk: 'Ціна квадратного метра в містах світу, 2026' },
  subtitle: {
    en: 'Numbeo, about 530 cities: price per m² in and outside the centre, years of income, mortgage and rent — six angles',
    uk: 'Numbeo, близько 530 міст: ціна м² у центрі й поза ним, роки доходу, іпотека й оренда — шість ракурсів',
  },
  description: {
    en: 'What housing costs in about 530 cities, from six angles: a ranking of eight measures (the price per m² in and outside the centre, the centre premium, years of income for a 90 m² home, the m² a year of income buys, the mortgage payment as a share of income, and the price-to-rent ratio in and outside the centre); price vs affordability (a log–log scatter split by the medians — a cheap square metre can still be out of reach); what a year of income buys and how heavy a mortgage is in every city; the centre vs the outskirts, with rent; a world map; and a side-by-side comparison. Search highlights up to five cities on every angle — the Ukrainian cities by default — and the link keeps the choice.\n\nThe figures are Numbeo’s: asking prices, rents and salaries reported by its users, not registered sales, so a city with few contributors can move a lot between snapshots. Numbeo’s formulas: a 90 m² home at the average of the centre and outside prices, a family income of 1.5 average net salaries, a 20-year mortgage for the full price.\n\nSnapshot of 27 September 2026, copied by hand under Numbeo’s terms for personal websites (automated collection is not allowed), with a link back. Ukrainian city names and coordinates: Wikidata; the land outline: Natural Earth. Regions follow the UN M49 continents; Hong Kong and Macao carry their own flags.\n\nIt replaces an older top-15 page for 2025 whose figures had no source or date and can no longer be reproduced.',
    uk: 'Скільки коштує житло приблизно в 530 містах, у шести ракурсах: рейтинг за вісьмома показниками (ціна м² у центрі й поза ним, націнка центру, роки доходу за житло 90 м², скільки м² купує рік доходу, платіж за іпотекою як частка доходу, співвідношення «ціна / оренда» в центрі й поза ним); ціна vs доступність (діаграма розсіювання в логарифмічних шкалах, поділена медіанами — дешевий квадратний метр ще не означає доступне житло); що купує рік доходу і наскільки важка іпотека в кожному місті; центр vs околиці разом з орендою; карта світу; порівняння міст поруч. Пошук виділяє до п’яти міст у кожному ракурсі — типово українські — а посилання зберігає вибір.\n\nЦифри — Numbeo: ціни пропозиції, оренда й зарплати, які повідомляють користувачі сайту, а не зареєстровані угоди, тож місто з кількома дописувачами може помітно змінюватися між знімками. Формули Numbeo: житло 90 м² за середньою ціною центру й околиць, дохід сім’ї — 1,5 середньої чистої зарплати, іпотека на 20 років на всю ціну.\n\nЗнімок від 27 вересня 2026 року, скопійований вручну за умовами Numbeo для особистих сайтів (автоматичний збір заборонено), з посиланням на джерело. Українські назви міст і координати — Wikidata; контури суходолу — Natural Earth. Регіони — за континентами ООН M49; Гонконг і Макао мають власні прапори.\n\nЗапис замінює давнішу сторінку «топ-15 за 2025 рік», цифри якої не мали ні джерела, ні дати й уже не відтворюються.',
  },
  rubrics: ['economy'],
  chart: 'ranked-bar',
  geo: 'world',
  period: { from: 2026, to: 2026 },
  tags: [
    'real estate',
    'housing',
    'property',
    'apartments',
    'prices',
    'cities',
    'affordability',
    'price to income',
    'numbeo',
    'ranking',
    'mortgage',
    'rent',
    'map',
    'нерухомість',
    'житло',
    'квартири',
    'ціни',
    'міста',
    'доступність',
    'іпотека',
    'оренда',
  ],
  sources: [
    {
      title: 'Numbeo — Price Rankings by City: Price per Square Meter to Buy Apartment in City Centre (US$, crowd-sourced; personal-website use with a link back)',
      url: 'https://www.numbeo.com/cost-of-living/city_price_rankings?displayCurrency=USD&itemId=100',
      retrieved: RETRIEVED,
    },
    {
      title: 'Numbeo — Price Rankings by City: Price per Square Meter to Buy Apartment Outside of Centre (US$)',
      url: 'https://www.numbeo.com/cost-of-living/city_price_rankings?displayCurrency=USD&itemId=101',
      retrieved: RETRIEVED,
    },
    {
      title: 'Numbeo — Current Property Prices Index by City (price to income ratio, mortgage as a percentage of income, price to rent ratio)',
      url: 'https://www.numbeo.com/property-investment/rankings_current.jsp',
      retrieved: RETRIEVED,
    },
    {
      title: 'Numbeo — About Property Value and Investment Indexes (formulas: 90 m² home, 1.5 net salaries, 20-year mortgage)',
      url: 'https://www.numbeo.com/property-investment/indicators_explained.jsp',
      retrieved: '2026-09-25',
    },
    {
      title: 'Wikidata — Ukrainian names and coordinates (P625) of cities (CC0), reviewed by the owner',
      url: 'https://www.wikidata.org/',
      retrieved: RETRIEVED,
    },
    {
      title: 'Natural Earth — 1:110m land (public domain), via world-atlas 2.0.2 (ISC)',
      url: 'https://github.com/topojson/world-atlas',
      retrieved: RETRIEVED,
    },
  ],
  origin: { kind: 'original' },
  data: ['numbeo-2026-09.json', 'land-110m.json'],
  // CHANGED (S3-re): published with the full rebuild (six angles, 2026-09-27).
  // CHANGED (S3-nav): "See also" — the author's picks, in this order.
  related: ['gdp-ppp-per-capita', 'crime-index', 'time-of-life'],
  status: 'published',
  added: '2026-09-25',
  updated: '2026-09-27',
  d3Modules: ['d3-selection', 'd3-scale', 'd3-axis', 'd3-transition', 'd3-interpolate', 'd3-array'],
});
