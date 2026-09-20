import { defineViz } from '../../catalog/types';

// CHANGED (S2): published — the golden visualization and template for every later port (CATALOG §C #1).
// CHANGED (S3-gdp): 2024 and 2025 added (World Bank WDI, July 2026, via Worldometers) + GDP per capita sub-tab.
export default defineViz({
  id: 'gdp-by-country',
  title: { en: 'GDP by country, 2023–2025', uk: 'ВВП країн, 2023–2025' },
  subtitle: {
    en: 'Nominal GDP and GDP per capita in current US dollars: the ranking and how each economy compares with the world',
    uk: 'Номінальний ВВП і ВВП на душу населення в поточних доларах США: рейтинг і порівняння кожної економіки зі світом',
  },
  description: {
    en: 'Gross domestic product (GDP) is the market value of all final goods and services produced in a country in a year. Two views: total GDP ranks economies by size and shows each one’s share of world GDP (2023: 181 economies; 2024 and 2025: 218); GDP per capita divides it by the population and compares each economy with the population‑weighted world average (2024 and 2025).\n\nNominal GDP is converted at market exchange rates, so it measures economic weight, not living standards — for those, compare GDP per capita at purchasing power parity (PPP). A few values are not World Bank figures for the year shown — an IMF or UN estimate or the latest earlier year; they are marked * and explained in the tooltip and the table. 2023 comes from an earlier World Bank release, so compare years with care. “Economies” include territories reported separately, such as Hong Kong and Macao. Regions follow the UN M49 continents; the rank is always the global rank.\n\nChoose the indicator and the year, filter by region, page through the ranking or switch to the table; the link keeps your settings.',
    uk: 'Валовий внутрішній продукт (ВВП) — ринкова вартість усіх кінцевих товарів і послуг, вироблених у країні за рік. Два погляди: загальний ВВП ранжує економіки за розміром і показує частку кожної у світовому ВВП (2023: 181 економіка; 2024 і 2025: 218); ВВП на душу населення ділить його на кількість населення й порівнює кожну економіку зі світовим середнім, зваженим за населенням (2024 і 2025).\n\nНомінальний ВВП перераховано за ринковими курсами, тож він показує економічну вагу, а не рівень життя — для цього порівнюйте ВВП на душу населення за паритетом купівельної спроможності (ПКС). Кілька значень — не дані Світового банку за показаний рік, а оцінка МВФ чи ООН або останній доступний попередній рік; їх позначено * і пояснено в підказці та таблиці. 2023 рік — із попереднього випуску даних Світового банку, тож порівнюйте роки обережно. До «економік» належать і території, які рахують окремо, як-от Гонконг і Макао. Регіони — континенти за стандартом ООН M49; місце в рейтингу завжди глобальне.\n\nОберіть показник і рік, фільтруйте за регіоном, гортайте рейтинг або перемкніться на таблицю — посилання зберігає ваші налаштування.',
  },
  rubrics: ['economy'],
  chart: 'ranked-bar',
  geo: 'world',
  period: { from: 2023, to: 2025 },
  tags: ['gdp', 'gdp per capita', 'economy', 'countries', 'ranking', 'world bank', 'ввп', 'ввп на душу населення', 'економіка'],
  sources: [
    {
      title: 'World Bank — World Development Indicators (July 2026 update): GDP (current US$) NY.GDP.MKTP.CD and GDP per capita (current US$) NY.GDP.PCAP.CD, 2024–2025',
      url: 'https://data.worldbank.org/indicator/NY.GDP.PCAP.CD',
      retrieved: '2026-09-20',
    },
    {
      title: 'Worldometers — GDP by Country and GDP per Capita, World Bank source (tables the 2024–2025 files are prepared from; values marked * come from the IMF World Economic Outlook, April 2026, or the UN)',
      url: 'https://www.worldometers.info/gdp/gdp-by-country/',
      retrieved: '2026-09-20',
    },
    {
      title: 'World Bank — World Development Indicators (release of 16 Dec 2024): GDP (current US$), NY.GDP.MKTP.CD, 2023',
      url: 'https://data.worldbank.org/indicator/NY.GDP.MKTP.CD',
      // Date of the legacy snapshot the 2023 dataset is prepared from (data-raw/gdp-by-country/README.md).
      retrieved: '2025-09-08',
    },
  ],
  origin: { kind: 'original' },
  data: [
    'gdp-2023.json',
    'gdp-2024.json',
    'gdp-2025.json',
    'gdp-per-capita-2024.json',
    'gdp-per-capita-2025.json',
  ],
  status: 'published',
  added: '2026-09-17',
  updated: '2026-09-20',
  d3Modules: ['d3-selection', 'd3-scale', 'd3-axis', 'd3-transition', 'd3-interpolate', 'd3-array'],
});
