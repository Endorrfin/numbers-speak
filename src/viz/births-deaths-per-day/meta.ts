import { defineViz } from '../../catalog/types';

// CHANGED (S3-bdd): new priority entry — replaces the planned births-only #5 `births-per-day` (CATALOG §C #5).
export default defineViz({
  id: 'births-deaths-per-day',
  title: { en: 'Born and died per day, 2026', uk: 'Народжуються й помирають щодня, 2026' },
  subtitle: {
    en: 'Births and deaths per day in 235 countries — a live world clock and every country',
    uk: 'Народження і смерті за добу у 235 країнах — живий світовий лічильник і всі країни поруч',
  },
  description: {
    en: 'Every day in 2026 about 362,700 babies are born in the world and about 174,200 people die — roughly four births and two deaths every second. The world still grows by about 188,500 people a day, but not everywhere: in 47 of 235 countries and territories more people die than are born. Ukraine is one of the sharpest cases, with about 2.2 deaths for every birth.\n\nThe clock at the top counts from the moment you open the page. Below, each country is a pair of bars on one scale: births to the left, deaths to the right; rows where deaths outnumber births are tinted. Countries are ranked by births per day; filter by region, page through the list or switch to the table, which also gives natural change and deaths per birth.\n\nThe figures are UN World Population Prospects 2024 estimates for 2026 (annual totals divided by 365), as published by World Population Review — models, not registrations. They count each country within its internationally recognised borders, so for Ukraine they differ from registered data (see “Births and deaths in Ukraine, 1990–2025”).',
    uk: 'Щодня у 2026 році у світі народжується близько 362 700 дітей і помирає близько 174 200 людей — приблизно чотири народження і дві смерті щосекунди. Світ досі зростає приблизно на 188 500 людей на добу, але не всюди: у 47 з 235 країн і територій помирає більше людей, ніж народжується. Україна — один із найгостріших випадків: близько 2,2 смерті на кожне народження.\n\nЛічильник угорі рахує від моменту, коли ви відкрили сторінку. Нижче кожна країна — пара стовпців на одній шкалі: народження ліворуч, смерті праворуч; рядки, де смертей більше, ніж народжень, тоновано. Країни впорядковано за кількістю народжень на добу; фільтруйте за регіоном, гортайте список або перемкніться на таблицю, де є ще природний приріст і кількість смертей на одне народження.\n\nЦифри — оцінки ООН (World Population Prospects 2024) на 2026 рік (річні значення, поділені на 365) у публікації World Population Review — це моделі, а не реєстрація. Вони враховують кожну країну в міжнародно визнаних кордонах, тож для України відрізняються від зареєстрованих даних (див. «Народжуваність і смертність в Україні, 1990–2025»).',
  },
  rubrics: ['world', 'ukraine'],
  chart: 'ranked-bar',
  geo: 'world',
  period: { from: 2026, to: 2026 },
  tags: [
    'demography',
    'births',
    'deaths',
    'natural change',
    'population',
    'countries',
    'per day',
    'демографія',
    'народжуваність',
    'смертність',
  ],
  sources: [
    {
      title: 'World Population Review — Births per day by country, 2026 (from UN World Population Prospects 2024)',
      url: 'https://worldpopulationreview.com/countries/births-per-day',
      retrieved: '2026-09-19',
    },
    {
      title: 'World Population Review — Deaths per day by country, 2026 (from UN World Population Prospects 2024)',
      url: 'https://worldpopulationreview.com/countries/deaths-per-day',
      retrieved: '2026-09-19',
    },
    {
      title: 'United Nations, DESA, Population Division — World Population Prospects 2024',
      url: 'https://population.un.org/wpp/',
      retrieved: '2026-09-19',
    },
  ],
  origin: { kind: 'original' },
  data: ['per-day-2026.json'],
  status: 'published',
  added: '2026-09-19',
  updated: '2026-09-19',
  d3Modules: ['d3-selection', 'd3-scale', 'd3-axis', 'd3-transition', 'd3-interpolate', 'd3-array'],
});
