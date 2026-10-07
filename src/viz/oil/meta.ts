import { defineViz } from '../../catalog/types';

// CHANGED (S3-oil): new entry (CATALOG #32). Started from three Visual Capitalist charts (top 25 consumers, U.S. and
// China crude imports, all Energy Institute 2025 / data 2024 — verified 25/25, 11/11 and 17/17 rows), rebuilt on the
// primary sources with fresher data: EI Statistical Review 2026 (data 2025), EIA (2025 + Jan–Jul 2026) and China's
// customs via UN Comtrade (2024–2025), with countries named where the charts had "S. & Central America" or
// "Other Middle East". See data-raw/oil/README.md.
export default defineViz({
  id: 'oil',
  title: { en: 'Oil: who uses it and who sells it, 1965–2025', uk: 'Нафта: хто споживає і хто продає, 1965–2025' },
  subtitle: {
    en: '103 million barrels a day — the US and China burn over a third; where the two largest importers buy their crude',
    uk: '103 млн барелів на добу — США й Китай спалюють понад третину; де купують нафту два найбільші імпортери',
  },
  description: {
    en: 'Five angles on the world’s oil. A — consumption in 2025 for the 79 countries the Energy Institute lists one by one (94 % of the world), in barrels a day or per person; B — sixty years of demand as a bar chart race, 1965–2025; C — where U.S. crude imports come from, any year since 1973 and the first months of 2026; D — where China’s come from, as its customs record them; E — who buys crude from whom between world areas in 2025.\n\nConsumption and the trade table come from one edition, the Energy Institute Statistical Review of World Energy 2026: the EI revises its history in every edition (Ukraine’s 2024 consumption was 206 thousand barrels a day in the 2025 edition and 286 in 2026), so editions are never mixed. U.S. imports are the EIA’s series by country of origin; China’s are its General Administration of Customs’ figures as reported to UN Comtrade, in tonnes — converted to barrels with the EI’s average factor and marked ≈. Customs record oil from Iran and Venezuela that is relabelled at sea under the country it was transferred near (mostly Malaysia); the page says so instead of hiding it in an “other” bar.\n\nRegions follow the UN M49 continents. Per-person figures use the UN population from the gallery’s “Population by country” entry.',
    uk: 'П’ять поглядів на світову нафту. A — споживання у 2025 році для 79 країн, які Energy Institute наводить окремо (94 % світу), у барелях на добу або на людину; B — шістдесят років попиту як перегони стовпців, 1965–2025; C — звідки походить сира нафта, яку імпортують США, будь-який рік з 1973-го і перші місяці 2026-го; D — звідки походить нафта Китаю, як її записує митниця; E — хто в кого купує сиру нафту між регіонами світу у 2025 році.\n\nСпоживання й торговельна таблиця — з одного видання, Energy Institute Statistical Review of World Energy 2026: EI переглядає історію в кожному виданні (споживання України за 2024 рік у виданні 2025 року — 206 тис. барелів на добу, у 2026-му — 286), тож видання не змішуються. Імпорт США — ряд EIA за країною походження; імпорт Китаю — дані Головного митного управління Китаю в UN Comtrade, у тоннах, переведені в барелі за середнім коефіцієнтом EI й позначені ≈. Митниця записує іранську й венесуельську нафту, перевантажену в морі, як нафту країни, біля якої її перевантажили (здебільшого Малайзії); сторінка каже про це прямо, а не ховає в «інших».\n\nРегіони — за континентами ООН M49. Значення на людину — за даними ООН про населення із запису галереї «Населення країн».',
  },
  rubrics: ['economy', 'world'],
  chart: 'ranked-bar',
  geo: 'world',
  period: { from: 1965, to: 2025 },
  tags: [
    'oil',
    'crude oil',
    'energy',
    'consumption',
    'imports',
    'trade',
    'countries',
    'ranking',
    'china',
    'united states',
    'нафта',
    'енергетика',
    'споживання',
    'імпорт',
  ],
  sources: [
    {
      title: 'Energy Institute — Statistical Review of World Energy 2026 (75th edition): oil consumption 1965–2025 (narrow-format data file) and “Oil: inter-area movements 2025 – crude trade” (PDF, includes data from FGE NexantECA). Quoted with attribution as the Review permits.',
      url: 'https://www.energyinst.org/statistical-review/resources-and-data-downloads',
      retrieved: '2026-10-07',
    },
    {
      title: 'U.S. Energy Information Administration — U.S. Imports by Country of Origin, crude oil, thousand barrels per day, annual and monthly (release 30 Sep 2026; public domain)',
      url: 'https://www.eia.gov/dnav/pet/pet_move_impcus_a2_nus_epc0_im0_mbblpd_a.htm',
      retrieved: '2026-10-07',
    },
    {
      title: 'China General Administration of Customs, via UN Comtrade — imports of HS 2709 (crude petroleum) by partner, 2024 and 2025, net weight and CIF value',
      url: 'https://comtradeplus.un.org/',
      retrieved: '2026-10-07',
    },
    {
      title: 'Center on Global Energy Policy, Columbia University — “Where China gets its oil: crude imports in 2025…” (29 Jan 2026), on oil relabelled as Malaysian',
      url: 'https://www.energypolicy.columbia.edu/where-china-gets-its-oil-crude-imports-in-2025-reveal-stockpiling-and-changing-fortunes-of-certain-suppliers-including-those-sanctioned/',
      retrieved: '2026-10-07',
    },
    {
      title: 'Population for per-person figures — the gallery’s “Population by country” entry (UN World Population Prospects 2024)',
      url: 'https://population.un.org/wpp/',
      retrieved: '2026-09-24',
    },
  ],
  origin: { kind: 'original' },
  data: ['consumption.json', 'us-imports.json', 'china-imports.json', 'crude-trade-2025.json'],
  status: 'published',
  added: '2026-10-07',
  updated: '2026-10-07',
  d3Modules: ['d3-selection', 'd3-scale', 'd3-axis', 'd3-shape', 'd3-transition', 'd3-interpolate', 'd3-array', 'd3-ease'],
});
