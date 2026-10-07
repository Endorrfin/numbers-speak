import { defineViz } from '../../catalog/types';

// CHANGED (S3-el): new entry (CATALOG #33, owner request). Seven angles on Ember's yearly electricity data (CC BY 4.0),
// the World Bank's access figures and Energoatom's 2021 report; Ukraine in focus with its last published year (2022)
// and the reason newer figures are not published. See data-raw/electricity/README.md.
export default defineViz({
  id: 'electricity',
  title: { en: 'Electricity: who generates it and from what, 2000–2025', uk: 'Електроенергія: хто виробляє і з чого, 2000–2025' },
  subtitle: {
    en: 'In 2025 renewables generated more of the world’s electricity than coal for the first time; Ukraine, 1990–2022, and the Zaporizhzhia plant',
    uk: 'У 2025 році відновлювані джерела вперше дали світові більше електроенергії, ніж вугілля; Україна, 1990–2022, і Запорізька АЕС',
  },
  description: {
    en: 'Seven angles on the world’s electricity. A — how much each country generated in 2024, or uses per person; B — from what: coal, gas and oil, nuclear, hydro and bioenergy, wind, solar; C — the world’s mix year by year since 2000; D — twenty-five years of solar and wind as a bar chart race; E — grams of CO2 per kilowatt-hour; F — who still lives without electricity; G — Ukraine from 1990 to 2022 and the Zaporizhzhia nuclear plant before the occupation.\n\nGeneration, demand and emissions come from one source, Ember’s Yearly Electricity Data, which compiles national statistics, Eurostat, the EIA, the Energy Institute and the UN. Rankings use 2024, the last year Ember has for almost every country (its 2025 figures cover 91 so far); world totals run to 2025. Ukraine has not published its generation since 24 February 2022 — the page says why — so wherever it is ranked its figure is from 2022 and marked. Access to electricity is the World Bank’s; the Zaporizhzhia figures are Energoatom’s own report for 2021.',
    uk: 'Сім поглядів на електроенергію світу. A — скільки виробила кожна країна у 2024 році або скільки споживає одна людина; B — з чого: вугілля, газ і нафта, атом, ГЕС і біоенергія, вітер, сонце; C — структура світового виробництва рік за роком з 2000-го; D — двадцять п’ять років сонячної й вітрової енергетики як перегони стовпців; E — грамів CO2 на кіловат-годину; F — хто досі живе без електрики; G — Україна з 1990 по 2022 рік і Запорізька АЕС до окупації.\n\nВиробництво, попит і викиди — з одного джерела, Yearly Electricity Data від Ember, яке зводить національну статистику, Євростат, EIA, Energy Institute й ООН. Рейтинги — за 2024 рік, останній, який Ember має майже для всіх країн (дані за 2025 рік поки охоплюють 91 країну); світові підсумки — до 2025 року. Україна не публікує даних про виробництво з 24 лютого 2022 року — сторінка пояснює чому, — тож усюди, де вона в рейтингу, її значення за 2022 рік і позначене. Доступ до електрики — дані Світового банку; дані Запорізької АЕС — власний звіт Енергоатома за 2021 рік.',
  },
  rubrics: ['world', 'economy', 'ukraine'],
  chart: 'ranked-bar',
  geo: 'world',
  period: { from: 1990, to: 2025 },
  tags: [
    'electricity',
    'energy',
    'power',
    'renewables',
    'solar',
    'wind',
    'nuclear',
    'coal',
    'co2',
    'emissions',
    'zaporizhzhia',
    'countries',
    'ranking',
    'електроенергія',
    'енергетика',
    'відновлювані',
    'атом',
    'аес',
  ],
  sources: [
    {
      title: 'Ember — Yearly Electricity Data and Yearly Electricity Data Europe (CC BY 4.0): generation by source, demand, demand per person, CO2 intensity, net imports',
      url: 'https://ember-energy.org/data/yearly-electricity-data/',
      retrieved: '2026-10-07',
    },
    {
      title: 'World Bank — World Development Indicators: Access to electricity, % of population (EG.ELC.ACCS.ZS, from the Tracking SDG 7 report) and Population, total (SP.POP.TOTL); CC BY 4.0, updated 13 Jul 2026',
      url: 'https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS',
      retrieved: '2026-10-07',
    },
    {
      title: 'НАЕК «Енергоатом» — Звіт про управління 2021 (generation per nuclear plant, pp. 48–49; installed capacity, pp. 5, 14, 115)',
      url: 'https://old.energoatom.com.ua/parts/pdf-file/managezvit2021.pdf',
      retrieved: '2026-10-07',
    },
    {
      title: 'Держстат — notice of 5 Dec 2024: the energy balance of Ukraine for 2022–2023 postponed under the martial-law law on reporting',
      url: 'https://www.ukrstat.gov.ua/Noviny/kalendarx/2024/12/05_2024.htm',
      retrieved: '2026-10-07',
    },
  ],
  origin: { kind: 'original' },
  data: ['countries.json', 'world.json', 'race.json', 'ukraine.json', 'access.json'],
  status: 'published',
  added: '2026-10-07',
  updated: '2026-10-07',
  d3Modules: ['d3-selection', 'd3-scale', 'd3-axis', 'd3-shape', 'd3-transition', 'd3-interpolate', 'd3-array', 'd3-ease'],
});
