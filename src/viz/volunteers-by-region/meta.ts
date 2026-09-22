import { defineViz } from '../../catalog/types';

// CHANGED (S3-cd): new entry (CATALOG §C #10) — registered volunteers by region, Nov 2024.
export default defineViz({
  id: 'volunteers-by-region',
  title: { en: 'Registered volunteers by region, 2024', uk: 'Волонтери за областями, 2024' },
  subtitle: {
    en: 'Kyiv and Kharkiv lead the official registry — Crimea cannot register at all',
    uk: 'Київ і Харківщина лідирують у офіційному реєстрі — Крим зареєструватися не може',
  },
  description: {
    en: 'As of November 2024 Ukraine’s official volunteer registry (State Tax Service) counted 10,454 people. This page ranks them by region: Kyiv (city and oblast combined) and Kharkiv Oblast hold the largest shares, while several front-line and border oblasts sit far lower.\n\nRegistration is voluntary and comes with tax and reporting benefits, so the registry is a lower bound on real volunteering — Monobank alone counted tens of thousands of people running donation jars in the same period (see “Wartime donations”). The AR of Crimea shows zero: not because no one volunteers there, but because the registry is run by Ukraine’s State Tax Service and is unreachable under occupation.',
    uk: 'Станом на листопад 2024 року офіційний реєстр волонтерів України (Державна податкова служба) налічував 10 454 особи. Сторінка ранжує їх за областями: Київ (місто й область разом) та Харківщина мають найбільші частки, тоді як деякі прифронтові й прикордонні області — значно нижчі позиції.\n\nРеєстрація добровільна й дає податкові пільги, тож реєстр — це нижня межа реального волонтерства — лише Monobank фіксував десятки тисяч людей, що вели банки збору коштів у той самий період (див. «Пожертви воєнного часу»). АР Крим показує нуль не тому, що там немає волонтерів, а тому що реєстр веде податкова служба України, недоступна на окупованій території.',
  },
  rubrics: ['ukraine'],
  chart: 'ranked-bar',
  geo: 'ukraine',
  period: { from: 2024, to: 2024 },
  tags: ['volunteers', 'regions', 'oblasts', 'war', 'волонтери', 'області', 'війна'],
  sources: [
    {
      title: 'Opendatabot — «Реєстр волонтерів виріс у 1,5 рази цьогоріч» (regional breakdown, 5 Dec 2024)',
      url: 'https://opendatabot.ua/analytics/volunteers-2024',
      retrieved: '2026-09-22',
    },
  ],
  origin: { kind: 'original' },
  data: ['volunteers-by-region-2024.json'],
  status: 'published',
  added: '2026-09-22',
  updated: '2026-09-22',
  d3Modules: ['d3-selection', 'd3-scale', 'd3-axis'],
});
