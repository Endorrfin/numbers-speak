import { defineViz } from '../../catalog/types';

// S3-rb: new entry (CATALOG §C #6), replacing the legacy `_examples/Contribution/Demographics/Crime index` page
// (Numbeo 2025 top 100, source not named, Haiti in "Oceania"). Owner decision: two measures as sub-tabs — the
// official UNODC homicide rate and Numbeo's perceived-crime index — so each is read for what it is.
export default defineViz({
  id: 'crime-index',
  title: { en: 'Crime by country: homicides and perceived crime', uk: 'Злочинність у країнах: убивства й відчуття небезпеки' },
  subtitle: {
    en: 'Official homicide rates (UNODC) next to Numbeo’s crowd-sourced Crime Index',
    uk: 'Офіційний рівень убивств (UNODC) поруч з індексом злочинності Numbeo, зібраним від користувачів',
  },
  description: {
    en: 'Two different measures as sub-tabs. The homicide rate — victims of intentional homicide per 100,000 people — is the most comparable official crime statistic, because a killing is almost always recorded; UNODC compiles it from national police and public-health data. Numbeo’s Crime Index is something else: an online survey of how safe residents and visitors feel (0–100) — a measure of perception, not a count of crimes.\n\nHomicide: the latest year per country since 2015 from UNODC’s data file of July 2026; values older than 2024 are marked with their year. The United Kingdom is combined from England and Wales, Scotland and Northern Ireland; Iraq covers Central Iraq only. Killings in war are not intentional homicides, and for Ukraine UNODC’s latest figure is for 2021. Numbeo: 2026 Mid-Year edition, used under its terms for personal websites, with a link back.\n\nRegions follow the UN M49 continents — Haiti is in the Americas.',
    uk: 'Два різні показники як підвкладки. Рівень убивств — кількість жертв умисних убивств на 100 000 населення — найпорівнянніша офіційна статистика злочинності, бо вбивство майже завжди реєструють; UNODC зводить її з даних національної поліції й охорони здоров’я. Індекс злочинності Numbeo — інше: онлайн-опитування про те, наскільки безпечно почуваються мешканці й відвідувачі (0–100), тобто міра сприйняття, а не підрахунок злочинів.\n\nУбивства: останній рік для кожної країни з 2015-го, з файлу даних UNODC за липень 2026 року; значення, старші за 2024 рік, позначено роком. Велику Британію об’єднано з Англії й Уельсу, Шотландії та Північної Ірландії; для Іраку — лише Центральний Ірак. Загибель на війні не є умисним убивством, а для України останнє значення UNODC — за 2021 рік. Numbeo: випуск 2026 Mid-Year, використано за його умовами для особистих сайтів, із посиланням.\n\nРегіони — за континентами ООН M49: Гаїті — в Америці.',
  },
  rubrics: ['security'],
  chart: 'ranked-bar',
  geo: 'world',
  period: { from: 2015, to: 2026 },
  tags: ['crime', 'homicide', 'safety', 'security', 'unodc', 'numbeo', 'ranking', 'злочинність', 'убивства', 'безпека'],
  sources: [
    {
      title: 'UNODC Data Portal — Intentional homicide: victims of intentional homicide, counts and rates per 100,000 (data file of 12 Jul 2026) and regional/world estimates',
      url: 'https://data.unodc.org/datareport/hom-victim',
      retrieved: '2026-09-24',
    },
    {
      title: 'Numbeo — Crime Index by Country 2026 Mid-Year (crowd-sourced survey; personal-website use with a link back)',
      url: 'https://www.numbeo.com/crime/rankings_by_country.jsp',
      retrieved: '2026-09-25',
    },
  ],
  origin: { kind: 'original' },
  data: ['homicide-rate.json'],
  // `soon` until the owner's Numbeo copy ships (then add NUMBEO_FILE to `data` — its tab turns on — and publish).
  status: 'soon',
  added: '2026-09-25',
  updated: '2026-09-25',
  d3Modules: ['d3-selection', 'd3-scale', 'd3-axis', 'd3-transition', 'd3-interpolate', 'd3-array'],
});
