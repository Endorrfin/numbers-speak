import { defineViz } from '../../catalog/types';

// CHANGED (S3-tl): new entry (CATALOG §C #26, renamed from the planned "Time of life by activity").
// Six angles on one dataset — the OECD Time Use Database — chosen by sub-tabs on the page.
export default defineViz({
  id: 'time-of-life',
  title: { en: 'Human life in numbers', uk: 'Людське життя в цифрах' },
  subtitle: {
    en: 'Where the 50 years from 15 to 64 go: sleep, work, chores and free time — time-use surveys of 35 countries',
    uk: 'Куди йдуть 50 років від 15 до 64: сон, робота, обов’язки й вільний час — опитування використання часу в 35 країнах',
  },
  description: {
    en: 'National time-use surveys ask thousands of people to keep a diary of one day, minute by minute. The OECD collects the results: how many minutes an average person aged 15–64 spends sleeping, working, cooking, commuting, watching TV or meeting friends on an average day, weekdays and weekends together.\n\nThis page takes that average day and stretches it over the 50 years between the 15th and the 65th birthday. On the OECD average, about 17.6 of those years go to sleep, 7.3 to paid work, 4.2 to housework and 4.0 to TV and radio; only about 10 years are free time.\n\nSix angles show the same numbers: a life in weeks (one square = one week), one average day, a ranking in years, days, hours or %, needs versus duties versus free time, a comparison of 35 countries and women versus men.\n\nThe numbers are averages over everyone, including people who do not work or study, so they are not the life of any one person. Childhood and old age are not covered, the surveys are from different years (1998–2024) and countries sort some activities differently. Ukraine is not in the database.',
    uk: 'Національні опитування використання часу просять тисячі людей хвилина за хвилиною записати в щоденник один свій день. OECD збирає результати: скільки хвилин середня людина віком 15–64 роки спить, працює, готує, їде на роботу, дивиться телевізор чи зустрічається з друзями в середній день — будні й вихідні разом.\n\nЦя сторінка бере цей середній день і розтягує його на 50 років між 15-м і 65-м днем народження. У середньому по OECD приблизно 17,6 з цих років іде на сон, 7,3 — на оплачувану роботу, 4,2 — на хатні справи і 4,0 — на телевізор і радіо; вільного часу — лише близько 10 років.\n\nШість поглядів на ті самі числа: життя в тижнях (один квадрат — один тиждень), один середній день, рейтинг у роках, днях, годинах чи %, потреби проти обов’язків і вільного часу, порівняння 35 країн і жінки проти чоловіків.\n\nЦе середні значення по всіх, зокрема тих, хто не працює і не навчається, тож це не життя конкретної людини. Дитинство і старість не охоплено, опитування проведено в різні роки (1998–2024), і країни по-різному групують деякі заняття. України в базі немає.',
  },
  rubrics: ['knowledge'],
  chart: 'waffle',
  geo: 'world',
  tags: [
    'time use',
    'life',
    'sleep',
    'work',
    'leisure',
    'housework',
    'gender',
    'oecd',
    'час',
    'життя',
    'сон',
    'робота',
    'вільний час',
  ],
  sources: [
    {
      title: 'OECD — Time Use Database (workbook “OECD-time-use-database-updates.xlsx”, sheets Total, Men, Women; update of 30 Apr 2026)',
      url: 'https://www.oecd.org/en/data/datasets/time-use-database.html',
      retrieved: '2026-09-20',
    },
    {
      title: 'OECD Data Explorer — Time use (five main categories, minutes per day)',
      url: 'https://data-explorer.oecd.org/vis?df%5Bds%5D=DisseminateFinalDMZ&df%5Bid%5D=DSD_TIME_USE%40DF_TIME_USE&df%5Bag%5D=OECD.WISE.INE',
      retrieved: '2026-09-20',
    },
  ],
  origin: { kind: 'original' },
  data: ['time-use-oecd-2026.json'],
  status: 'published',
  added: '2026-09-20',
  updated: '2026-09-20',
  d3Modules: ['d3-selection', 'd3-scale', 'd3-axis', 'd3-transition'],
});
