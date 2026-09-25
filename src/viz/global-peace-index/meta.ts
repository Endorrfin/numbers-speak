import { defineViz } from '../../catalog/types';

// S3-rb: new entry (CATALOG §C #7), replacing the legacy `_examples/Contribution/Demographics/GPI-162` page
// ("Safest Countries in the World 2024", page title "Crime Index…", data unsourced) with the Institute for
// Economics & Peace's GPI 2026 report, read from its PDF (owner decision: build without writing to IEP).
export default defineViz({
  id: 'global-peace-index',
  title: { en: 'Global Peace Index 2026', uk: 'Глобальний індекс миру 2026' },
  subtitle: {
    en: '163 countries ranked by peacefulness: Iceland first for the 19th year, Russia last, Ukraine 160th',
    uk: '163 країни за рівнем миру: Ісландія — перша 19-й рік поспіль, Росія — остання, Україна — 160-та',
  },
  description: {
    en: 'The Global Peace Index of the Institute for Economics & Peace (IEP) ranks 163 independent states and territories — 99.7 per cent of the world’s population — on 23 qualitative and quantitative indicators in three domains: Societal Safety and Security, Ongoing Domestic and International Conflict, and Militarisation. Each indicator is scored from 1 to 5 and the weighted overall score is on the same scale: the lower the score, the more peaceful the country.\n\nThe 2026 edition, the 20th, finds the world less peaceful for the 12th year in a row: 99 countries deteriorated and 62 improved. Iceland is the most peaceful country for the 19th consecutive year; Russia is the least peaceful, with Sudan, the Democratic Republic of the Congo, Ukraine and Israel completing the bottom five. Ukraine is also among the five largest improvers by score, after Poland, Gabon and Lesotho. Most indicators run to December 2025, so the full impact of the Iran war is not captured yet.\n\nRanks, scores and changes are as printed in the report (June 2026): the ranking table (tied countries share a rank, shown “=70”), cross-checked against its regional tables, which give the score change. Changes compare with the prior year as recalculated in the 2026 report. Regions follow the UN M49 continents, not IEP’s nine regions. Source: Institute for Economics & Peace, Global Peace Index 2026, used for educational, non-commercial purposes with acknowledgement of IEP.',
    uk: 'Глобальний індекс миру Інституту економіки та миру (IEP) ранжує 163 незалежні держави й території — 99,7 % населення світу — за 23 якісними й кількісними показниками у трьох сферах: безпека в суспільстві, поточні внутрішні й міжнародні конфлікти та мілітаризація. Кожен показник оцінюють від 1 до 5, і зважений загальний бал має ту саму шкалу: що нижчий бал, то мирніша країна.\n\nДвадцятий випуск, 2026 року, фіксує, що світ став менш мирним 12-й рік поспіль: 99 країн погіршили стан, 62 — покращили. Ісландія — наймирніша країна 19-й рік поспіль; Росія — найменш мирна, а п’ятірку останніх доповнюють Судан, Демократична Республіка Конго, Україна та Ізраїль. Водночас Україна — серед п’яти країн із найбільшим покращенням балу, після Польщі, Габону й Лесото. Більшість показників — до грудня 2025 року, тож повний вплив війни з Іраном індекс ще не враховує.\n\nМісця, бали й зміни — як надруковано у звіті (червень 2026): таблиця рейтингу (країни з однаковим балом ділять місце, позначено «=70»), звірена з регіональними таблицями звіту, де подано зміну балу. Зміни — порівняно з попереднім роком у перерахунку звіту 2026 року. Регіони — за континентами ООН M49, а не за дев’ятьма регіонами IEP. Джерело: Institute for Economics & Peace, Global Peace Index 2026; використано в освітніх, некомерційних цілях із зазначенням IEP.',
  },
  rubrics: ['security'],
  chart: 'ranked-bar',
  geo: 'world',
  period: { from: 2026, to: 2026 },
  tags: ['peace', 'conflict', 'security', 'militarisation', 'safety', 'ranking', 'iep', 'gpi', 'мир', 'конфлікти', 'безпека', 'рейтинг'],
  sources: [
    {
      title: 'Institute for Economics & Peace — Global Peace Index 2026: Identifying and measuring the factors that drive peace (Sydney, June 2026), ranking table (pp. 10–11) and regional tables',
      url: 'https://www.visionofhumanity.org/wp-content/uploads/2026/06/Global-Peace-Index-2026-Report.pdf',
      retrieved: '2026-09-24',
    },
    {
      title: 'Vision of Humanity (IEP) — Resources: Global Peace Index reports',
      url: 'https://www.visionofhumanity.org/resources/',
      retrieved: '2026-09-25',
    },
  ],
  origin: { kind: 'original' },
  data: ['gpi-2026.json'],
  status: 'published',
  added: '2026-09-25',
  updated: '2026-09-25',
  d3Modules: ['d3-selection', 'd3-scale', 'd3-axis', 'd3-transition', 'd3-interpolate', 'd3-array'],
});
