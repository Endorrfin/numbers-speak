import { defineViz } from '../../catalog/types';

// CHANGED (S3-br): published — CATALOG #15, merges the three legacy brand races (D5) into one 2000–2025 entry.
export default defineViz({
  id: 'global-brands-race',
  title: { en: 'Global brands race, 2000–2025', uk: 'Перегони глобальних брендів, 2000–2025' },
  subtitle: {
    en: 'The world’s most valuable brands year by year, from Interbrand’s Best Global Brands ranking',
    uk: 'Найдорожчі бренди світу рік за роком — за рейтингом Interbrand Best Global Brands',
  },
  description: {
    en: 'Every year since 2000 the consultancy Interbrand values the world’s leading brands — the part of a company’s worth that comes from its name, not from its factories or cash — and publishes the 100 most valuable (75 in 2000). The race replays 26 rankings: in 2000 Coca-Cola, Microsoft and IBM led; by 2025 Apple, Microsoft, Amazon and Google alone hold 42 % of the value of all 100.\n\nPress Play or drag the year slider. Colour marks one of six sector groups; the tooltip and the table name Interbrand’s own sector, the brand’s home country and its global rank. Select a group to race only its brands — the labels then count positions within the group, while the table keeps the global rank. The strip under the race shows how the ranking’s total value splits between the groups in the selected year.\n\nValues are Interbrand estimates in nominal US dollars (not adjusted for inflation); 2020–2025 are shown as published, rounded to US$ 0.1 billion. Between two rankings the bars move in a straight line — the frames in between are interpolated, not measured. The link keeps the year, the group and the view.',
    uk: 'Щороку з 2000-го консалтингова компанія Interbrand оцінює провідні бренди світу — ту частину вартості компанії, яку дає її ім’я, а не заводи чи гроші на рахунках, — і публікує 100 найдорожчих (у 2000 році — 75). Перегони відтворюють 26 рейтингів: у 2000 році лідирували Coca-Cola, Microsoft та IBM, а у 2025-му лише Apple, Microsoft, Amazon і Google мають 42 % вартості всієї сотні.\n\nНатисніть «Відтворити» або перетягніть повзунок року. Колір позначає одну з шести груп секторів; підказка й таблиця називають сектор за Interbrand, країну походження бренду та його глобальне місце. Виберіть групу, щоб змагалися лише її бренди, — тоді підписи рахують місця всередині групи, а таблиця зберігає глобальне місце. Смуга під перегонами показує, як загальна вартість рейтингу ділиться між групами у вибраному році.\n\nЗначення — оцінки Interbrand у номінальних доларах США (без поправки на інфляцію); 2020–2025 роки подано як опубліковано, з округленням до 0,1 млрд дол. Між двома рейтингами стовпці рухаються рівномірно — проміжні кадри інтерпольовано, а не виміряно. Посилання зберігає рік, групу й вигляд.',
  },
  rubrics: ['economy'],
  chart: 'bar-race',
  geo: 'world',
  period: { from: 2000, to: 2025 },
  tags: ['brands', 'brand value', 'interbrand', 'companies', 'ranking', 'technology', 'бренди', 'вартість бренду', 'компанії'],
  sources: [
    {
      title: 'Interbrand — Best Global Brands 2025 and the 2020–2024 reports (rankings 2020–2025, brand value in US$ bn)',
      url: 'https://interbrand.com/best-global-brands/global/',
      retrieved: '2026-09-21',
    },
    {
      title: 'Interbrand — Best Global Brands rankings 2000–2019 (US$ m), as compiled for the D3 gallery “Bar chart race” dataset',
      url: 'https://observablehq.com/@d3/bar-chart-race',
      retrieved: '2025-07-11',
    },
  ],
  origin: {
    kind: 'adapted',
    title: 'Bar chart race — Mike Bostock, D3 gallery (Observable)',
    url: 'https://observablehq.com/@d3/bar-chart-race',
    license: 'ISC',
  },
  data: ['brands-2000-2025.json'],
  status: 'published',
  added: '2026-09-21',
  updated: '2026-09-21',
  d3Modules: ['d3-selection', 'd3-scale', 'd3-axis', 'd3-transition', 'd3-interpolate', 'd3-ease', 'd3-array'],
});
