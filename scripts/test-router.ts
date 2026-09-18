// test-router.ts — golden tests for the hash router (pure functions only). Run: npm test.
import assert from 'node:assert/strict';
import { hrefAbout, hrefCatalog, hrefViz, parseHash, parseParams, stringifyParams } from '../src/lib/hashRouter';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`✖ router: ${name}\n`, e);
    process.exit(1);
  }
}

test('empty and root hashes open the whole catalog', () => {
  for (const h of ['', '#', '#/', '#//']) {
    assert.deepEqual(parseHash(h).route, { name: 'catalog', tab: 'all' });
    assert.equal(parseHash(h).path, '/');
  }
});

test('topic tabs', () => {
  assert.deepEqual(parseHash('#/t/ukraine').route, { name: 'catalog', tab: 'ukraine' });
  assert.deepEqual(parseHash('#/t/new').route, { name: 'catalog', tab: 'new' });
  assert.deepEqual(parseHash('#/t/unknown').route, { name: 'notFound' });
  assert.deepEqual(parseHash('#/t').route, { name: 'notFound' });
  assert.deepEqual(parseHash('#/t/world/extra').route, { name: 'notFound' });
});

test('visualization ids must be kebab-case', () => {
  assert.deepEqual(parseHash('#/v/gdp-by-country').route, { name: 'viz', id: 'gdp-by-country' });
  assert.deepEqual(parseHash('#/v/GDP').route, { name: 'notFound' });
  assert.deepEqual(parseHash('#/v/..%2Fsecret').route, { name: 'notFound' });
  assert.deepEqual(parseHash('#/v/bad_id').route, { name: 'notFound' });
});

test('about and unknown paths', () => {
  assert.deepEqual(parseHash('#/about').route, { name: 'about' });
  assert.deepEqual(parseHash('#/nope').route, { name: 'notFound' });
});

test('query params are parsed and sanitised', () => {
  const loc = parseHash('#/t/world?chart=line&q=%D0%B2%D0%B2%D0%BF%20gdp&Bad=1&empty=');
  assert.deepEqual(loc.params, { chart: 'line', q: 'ввп gdp' });
  assert.equal(loc.path, '/t/world');
  assert.deepEqual(parseParams(`q=${'x'.repeat(201)}`), {});
  assert.equal(Object.keys(parseParams(Array.from({ length: 30 }, (_, i) => `k${i}=v`).join('&'))).length, 20);
});

test('params stringify in a stable order and round-trip', () => {
  assert.equal(stringifyParams({ region: 'europe', page: '2' }), 'page=2&region=europe');
  const params = { q: 'ВВП & GDP', region: 'europe' };
  assert.deepEqual(parseParams(stringifyParams(params)), params);
});

test('href builders', () => {
  assert.equal(hrefCatalog(), '#/');
  assert.equal(hrefCatalog('all', { q: 'gdp' }), '#/?q=gdp');
  assert.equal(hrefCatalog('economy'), '#/t/economy');
  assert.equal(hrefViz('gdp-by-country', { region: 'asia' }), '#/v/gdp-by-country?region=asia');
  assert.equal(hrefAbout(), '#/about');
  assert.deepEqual(parseHash(hrefViz('gdp-by-country', { page: '3' })), {
    route: { name: 'viz', id: 'gdp-by-country' },
    params: { page: '3' },
    path: '/v/gdp-by-country',
  });
});

console.log(`✓ router — ${passed} tests passed`);
