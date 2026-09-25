import { defineViz } from '../../catalog/types';

// S3-rb: new entry (CATALOG §C #8), replacing the legacy `_examples/Contribution/Robotization of production` page
// (unsourced, typos, not a real top 15) with IFR World Robotics 2025 figures as publicly released.
export default defineViz({
  id: 'robotization',
  title: {
    en: 'Industrial robots per 10,000 workers, 2024 (top 15)',
    uk: 'Роботизація виробництва, 2024 (топ-15)',
  },
  subtitle: {
    en: 'Robot density in manufacturing: South Korea leads with more than nine times the world average',
    uk: 'Щільність роботів у промисловості: Південна Корея — понад удев’ятеро вище за світове середнє',
  },
  description: {
    en: 'Robot density — operational industrial robots per 10,000 employees in manufacturing — is the International Federation of Robotics’ yardstick of factory automation that corrects for the size of each economy’s workforce. In 2024 South Korea led with 1,220, more than nine times the world average of 132, ahead of Singapore (818), Germany (449) and Japan (446); nine of the top 15 are in Europe. China, which operates by far the largest stock of robots, ranks 22nd with 166 on updated labour-market data from its National Bureau of Statistics.\n\nThe figures are from IFR’s World Robotics 2025 report as released publicly in its press release of 8 April 2026 (a chart of 22 economies); the full report is sold under licence, so this page shows only the published chart. IFR reports Belgium and Luxembourg as one figure (marked *) and calls Taiwan “Chinese Taipei”. Regions follow the UN M49 continents.',
    uk: 'Щільність роботів — кількість промислових роботів у роботі на 10 000 працівників обробної промисловості — це мірило автоматизації заводів від Міжнародної федерації робототехніки (IFR), яке враховує розмір робочої сили кожної економіки. У 2024 році лідирувала Південна Корея — 1 220, понад удев’ятеро більше за світове середнє (132), далі Сінгапур (818), Німеччина (449) і Японія (446); дев’ять із топ-15 — у Європі. Китай, який має найбільший парк роботів, — лише 22-й зі 166 за оновленими даними про зайнятість його Національного бюро статистики.\n\nЦифри — зі звіту IFR World Robotics 2025 у тому вигляді, в якому IFR оприлюднила їх у пресрелізі 8 квітня 2026 року (діаграма з 22 економік); повний звіт продається за ліцензією, тож сторінка показує лише опубліковану діаграму. IFR подає Бельгію й Люксембург одним значенням (позначено *) і називає Тайвань «Chinese Taipei». Регіони — за континентами ООН M49.',
  },
  rubrics: ['economy'],
  chart: 'ranked-bar',
  geo: 'world',
  period: { from: 2024, to: 2024 },
  tags: [
    'robots',
    'robot density',
    'automation',
    'manufacturing',
    'industry',
    'ranking',
    'роботи',
    'автоматизація',
    'промисловість',
    'виробництво',
  ],
  sources: [
    {
      title: 'International Federation of Robotics — “Robot Density Surges in Europe, Asia, and Americas”, press release, 8 Apr 2026 (World Robotics 2025)',
      url: 'https://ifr.org/ifr-press-releases/news/robot-density-surges-in-europe-asia-and-americas',
      retrieved: '2026-09-24',
    },
    {
      title: 'IFR — chart “Robot density in the manufacturing industry 2024” (22 economies and the world average)',
      url: 'https://ifr.org/downloads/press_docs/Graph_robot_density_by_country_worldwide_2024.jpg',
      retrieved: '2026-09-24',
    },
  ],
  origin: { kind: 'original' },
  data: ['robot-density-2024.json'],
  status: 'published',
  added: '2026-09-24',
  updated: '2026-09-24',
  d3Modules: ['d3-selection', 'd3-scale', 'd3-axis', 'd3-transition', 'd3-interpolate', 'd3-array'],
});
