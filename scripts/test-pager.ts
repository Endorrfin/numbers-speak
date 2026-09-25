// test-pager.ts — S3-fx: the shared pager of every paged ranking. Pure labels (`pageRanges`) against
// `paginate`, plus a CSS guard for the phone fix (the select never shrinks below its longest label).
// The rendered <Pager> is checked in the SSR smoke (markup, --pager-ch, disabled states, EN + UK). Run: npm test.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { pageRanges, paginate } from '../src/lib/paginate';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`✖ pager: ${name}\n`, e);
    process.exit(1);
  }
}

test('GPI (163 rows, 15 per page): 11 ranges, 1–15 … 151–163', () => {
  const r = pageRanges(163, 15);
  assert.equal(r.length, 11);
  assert.deepEqual(r[0], { value: 1, label: '1–15' });
  assert.deepEqual(r[10], { value: 11, label: '151–163' });
  assert.deepEqual(
    r.map((o) => o.value),
    Array.from({ length: 11 }, (_, i) => i + 1),
  );
});

test('a last page of one row is one number (crime-index 166 → "166"), an exact fit has no extra page', () => {
  assert.equal(pageRanges(166, 15).at(-1)?.label, '166');
  assert.deepEqual(pageRanges(15, 15), [{ value: 1, label: '1–15' }]);
  assert.deepEqual(pageRanges(1, 15), [{ value: 1, label: '1' }]);
});

test('an empty list is one page labelled "0" (paginate reports 1 page too)', () => {
  assert.deepEqual(pageRanges(0, 15), [{ value: 1, label: '0' }]);
  assert.equal(paginate([], 1, 15).pages, 1);
});

test('every range matches paginate(from, to) for totals 1…300 and sizes 10 / 15 / 25', () => {
  for (const size of [10, 15, 25]) {
    for (let total = 1; total <= 300; total++) {
      const all = Array.from({ length: total }, (_, i) => i);
      const ranges = pageRanges(total, size);
      assert.equal(ranges.length, paginate(all, 1, size).pages, `${total}/${size} pages`);
      for (const o of ranges) {
        const p = paginate(all, o.value, size);
        assert.equal(o.label, p.from === p.to ? String(p.from) : `${p.from}–${p.to}`, `${total}/${size} page ${o.value}`);
      }
    }
  }
});

test('longest label of the real paged entries fits the CSS width budget (≤ 7 characters)', () => {
  // gdp 218 · births/deaths per day 235 · population 237 · land 234 · PPP ≤ 197 · crime 166 / 148 · GPI 163
  for (const total of [218, 235, 237, 234, 197, 166, 148, 163]) {
    const longest = Math.max(...pageRanges(total, 15).map((o) => o.label.length));
    assert.ok(longest <= 7, `${total}: ${longest}`);
  }
});

test('CSS: the Rows field does not shrink and the select is sized from --pager-ch', () => {
  const css = readFileSync('src/theme/components.css', 'utf8');
  const field = /\.controls \.field-pager \{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.match(field, /flex:\s*0 0 auto/);
  const select = /\.pager select \{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.match(select, /min-width:\s*calc\(var\(--pager-ch, 7\) \* 1ch \+ [\d.]+rem\)/);
  assert.match(select, /tabular-nums/);
  // .field select sets width: 100 %; inside the content-sized field that made the select as wide as the whole
  // pager and pushed the › button out (768 px, Playwright) — the pager rule must reset it.
  assert.match(select, /width:\s*auto/);
});

test('every paged entry uses the shared Pager; no page builds its own options any more', () => {
  const paged: string[] = [];
  for (const id of readdirSync('src/viz')) {
    const file = `src/viz/${id}/index.tsx`;
    if (!existsSync(file)) continue;
    const src = readFileSync(file, 'utf8');
    assert.doesNotMatch(src, /pageOptions|className="pager"/, id);
    if (!/\bpaginate\(/.test(src)) continue;
    paged.push(id);
    assert.match(src, /<Pager id=\{`\$\{base\}-page`\}/, id);
  }
  assert.ok(paged.length >= 7, `paged entries found: ${paged.join(', ')}`);
});

console.log(`✓ pager: ${passed} tests passed.`);
process.exit(0);
