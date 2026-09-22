import { defineViz } from '../../catalog/types';

// CHANGED (S3-cd): CATALOG #13 `volunteers-growth` — published, extended to Nov 2025 (owner-supplied export).
export default defineViz({
  id: 'volunteers-growth',
  title: { en: 'Growth of registered volunteers, 2022–2025', uk: 'Динаміка кількості волонтерів, 2022–2025' },
  subtitle: {
    en: 'From 320 to nearly 11,800 — the official registry, month by month',
    uk: 'Від 320 до майже 11 800 — офіційний реєстр, місяць за місяцем',
  },
  description: {
    en: 'Ukraine’s official volunteer registry (State Tax Service) counted 320 people in January 2022 and 11,792 in November 2025 — a 37-fold increase. Growth was never steady: December 2022 alone added 1,681 people, 69% of that year’s registrations, as wartime tax relief for volunteers took effect. Registration is voluntary, so the registry is a lower bound on real volunteering, not a census of it.\n\nThe pace has slowed sharply since: roughly 240–310 people joined per month through 2024, versus about 105 per month across 2025 — the boom is over even as the total keeps climbing. The seasonal view compares complete years (2022, 2023, 2024) month by month; 2025 is not yet a full year and stays on the timeline.',
    uk: 'Офіційний реєстр волонтерів України (Державна податкова служба) налічував 320 осіб у січні 2022 року і 11 792 — у листопаді 2025-го, тобто зріс у 37 разів. Зростання ніколи не було рівномірним: лише грудень 2022-го додав 1 681 особу — 69% усіх реєстрацій того року, коли запрацювали податкові пільги для волонтерів воєнного часу. Реєстрація добровільна, тож реєстр — це нижня межа реального волонтерства, а не його перепис.\n\nТемп відтоді суттєво сповільнився: протягом 2024 року долучалося приблизно 240–310 осіб на місяць, а протягом 2025-го — близько 105. Бум минув, хоча загальна цифра й далі зростає. Сезонний погляд порівнює повні роки (2022, 2023, 2024) місяць за місяцем; 2025-й ще не завершено, тож він лишається на хронології.',
  },
  rubrics: ['ukraine'],
  chart: 'line',
  geo: 'ukraine',
  period: { from: 2022, to: 2025 },
  tags: ['volunteers', 'registry', 'war', 'contribution', 'волонтери', 'реєстр', 'війна'],
  sources: [
    {
      title: 'Opendatabot — «Реєстр волонтерів виріс у 1,5 рази цьогоріч» (methodology, 5 Dec 2024) + owner export to Nov 2025',
      url: 'https://opendatabot.ua/analytics/volunteers-2024',
      retrieved: '2026-09-22',
    },
  ],
  origin: { kind: 'original' },
  data: ['volunteers-2022-2025.json'],
  status: 'published',
  added: '2026-09-22',
  updated: '2026-09-22',
  d3Modules: ['d3-selection', 'd3-scale', 'd3-axis', 'd3-shape', 'd3-time'],
});
