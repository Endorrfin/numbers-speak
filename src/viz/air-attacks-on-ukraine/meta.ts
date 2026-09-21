import { defineViz } from '../../catalog/types';

// CHANGED (S3-aa): published — CATALOG #11 (was `air-strikes`): missiles and drones launched at Ukraine, from every
// national Air Force report since autumn 2022, five angles by sub-tabs + HRMMU civilian casualties.
export default defineViz({
  id: 'air-attacks-on-ukraine',
  title: {
    en: 'Russian missile and drone attacks on Ukraine, 2022–2026',
    uk: 'Російські ракетні й дронові атаки на Україну, 2022–2026',
  },
  subtitle: {
    en: 'Launched, shot down, not intercepted — every national Air Force report since autumn 2022',
    uk: 'Запущено, збито, не перехоплено — усі загальнонаціональні звіти Повітряних сил з осені 2022 року',
  },
  description: {
    en: 'From 28 September 2022 to 19 September 2026 the Air Force of Ukraine reported 119,405 Shahed-type attack and decoy drones and 7,639 missiles launched at Ukraine. The drone campaign grew seventeen-fold between 2023 (3,113) and 2025 (54,536); the largest single attack, on the night of 6–7 September 2025, counted 810 drones and 13 missiles.\n\nFive angles on the same reports: launched against shot down or suppressed and not intercepted; missiles by class and by model; the share stopped per month and class — about nine in ten drones and eight in ten cruise missiles, but only one in five ballistic missiles; the largest attacks; and civilian casualties recorded by the UN Human Rights Monitoring Mission. Every view keeps its own link: angle, year, step and table.\n\nThe counts are the Air Force’s own, compiled by Petro Ivaniuk (Kaggle, CC BY‑NC‑SA 4.0; the derived data is shared under the same licence). Only national reports are counted — regional commands overlap them — and only long-range weapons: tactical and reconnaissance drones and guided bombs are not. From 10 August 2026 the number launched is withheld for some missile types, so those counts are lower bounds (the shaded band). “Not intercepted” is not the same as “hit a target”.',
    uk: 'З 28 вересня 2022 до 19 вересня 2026 року Повітряні сили ЗСУ повідомили про 119 405 ударних дронів типу Shahed та імітаторів і 7 639 ракет, запущених по Україні. Між 2023 (3 113) і 2025 роком (54 536) кількість дронів зросла в сімнадцять разів; наймасованіша атака — у ніч на 7 вересня 2025 року: 810 дронів і 13 ракет.\n\nП’ять поглядів на ті самі звіти: запущено проти збитого чи подавленого і неперехопленого; ракети за класами й моделями; частка зупинених за місяць і клас — близько дев’яти з десяти дронів і восьми з десяти крилатих ракет, але лише одна з п’яти балістичних; наймасованіші атаки; і цивільні жертви, зафіксовані Моніторинговою місією ООН з прав людини. Кожен вигляд має власне посилання: погляд, рік, крок і таблиця.\n\nЧисла — власні дані Повітряних сил, зведені Петром Іванюком (Kaggle, CC BY‑NC‑SA 4.0; похідні дані поширюються на тих самих умовах). Враховано лише загальнонаціональні звіти — регіональні командування їх дублюють — і лише далекобійну зброю: тактичні й розвідувальні дрони та керовані авіабомби не враховано. З 10 серпня 2026 року кількість запущених ракет деяких типів не повідомляють, тож ці числа — нижня межа (тонована смуга). «Не перехоплено» не означає «влучило в ціль».',
  },
  rubrics: ['ukraine', 'security'],
  chart: 'bar',
  geo: 'ukraine',
  period: { from: 2022, to: 2026 },
  tags: ['war', 'air attacks', 'missiles', 'drones', 'shahed', 'air defence', 'civilians', 'війна', 'ракети', 'дрони', 'ппо', 'обстріли'],
  sources: [
    {
      title: 'Petro Ivaniuk — “Massive Missile Attacks on Ukraine” (Kaggle, v211 of 19 Sep 2026, CC BY-NC-SA 4.0), compiled from the reports of the Air Force Command and the General Staff of the Armed Forces of Ukraine',
      url: 'https://www.kaggle.com/datasets/piterfm/massive-missile-attacks-on-ukraine',
      retrieved: '2026-09-21',
    },
    {
      title: 'Air Force of the Armed Forces of Ukraine — official channel (the primary reports)',
      url: 'https://t.me/kpszsu',
      retrieved: '2026-09-21',
    },
    {
      title: 'UN HRMMU — “2025 deadliest year for civilians in Ukraine since 2022” (civilian casualties 2023–2025, by weapon for 2025)',
      url: 'https://ukraine.ohchr.org/en/2025-deadliest-year-for-civilians-in-Ukraine-since-2022-UN-human-rights-monitors-find',
      retrieved: '2026-09-21',
    },
    {
      title: 'UN HRMMU — Protection of Civilians in Armed Conflict, monthly updates January–August 2026',
      url: 'https://ukraine.ohchr.org/en/reports/protection-of-civilians',
      retrieved: '2026-09-21',
    },
  ],
  origin: { kind: 'original' },
  data: ['attacks-2022-2026.json', 'civilians-hrmmu-2023-2026.json'],
  status: 'published',
  added: '2026-09-21',
  updated: '2026-09-21',
  d3Modules: ['d3-selection', 'd3-scale', 'd3-axis', 'd3-shape', 'd3-transition', 'd3-time'],
});
