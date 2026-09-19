import { defineViz } from '../../catalog/types';

// CHANGED (S3-bd): new entry (CATALOG §C #31) — five angles on one dataset, chosen by sub-tabs on the page.
export default defineViz({
  id: 'births-deaths-ua',
  title: { en: 'Births and deaths in Ukraine, 1990–2025', uk: 'Народжуваність і смертність в Україні, 1990–2025' },
  subtitle: {
    en: 'Registered births and deaths per year — five ways to see the same 36 years',
    uk: 'Зареєстровані народження і смерті за рік — п’ять поглядів на ті самі 36 років',
  },
  description: {
    en: 'Since 1991 more people have died in Ukraine every year than have been born. In 1990 there were 657,200 births and 629,600 deaths; in 2025 — 168,800 births and 485,300 deaths, almost three deaths for every birth.\n\nThe page shows the same annual series from five angles: the gap between the two lines (natural decrease), deaths per birth, natural change as bars, mirrored bars and an index where 1990 = 100. Each angle has its own link.\n\nThe territory covered by the registration data changed twice: from 2014 the figures exclude the AR of Crimea, Sevastopol and the occupied parts of Donetsk and Luhansk oblasts; from 2022 they exclude Crimea and the temporarily occupied territories (Ministry of Justice data). Part of the fall across 2014 and 2022 is therefore a change of coverage, not only of demography; the shaded bands mark these periods. Deaths per birth compares periods more fairly than absolute numbers.',
    uk: 'З 1991 року в Україні щороку помирає більше людей, ніж народжується. У 1990-му народилося 657 200 дітей і померло 629 600 людей; у 2025-му — 168 800 народжень і 485 300 смертей, майже три смерті на одне народження.\n\nСторінка показує той самий річний ряд з п’яти боків: розрив між двома лініями (природне скорочення), кількість смертей на одне народження, природний приріст стовпцями, дзеркальні стовпці та індекс, де 1990 = 100. Кожен погляд має власне посилання.\n\nТериторія, яку охоплюють дані реєстрації, змінювалася двічі: з 2014 року — без АР Крим, Севастополя та окупованих частин Донецької й Луганської областей; з 2022-го — без Криму й тимчасово окупованих територій (дані Мін’юсту). Тож частина падіння після 2014 і 2022 років — це зміна охоплення, а не лише демографія; ці періоди позначено тонованими смугами. Показник «смертей на одне народження» порівнює періоди чесніше, ніж абсолютні числа.',
  },
  rubrics: ['ukraine'],
  chart: 'line',
  geo: 'ukraine',
  period: { from: 1990, to: 2025 },
  tags: ['demography', 'births', 'deaths', 'natural decrease', 'population', 'демографія', 'народжуваність', 'смертність'],
  sources: [
    {
      title: 'Slovo i Dilo — “The Ministry of Justice updated birth and death data for 2025” (infographic, 22 Jan 2026), compiled from State Statistics Service, Opendatabot and Ministry of Justice data',
      url: 'https://www.slovoidilo.ua/2026/01/22/infografika/suspilstvo/minyust-onovyv-dani-pro-narodzhuvanist-ta-smertnist-2025-rik',
      retrieved: '2026-09-19',
    },
    {
      title: 'State Statistics Service of Ukraine — dataset “Births” (Народжуваність)',
      url: 'https://stat.gov.ua/uk/datasets/narodzhuvanist',
      retrieved: '2026-09-19',
    },
    {
      title: 'State Statistics Service of Ukraine — dataset “Mortality” (Смертність)',
      url: 'https://stat.gov.ua/uk/datasets/smertnist',
      retrieved: '2026-09-19',
    },
  ],
  origin: { kind: 'original' },
  data: ['births-deaths-1990-2025.json'],
  status: 'published',
  added: '2026-09-19',
  updated: '2026-09-19',
  d3Modules: ['d3-selection', 'd3-scale', 'd3-axis', 'd3-shape', 'd3-transition'],
});
