import { defineViz } from '../../catalog/types';

// S1: announced as `soon` — the chart, cleaned data and settings arrive in S2 (golden visualization).
export default defineViz({
  id: 'gdp-by-country',
  title: { en: 'GDP by country, 2023', uk: 'ВВП країн, 2023' },
  subtitle: {
    en: 'Nominal GDP in current US dollars, ranked, with each country’s share of the world total',
    uk: 'Номінальний ВВП у поточних доларах США: рейтинг і частка кожної країни у світовому ВВП',
  },
  description: {
    en: 'Gross domestic product (GDP) is the market value of all final goods and services produced in a country in a year. The chart ranks economies by nominal GDP and shows each country’s share of the world total.\n\nFilter by region and page through the ranking; the link keeps your settings.',
    uk: 'Валовий внутрішній продукт (ВВП) — ринкова вартість усіх кінцевих товарів і послуг, вироблених у країні за рік. Графік ранжує економіки за номінальним ВВП і показує частку кожної країни у світовому ВВП.\n\nФільтруйте за регіоном і гортайте рейтинг — посилання зберігає ваші налаштування.',
  },
  rubrics: ['economy'],
  chart: 'ranked-bar',
  geo: 'world',
  period: { from: 2023, to: 2023 },
  tags: ['gdp', 'economy', 'countries', 'ranking', 'world bank', 'ввп', 'економіка'],
  sources: [
    {
      title: 'World Bank — World Development Indicators: GDP (current US$)',
      url: 'https://data.worldbank.org/indicator/NY.GDP.MKTP.CD',
      // Date of the legacy CSV snapshot (_examples/…/GDP by country). S2 re-downloads and updates it.
      retrieved: '2025-09-08',
    },
  ],
  origin: { kind: 'original' },
  data: [],
  status: 'soon',
  added: '2026-09-17',
  updated: '2026-09-17',
});
