import { defineViz } from '../../catalog/types';

// S3-rb: new entry (CATALOG §C #2), replacing the legacy `_examples/Contribution/Demographics/GDP (PPP) per capita
// 2023` page — data refreshed to one WDI vintage (July 2026) for 2023–2025; its typed "world share" column
// replaced by a derived "× world average" against the World Bank's own World aggregate (Q2).
export default defineViz({
  id: 'gdp-ppp-per-capita',
  title: { en: 'GDP (PPP) per capita, 2023–2025', uk: 'ВВП (ПКС) на душу населення, 2023–2025' },
  subtitle: {
    en: 'Output per person at purchasing-power parity — and how far each economy is from the world average',
    uk: 'Виробництво на одну особу за паритетом купівельної спроможності — і наскільки кожна економіка далека від світового середнього',
  },
  description: {
    en: 'GDP per capita at purchasing-power parity (PPP) converts each economy’s output per person into “international dollars” that buy the same basket of goods everywhere, so a dollar in Burundi and a dollar in Singapore are comparable. In 2025 Singapore reached about $163,000 per person — 6.4 times the world average of $25,700 and 131 times Burundi; 80 of 185 economies are above the average. Ukraine: $18,905, 0.74 × the world average.\n\n“× world average” divides each value by the World Bank’s own World aggregate for the same year. All three years come from one release of the World Development Indicators (July 2026), so the years are comparable; economies without a value for a year are left out rather than filled in (197 in 2023, 195 in 2024, 185 in 2025, of 217). Taiwan is not covered by World Bank data.\n\nRegions follow the UN M49 continents. Nominal GDP per capita (market exchange rates) is an angle of “GDP by country”.',
    uk: 'ВВП на душу населення за паритетом купівельної спроможності (ПКС) переводить виробництво на одну особу в «міжнародні долари», на які всюди можна купити однаковий кошик товарів, — тож долар у Бурунді й долар у Сінгапурі порівнянні. У 2025 році Сінгапур досяг близько $163 000 на особу — у 6,4 раза більше за світове середнє ($25 700) і в 131 раз більше, ніж Бурунді; 80 із 185 економік вищі за середнє. Україна: $18 905, 0,74 світового середнього.\n\n«× світового середнього» ділить кожне значення на агрегат «Світ» Світового банку за той самий рік. Усі три роки взято з одного випуску World Development Indicators (липень 2026), тож роки порівнянні; економіки без значення за рік не показано, а не заповнено (197 у 2023, 195 у 2024, 185 у 2025 з 217). Тайвань даними Світового банку не охоплено.\n\nРегіони — за континентами ООН M49. Номінальний ВВП на душу населення (за ринковим курсом) — один із поглядів запису «ВВП країн».',
  },
  rubrics: ['economy'],
  chart: 'ranked-bar',
  geo: 'world',
  period: { from: 2023, to: 2025 },
  tags: [
    'gdp',
    'ppp',
    'purchasing power parity',
    'gdp per capita',
    'income',
    'economy',
    'countries',
    'ranking',
    'ввп',
    'пкс',
    'економіка',
    'доходи',
  ],
  sources: [
    {
      title: 'World Bank — World Development Indicators: GDP per capita, PPP (current international $), NY.GDP.PCAP.PP.CD, WDI updated 2026-07-13 (CC BY 4.0)',
      url: 'https://data.worldbank.org/indicator/NY.GDP.PCAP.PP.CD',
      retrieved: '2026-09-24',
    },
  ],
  origin: { kind: 'original' },
  data: ['gdp-ppp-per-capita-2023.json', 'gdp-ppp-per-capita-2024.json', 'gdp-ppp-per-capita-2025.json'],
  status: 'published',
  added: '2026-09-24',
  updated: '2026-09-24',
  d3Modules: ['d3-selection', 'd3-scale', 'd3-axis', 'd3-transition', 'd3-interpolate', 'd3-array'],
});
