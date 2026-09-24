import { defineViz } from '../../catalog/types';

// CHANGED (session 2026-09-22): new entry, replacing the legacy `_examples/Contribution/Demographics/land
// area` page (CATALOG #3). Two metrics (total area, land area) instead of the legacy CSV's single, mistyped
// "tatal area" column; see data-raw/land-area/README.md for the border and data-quality decisions.
export default defineViz({
  id: 'land-area',
  title: { en: 'Land area by country', uk: 'Площа країн світу' },
  subtitle: {
    en: 'Total area and land area of 234 countries and territories, and how much of each is not land',
    uk: 'Загальна площа й площа суходолу 234 країн і територій — і яка їх частка не є суходолом',
  },
  // CHANGED (S3-cl): UA typo fixed — «щит» was typed with a Latin "it".
  description: {
    en: 'Two figures per country: total area (land plus inland water bodies) and land area, which excludes them — and, for Greenland, excludes its permanent ice sheet as well. Switching the metric changes which one ranks and sizes the bars; "By non-land share" sorts by how much of a country is water or ice instead of by size.\n\nArea reflects internationally recognized borders, not necessarily the territory a state actually controls: Ukraine’s figure includes Crimea and the territories Russia has occupied since 2022, both internationally recognized as part of Ukraine; Russia’s figure does not include them (marked *). A handful of countries report a land area larger than their total area in the source — likely two different territorial definitions rather than an error in transcription; they are kept and marked (*), not corrected.\n\nRegions follow the UN M49 continents. World totals are the sum of the 234 listed countries and territories, not an independently verified figure for the whole Earth.',
    uk: 'Для кожної країни — два показники: загальна площа (суходіл плюс внутрішні водойми) і площа суходолу, яка їх не враховує, а для Гренландії ще й не враховує її постійний льодовий щит. Перемикання показника змінює, за яким рейтингують і малюють стовпці; сортування «За часткою не-суходолу» впорядковує за тим, яку частку країни займають вода чи лід, а не за розміром.\n\nПлоща подана за міжнародно визнаними кордонами, а не обов’язково за територією, яку держава фактично контролює: показник України включає Крим і території, окуповані Росією з 2022 року, — обидва й далі міжнародно визнані частиною України; у показник Росії вони не входять (позначено *). Кілька країн у джерелі мають площу суходолу, більшу за загальну площу, — ймовірно, це два різні визначення території, а не помилка перенесення; їх залишено як є й позначено (*), а не виправлено.\n\nРегіони — за континентами ООН M49. Світові підсумки — сума 234 перелічених країн і територій, а не незалежно перевірене значення для всієї Землі.',
  },
  rubrics: ['world'],
  chart: 'ranked-bar',
  geo: 'world',
  tags: [
    'land area',
    'total area',
    'geography',
    'countries',
    'territories',
    'ranking',
    'world',
    'borders',
    'площа',
    'територія',
    'країни',
    'кордони',
  ],
  sources: [
    {
      title: 'Worldometers — Largest Countries in the World (by area): total area and land area, 234 countries and territories',
      url: 'https://www.worldometers.info/geography/largest-countries-in-the-world/',
      retrieved: '2026-09-19',
    },
    {
      title: 'Wikipedia — List of countries and dependencies by area (used to verify how Ukraine’s and Russia’s figures treat Crimea and the Russian-occupied territories)',
      url: 'https://en.wikipedia.org/wiki/List_of_countries_and_dependencies_by_area',
      retrieved: '2026-09-22',
    },
  ],
  origin: { kind: 'original' },
  data: ['land-area.json'],
  // CHANGED (session 2026-09-22): draft → published — `draft` is dev-only (src/catalog/filter.ts
  // isVisible), so the production-mode smoke pass rendered NotFound instead of the page and failed all
  // 6 land-area checks. The entry meets the Definition of Done (PROJECT-BRIEF.md §9): bilingual, ≥1
  // dated source, dataset schema-validated, 29 unit tests green — same "not independently verified
  // secondary source" caveat gdp-by-country and global-brands-race already carry as published.
  status: 'published',
  added: '2026-09-22',
  updated: '2026-09-22',
  d3Modules: ['d3-selection', 'd3-scale', 'd3-axis', 'd3-transition', 'd3-interpolate', 'd3-array'],
});
