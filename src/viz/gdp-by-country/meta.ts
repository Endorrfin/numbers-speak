import { defineViz } from '../../catalog/types';

// CHANGED (S2): published — the golden visualization and template for every later port (CATALOG §C #1).
export default defineViz({
  id: 'gdp-by-country',
  title: { en: 'GDP by country, 2023', uk: 'ВВП країн, 2023' },
  subtitle: {
    en: 'Nominal GDP in current US dollars, ranked, with each country’s share of the world total',
    uk: 'Номінальний ВВП у поточних доларах США: рейтинг і частка кожної країни у світовому ВВП',
  },
  description: {
    en: 'Gross domestic product (GDP) is the market value of all final goods and services produced in a country in a year. The chart ranks 181 economies by nominal GDP in current US dollars and shows each one’s share of world GDP ($106.2 trillion in 2023).\n\nNominal GDP is converted at market exchange rates, so it measures economic weight in the world economy, not living standards — for those, compare GDP per capita at purchasing power parity (PPP). “Economies” include territories the World Bank reports separately, such as Hong Kong and Macao. Regions follow the UN M49 continents; the rank is always the global rank.\n\nFilter by region, page through the ranking or switch to the table; the link keeps your settings.',
    uk: 'Валовий внутрішній продукт (ВВП) — ринкова вартість усіх кінцевих товарів і послуг, вироблених у країні за рік. Графік ранжує 181 економіку за номінальним ВВП у поточних доларах США й показує частку кожної у світовому ВВП (106,2 трлн $ у 2023 році).\n\nНомінальний ВВП перераховано за ринковими курсами, тож він показує економічну вагу країни у світовій економіці, а не рівень життя — для цього порівнюйте ВВП на душу населення за паритетом купівельної спроможності (ПКС). До «економік» належать і території, які Світовий банк рахує окремо, як-от Гонконг і Макао. Регіони — континенти за стандартом ООН M49; місце в рейтингу завжди глобальне.\n\nФільтруйте за регіоном, гортайте рейтинг або перемкніться на таблицю — посилання зберігає ваші налаштування.',
  },
  rubrics: ['economy'],
  chart: 'ranked-bar',
  geo: 'world',
  period: { from: 2023, to: 2023 },
  tags: ['gdp', 'economy', 'countries', 'ranking', 'world bank', 'ввп', 'економіка'],
  sources: [
    {
      title: 'World Bank — World Development Indicators (release of 16 Dec 2024): GDP (current US$), NY.GDP.MKTP.CD',
      url: 'https://data.worldbank.org/indicator/NY.GDP.MKTP.CD',
      // Date of the legacy snapshot the dataset is prepared from (data-raw/gdp-by-country/README.md).
      retrieved: '2025-09-08',
    },
  ],
  origin: { kind: 'original' },
  data: ['gdp-2023.json'],
  status: 'published',
  added: '2026-09-17',
  updated: '2026-09-18',
  d3Modules: ['d3-selection', 'd3-scale', 'd3-axis', 'd3-transition', 'd3-interpolate', 'd3-array'],
});
