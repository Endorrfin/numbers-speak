import { defineViz } from '../../catalog/types';

// S3-rb: new entry (CATALOG §C #4), replacing the legacy `_examples/Contribution/Demographics/Population
// density` page — which, despite its title, only held population (Q3). Population comes from UN WPP 2024;
// density is derived on the page from the `land-area` entry (see data.ts and data-raw/population-by-country/README.md).
export default defineViz({
  id: 'population-by-country',
  title: { en: 'Population by country, 2025', uk: 'Населення країн, 2025' },
  subtitle: {
    en: '8.23 billion people in 237 countries and territories — and how densely each one is settled',
    uk: '8,23 млрд людей у 237 країнах і територіях — і наскільки щільно заселена кожна',
  },
  description: {
    en: 'UN estimates of the population of every country and territory on 1 July 2025: India and China together hold more than a third of humanity, and the ten largest countries 57 %. A second metric, density, divides each population by its land area — the World Bank definition (people per km² of land, inland water excluded) — taken from the gallery’s “Land area by country” entry, so the two pages always agree.\n\nThe figures are the medium-variant projection of World Population Prospects 2024, the UN’s latest revision; they are modelled estimates, not census counts. Countries are counted within internationally recognized borders: the UN includes Crimea in Ukraine’s 38.98 million, not in Russia’s figure (both marked *). For Ukraine the estimate is not a count of the people living on government-controlled territory today. Density is marked approximate where the land area is tiny and rounded to whole km², and left blank for Guernsey, Jersey and Kosovo, which have no land-area row.\n\nRegions follow the UN M49 continents.',
    uk: 'Оцінки ООН чисельності населення кожної країни й території на 1 липня 2025 року: Індія й Китай разом — понад третина людства, десять найбільших країн — 57 %. Другий показник, щільність, ділить населення на площу суходолу — за визначенням Світового банку (осіб на км² суходолу, без внутрішніх вод), — узяту із запису галереї «Площа країн світу», тож обидві сторінки завжди узгоджені.\n\nЦе прогноз середнього варіанта World Population Prospects 2024 — останнього перегляду ООН; це модельні оцінки, а не дані переписів. Країни враховано в міжнародно визнаних кордонах: ООН включає Крим до 38,98 млн України, а не до показника Росії (обидва позначено *). Для України ця оцінка — не підрахунок людей, які сьогодні живуть на підконтрольній уряду території. Щільність позначено як приблизну там, де площа крихітна й округлена до цілих км², і не показано для Гернсі, Джерсі й Косова, яких немає в даних про площу.\n\nРегіони — за континентами ООН M49.',
  },
  rubrics: ['world'],
  chart: 'ranked-bar',
  geo: 'world',
  period: { from: 2025, to: 2025 },
  tags: [
    'population',
    'population density',
    'demographics',
    'countries',
    'ranking',
    'world',
    'united nations',
    'населення',
    'щільність населення',
    'демографія',
    'країни',
  ],
  sources: [
    {
      title: 'United Nations, DESA, Population Division — World Population Prospects 2024: GEN/01/REV1 Demographic indicators (compact), medium variant, total population on 1 July 2025 (CC BY 3.0 IGO)',
      url: 'https://population.un.org/wpp/downloads?folder=Standard%20Projections&group=Most%20used',
      retrieved: '2026-09-24',
    },
    {
      title: 'Land area for density — the gallery’s “Land area by country” entry (Worldometers, retrieved 2026-09-19)',
      url: 'https://www.worldometers.info/geography/largest-countries-in-the-world/',
      retrieved: '2026-09-19',
    },
    {
      title: 'World Bank — Population density (EN.POP.DNST): definition, people per km² of land area',
      url: 'https://data.worldbank.org/indicator/EN.POP.DNST',
      retrieved: '2026-09-24',
    },
  ],
  origin: { kind: 'original' },
  data: ['population-2025.json'],
  status: 'published',
  added: '2026-09-24',
  updated: '2026-09-24',
  d3Modules: ['d3-selection', 'd3-scale', 'd3-axis', 'd3-transition', 'd3-interpolate', 'd3-array'],
});
