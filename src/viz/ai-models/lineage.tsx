// lineage.tsx — CHANGED (S3-ai2): angle E, models built on each company's models (Epoch's "base model" chains, the
// rule's second test). One row per company: a bar of the derived models, how many other organizations made them, and
// small columns a year (the last year marked "*": Epoch is still adding it). Opening a row (= ?company=) draws its
// family tree with d3-hierarchy, cut to the largest families; the table view lists every model.
// CHANGED (S3-ai3): a headline sentence and "Did you know" facts (the models with the most models built on them).
import { useId, useMemo } from 'react';
import { Tree } from '../../charts/Tree';
import { useLang } from '../../i18n/lang';
import { fill, ui } from '../../i18n/ui';
import { formatDate, formatNumber } from '../../lib/format';
import { dataUrl, useDataset } from '../../lib/useDataset';
import { DataState, EpochCredit, Facts, Lead } from './common';
import type { AngleProps } from './common';
import { FILES, familyTrees, knownCompany, parseLineage, parseReleases, partialYear } from './data';
import type { Hero, LineageDataset, ReleasesDataset } from './data';
import { txt as shared } from './text';
import { TREE_CAPS, baseFacts, familyView } from './views';

const parse = (json: unknown): LineageDataset => parseLineage(json, FILES.lineage);
const parseHeroes = (json: unknown): ReleasesDataset => parseReleases(json, FILES.releases);


const txt = {
  head: { en: 'Models built on its models · by other organizations · a year, {from}–{to}', uk: 'Моделей на її моделях · інших організацій · за роками, {from}–{to}' },
  derived: { en: '{n} models', uk: 'моделей — {n}' },
  derivedOne: { en: '1 model', uk: 'моделей — 1' },
  orgs: { en: 'by {n} other organizations', uk: 'інших організацій — {n}' },
  none: { en: 'none recorded', uk: 'не записано' },
  open: { en: 'Show the family tree of {name}', uk: 'Показати родовід {name}' },
  close: { en: 'Hide the family tree of {name}', uk: 'Сховати родовід {name}' },
  openShort: { en: 'Tree', uk: 'Дерево' },
  treeLabel: {
    en: 'Tree: models built on {name}’s models — {shown} of {total} shown, the largest families first. The table view lists all of them.',
    uk: 'Дерево: моделі, побудовані на моделях {name}, — показано {shown} з {total}, спершу найбільші родини. Таблиця містить усі.',
  },
  treeNote: {
    en: '{shown} of {total} models shown: the {roots} largest families, up to {children} models built directly on each and {grand} on those. “+n” after a year = models further down that branch. The table view lists all of them.',
    uk: 'Показано {shown} з {total} моделей: {roots} найбільших родин, до {children} моделей безпосередньо на кожній і до {grand} на них. «+n» після року — моделі глибше в цій гілці. Таблиця містить усі.',
  },
  more: { en: '+{n} more ({m} models)', uk: 'ще {n} ({m} моделей)' },
  kpiUnique: { en: 'models built on the eight companies’ models (each counted once)', uk: 'моделей на моделях восьми компаній (кожна — один раз)' },
  kpiMost: { en: 'most: {name}, by {orgs} other organizations', uk: 'найбільше: {name}, інших організацій — {orgs}' },
  kpiFamily: { en: 'largest family: {model} ({name})', uk: 'найбільша родина: {model} ({name})' },
  kpiYear: { en: 'built in {year} on the eight companies’ models', uk: 'побудовано у {year} на моделях восьми компаній' },
  noteCount: {
    en: 'A model counts for a company when the chain of base models Epoch records for it — the base, the base of the base… — leads to one of the company’s models: fine-tuned, distilled or extended versions, by anyone, the company’s own later versions included. A model can lead to two companies and counts for both. Chains are short: most models are one step from their base.',
    uk: 'Модель зараховано компанії, коли ланцюжок базових моделей, який записав Epoch, — база, база бази… — веде до однієї з моделей компанії: донавчені, дистильовані чи розширені версії, хоч від кого, разом із пізнішими версіями самої компанії. Модель може вести до двох компаній і рахується для обох. Ланцюжки короткі: більшість моделей — за крок від бази.',
  },
  notePartial: {
    en: '* {year}: to {date} — Epoch records a derived model with a delay, so the last year is far from complete.',
    uk: '* {year}: до {date} — Epoch записує похідні моделі із запізненням, тож останній рік далеко не повний.',
  },
  colDerived: { en: 'Models built on its models', uk: 'Моделей на її моделях' },
  colOrgs: { en: 'Other organizations', uk: 'Інших організацій' },
  colBase: { en: 'Built on', uk: 'На основі' },
  colMaker: { en: 'Made by', uk: 'Розробник' },
  sumCaption: { en: 'Models built on each company’s models, by year, {from}–{to}', uk: 'Моделі на моделях кожної компанії, за роками, {from}–{to}' },
  listCaption: { en: '{name}: every model built on its models ({n})', uk: '{name}: усі моделі на її моделях ({n})' },
  // CHANGED (S3-ai3)
  lead: {
    en: 'The most models are built on {name}’s models: {n}, by {orgs} other organizations.',
    uk: 'Найбільше моделей побудовано на моделях {name}: {n}; інших організацій — {orgs}.',
  },
  leadCompany: {
    en: '{name}: {n} models built on its models, by {orgs} other organizations; the largest family starts at {model} ({size} models).',
    uk: '{name}: моделей на її моделях — {n}, інших організацій — {orgs}; найбільша родина — від {model} (моделей — {size}).',
  },
  leadCompanyNone: {
    en: '{name}: no model in Epoch AI’s database is recorded as built on its models.',
    uk: '{name}: у базі Epoch AI не записано жодної моделі на її моделях.',
  },
  factTop: { en: '{model} ({name}) has the most models built directly on it: {n}.', uk: 'Найбільше моделей безпосередньо на одній основі — {n}: {model} ({name}).' },
  factNext: { en: 'Next, among the other companies: {list}.', uk: 'Далі, серед інших компаній: {list}.' },
  factItem: { en: '{model} ({name}, {n})', uk: '{model} ({name}, {n})' },
  pick: { en: 'Pick a company (Highlight, or open its row in the chart) to list every model built on its models.', uk: 'Виберіть компанію («Виділити» або рядок на графіку), щоб побачити всі моделі на її моделях.' },
} as const;

export function LineageAngle(props: AngleProps) {
  const state = useDataset(dataUrl('ai-models', FILES.lineage), parse);
  const heroes = useDataset(dataUrl('ai-models', FILES.releases), parseHeroes);
  if (state.status !== 'ready') return <DataState status={state.status} retry={state.status === 'error' ? state.retry : undefined} />;
  if (heroes.status !== 'ready') return <DataState status={heroes.status} retry={heroes.status === 'error' ? heroes.retry : undefined} />;
  return <LineageView ds={state.data} heroes={heroes.data.heroes} {...props} />;
}

function LineageView({ ds, heroes, settings, update }: AngleProps & { ds: LineageDataset; heroes: readonly Hero[] }) {
  const { t, lang } = useLang();
  const base = useId();
  const company = knownCompany(heroes, settings.company);
  const nameOf = useMemo(() => new Map(heroes.map((h) => [h.id, h.name])), [heroes]);
  const name = (id: string): string => nameOf.get(id) ?? id;
  const partial = partialYear(ds);
  const last = ds.years.length - 1;
  const yearLabel = (i: number): string => `${ds.years[i]}${partial && i === last ? '*' : ''}`;
  const from = ds.years[0]!;
  const to = yearLabel(last);
  const maxDerived = Math.max(1, ...ds.heroes.map((h) => h.derived));
  const maxYear = Math.max(1, ...ds.heroes.flatMap((h) => h.byYear));
  const trees = useMemo(() => new Map(ds.heroes.map((h) => [h.id, familyTrees(h)])), [ds]);
  const open = ds.heroes.find((h) => h.id === company && h.derived > 0);
  const view = useMemo(() => {
    if (!open) return null;
    return familyView(trees.get(open.id)!, TREE_CAPS, (n, m) => fill(t(txt.more), { n: formatNumber(n, lang), m: formatNumber(m, lang) }));
  }, [open, trees, t, lang]);

  // KPIs: unique derived models across the eight; the largest; the largest family; the last complete year.
  const unique = new Set(ds.heroes.flatMap((h) => h.nodes.filter((n) => n.parent !== null).map((n) => n.model))).size;
  const most = ds.heroes[0]!;
  const family = ds.heroes
    .flatMap((h) => (trees.get(h.id) ?? []).map((f) => ({ f, id: h.id })))
    .reduce((a, b) => (b.f.size > a.f.size ? b : a));
  const full = partial ? last - 1 : last;
  // CHANGED (S3-ai3): headline (the company with the most, or the highlighted one) and facts.
  const picked = company ? ds.heroes.find((h) => h.id === company) : undefined;
  const pickedFamily = picked ? (trees.get(picked.id) ?? [])[0] : undefined;
  const lead = picked
    ? picked.derived > 0 && pickedFamily
      ? fill(t(txt.leadCompany), {
          name: name(picked.id),
          n: formatNumber(picked.derived, lang),
          orgs: formatNumber(picked.orgs, lang),
          model: pickedFamily.model,
          size: formatNumber(pickedFamily.size, lang),
        })
      : fill(t(txt.leadCompanyNone), { name: name(picked.id) })
    : fill(t(txt.lead), { name: name(most.id), n: formatNumber(most.derived, lang), orgs: formatNumber(most.orgs, lang) });
  const bases = baseFacts(ds);
  const facts = bases
    ? [
        fill(t(txt.factTop), { model: bases.top.model, name: name(bases.top.hero), n: formatNumber(bases.top.children, lang) }),
        ...(bases.next.length
          ? [fill(t(txt.factNext), { list: bases.next.map((b) => fill(t(txt.factItem), { model: b.model, name: name(b.hero), n: formatNumber(b.children, lang) })).join(', ') })]
          : []),
      ]
    : [];
  const inFull = new Set(ds.heroes.flatMap((h) => h.nodes.filter((n) => n.parent !== null && Number(n.date.slice(0, 4)) === ds.years[full]).map((n) => n.model))).size;

  return (
    <>
      <Lead text={lead} />
      <div className="controls" role="group" aria-label={t(ui.chartSettings)}>
        <div className="field">
          <label htmlFor={`${base}-company`}>{t(shared.company)}</label>
          <select id={`${base}-company`} value={company ?? ''} onChange={(e) => update({ company: e.target.value || null })}>
            <option value="">{t(shared.none)}</option>
            {ds.heroes.map((h) => (
              <option key={h.id} value={h.id}>
                {name(h.id)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {settings.view === 'table' ? (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <caption>{fill(t(txt.sumCaption), { from, to })}</caption>
              <thead>
                <tr>
                  <th scope="col">{t(shared.colCompany)}</th>
                  <th scope="col" className="num">
                    {t(txt.colDerived)}
                  </th>
                  <th scope="col" className="num">
                    {t(txt.colOrgs)}
                  </th>
                  {ds.years.map((y, i) => (
                    <th key={y} scope="col" className="num">
                      {yearLabel(i)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ds.heroes.map((h) => (
                  <tr key={h.id} className={h.id === company ? 'is-home' : undefined}>
                    <th scope="row">{name(h.id)}</th>
                    <td className="num">{formatNumber(h.derived, lang)}</td>
                    <td className="num">{formatNumber(h.orgs, lang)}</td>
                    {h.byYear.map((v, i) => (
                      <td key={ds.years[i]} className="num">
                        {formatNumber(v, lang)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {company ? (
            <FamilyTable ds={ds} id={company} name={name(company)} />
          ) : (
            <p className="chart-note muted">{t(txt.pick)}</p>
          )}
        </>
      ) : (
        <div className="fam">
          <p className="fam-head muted">{fill(t(txt.head), { from, to })}</p>
          <ul className="fam-list">
            {ds.heroes.map((h) => {
              const isOpen = open?.id === h.id;
              const treeId = `${base}-tree-${h.id}`;
              return (
                <li key={h.id} className={h.id === company ? 'fam-row is-home' : 'fam-row'}>
                  <div className="fam-line">
                    <span className="fam-name">{name(h.id)}</span>
                    <span className="fam-bar" aria-hidden="true">
                      <span style={{ width: `${(100 * h.derived) / maxDerived}%` }} />
                    </span>
                    <span className="fam-value">
                      {h.derived > 0 ? (
                        <>
                          <strong>{h.derived === 1 ? t(txt.derivedOne) : fill(t(txt.derived), { n: formatNumber(h.derived, lang) })}</strong>
                          {h.orgs > 0 ? ` ${fill(t(txt.orgs), { n: formatNumber(h.orgs, lang) })}` : ''}
                        </>
                      ) : (
                        t(txt.none)
                      )}
                    </span>
                    <span className="fam-spark" aria-hidden="true">
                      <svg viewBox={`0 0 ${ds.years.length * 10} 24`} preserveAspectRatio="none">
                        {h.byYear.map((v, i) => (
                          <rect key={ds.years[i]} className={partial && i === last ? 'is-partial' : undefined} x={i * 10 + 1} width={8} y={24 - (24 * v) / maxYear} height={(24 * v) / maxYear} />
                        ))}
                      </svg>
                    </span>
                    {h.derived > 0 && (
                      <button
                        type="button"
                        className="btn btn-ghost fam-toggle"
                        aria-expanded={isOpen}
                        aria-controls={isOpen ? treeId : undefined}
                        aria-label={fill(t(isOpen ? txt.close : txt.open), { name: name(h.id) })}
                        onClick={() => update({ company: isOpen ? null : h.id })}
                      >
                        {t(txt.openShort)} {isOpen ? '▴' : '▾'}
                      </button>
                    )}
                  </div>
                  {isOpen && view && (
                    <div id={treeId} className="fam-tree">
                      <Tree roots={view.roots} label={fill(t(txt.treeLabel), { name: name(h.id), shown: formatNumber(view.shown, lang), total: formatNumber(h.derived, lang) })} />
                      <p className="chart-note muted">
                        {fill(t(txt.treeNote), {
                          shown: formatNumber(view.shown, lang),
                          total: formatNumber(h.derived, lang),
                          roots: TREE_CAPS.roots,
                          children: TREE_CAPS.children,
                          grand: TREE_CAPS.grandchildren,
                        })}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <ul className="kpi-row" aria-label={t(shared.keyFigures)}>
        <li className="kpi">
          <span className="kpi-value">{formatNumber(unique, lang)}</span>
          <span className="kpi-label">{t(txt.kpiUnique)}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">
            {name(most.id)} · {formatNumber(most.derived, lang)}
          </span>
          <span className="kpi-label">{fill(t(txt.kpiMost), { name: name(most.id), orgs: formatNumber(most.orgs, lang) })}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{formatNumber(family.f.size, lang)}</span>
          <span className="kpi-label">{fill(t(txt.kpiFamily), { model: family.f.model, name: name(family.id) })}</span>
        </li>
        <li className="kpi">
          <span className="kpi-value">{formatNumber(inFull, lang)}</span>
          <span className="kpi-label">{fill(t(txt.kpiYear), { year: ds.years[full]! })}</span>
        </li>
      </ul>
      <Facts items={facts} />
      {partial && <p className="chart-note">{fill(t(txt.notePartial), { year: ds.years[last]!, date: formatDate(ds.through, lang) })}</p>}
      <p className="chart-note muted">{t(txt.noteCount)}</p>
      <EpochCredit ds={ds} />
    </>
  );
}

function FamilyTable({ ds, id, name }: { ds: LineageDataset; id: string; name: string }) {
  const { t, lang } = useLang();
  const h = ds.heroes.find((x) => x.id === id);
  const rows = (h?.nodes ?? []).filter((n) => n.parent !== null);
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{fill(t(txt.listCaption), { name, n: formatNumber(rows.length, lang) })}</caption>
        <thead>
          <tr>
            <th scope="col">{t(shared.colDate)}</th>
            <th scope="col">{t(shared.colModel)}</th>
            <th scope="col">{t(txt.colMaker)}</th>
            <th scope="col">{t(txt.colBase)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((n, i) => (
            <tr key={`${n.model}-${i}`}>
              <td>{formatDate(n.date, lang)}</td>
              <th scope="row">{n.model}</th>
              <td>{n.org ?? '—'}</td>
              <td>{n.parent}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
