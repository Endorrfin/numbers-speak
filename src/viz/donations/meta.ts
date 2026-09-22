import { defineViz } from '../../catalog/types';

// CHANGED (S3-cd): CATALOG #12 `donations` — published. Re-scoped from the person-count series (stops
// Nov 2024, can't extend — see README) to monobank monthly UAH totals (owner-supplied export, through
// Nov 2025) plus major-fund and Nova Poshta logistics angles from the owner's newly added files.
export default defineViz({
  id: 'donations',
  title: { en: 'Wartime donations, 2022–2025', uk: 'Пожертви воєнного часу, 2022–2025' },
  subtitle: {
    en: 'UAH 112.7 billion through monobank alone, February 2022 – November 2025',
    uk: '112,7 млрд грн лише через monobank, лютий 2022 — листопад 2025',
  },
  description: {
    en: 'Ukraine’s monobank donation jars raised UAH 112.7 billion between February 2022 and November 2025 — a river of small transfers that never really stopped, even as the pace has cooled. Monthly totals grew steadily through 2023, peaked at UAH 4.71 billion in December 2023, held around UAH 3.6 billion a month through 2024, and have averaged about UAH 2.95 billion a month in 2025 — a real decline from the 2024 peak, though donations keep flowing well above the 2022–2023 baseline.\n\nThree of the largest dedicated funds — United24, Come Back Alive and the Serhiy Prytula Foundation — collected a combined UAH 105.9 billion in the first eleven months of 2025 alone (United24 accounts for UAH 77.7 billion of that), more than their combined 2022–2024 total. Nova Poshta’s humanitarian shipments grew from 247,727 parcels (21,354 t) in 2022 to 1.9 million parcels (63,920 t) in 2024 — nearly an eightfold rise in three years. An earlier metric on this page, the average number of people donating monthly, is discontinued after November 2024 (2,029,928 people that month) and isn’t extendable to 2025; it’s kept below only as context, not as the primary series.',
    uk: 'Гаманці monobank для збору коштів зібрали 112,7 млрд грн з лютого 2022-го по листопад 2025-го — потік дрібних переказів, який ніколи по-справжньому не зупинявся, хоч темп і охолов. Місячні суми стабільно зростали протягом 2023-го, досягли піку 4,71 млрд грн у грудні 2023-го, трималися на рівні близько 3,6 млрд грн на місяць протягом 2024-го, а у 2025-му в середньому становлять близько 2,95 млрд грн на місяць — це реальне зниження від піку 2024-го, хоча збори й далі суттєво перевищують рівень 2022–2023 років.\n\nТри з найбільших профільних фондів — United24, «Повернись живим» і Фонд Сергія Притули — за перші одинадцять місяців 2025-го зібрали разом 105,9 млрд грн (77,7 млрд грн із них — на United24), більше за їхню сукупну суму за 2022–2024 роки. Гуманітарні відправлення «Нової пошти» зросли з 247 727 посилок (21 354 т) у 2022-му до 1,9 млн посилок (63 920 т) у 2024-му — майже у вісім разів за три роки. Попередній показник цієї сторінки — середня кількість людей, що донатять щомісяця, — припинено оновлювати після листопада 2024-го (2 029 928 осіб того місяця), і продовжити його до 2025-го нема звідки; нижче він наведений лише як контекст, а не як основний ряд.',
  },
  rubrics: ['ukraine'],
  chart: 'line',
  geo: 'ukraine',
  period: { from: 2022, to: 2025 },
  tags: ['donations', 'monobank', 'united24', 'funds', 'war', 'contribution', 'донати', 'пожертви', 'війна'],
  sources: [
    {
      title: 'Opendatabot — «Скільки українці задонатили через monobank» (methodology) + owner export to Nov 2025',
      url: 'https://opendatabot.ua/analytics/donats-2025',
      retrieved: '2026-09-22',
    },
    {
      title: 'Opendatabot — major funds & Nova Poshta humanitarian logistics (owner export)',
      url: 'https://opendatabot.ua/analytics/donates-in-war-2024',
      retrieved: '2026-09-22',
    },
  ],
  origin: { kind: 'original' },
  data: ['donations-2022-2025.json'],
  status: 'published',
  added: '2026-09-22',
  updated: '2026-09-22',
  d3Modules: ['d3-selection', 'd3-scale', 'd3-axis', 'd3-shape', 'd3-time'],
});
