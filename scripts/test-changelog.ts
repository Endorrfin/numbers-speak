// test-changelog.ts — CHANGED (S3-cl): golden tests for the CHANGELOG ↔ catalog check used by
// check:catalog (pure functions only). Run: npm test.
import assert from 'node:assert/strict';
import { linkedVizIds, missingFromChangelog } from './lib/changelog';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`✖ changelog: ${name}\n`, e);
    process.exit(1);
  }
}

const BASE = 'https://endorrfin.github.io/numbers-speak/#/v/';
const SAMPLE = [
  '## 2026‑09‑24',
  `- **Updated:** [Attacks](${BASE}air-attacks-on-ukraine?show=calendar) — a sixth angle.`,
  '## 2026‑09‑22',
  `- **New:** [Land area](${BASE}land-area) — 234 countries and territories.`,
  '- **Updated:** all pages are more compact (no link).',
  '- births-deaths-ua and #/v/ appear in prose here, but nothing links them.',
].join('\n');

test('collects linked ids, with or without a query string', () => {
  assert.deepEqual([...linkedVizIds(SAMPLE)].sort(), ['air-attacks-on-ukraine', 'land-area']);
});

test('an id mentioned only in prose is still missing', () => {
  assert.deepEqual(missingFromChangelog(['births-deaths-ua'], SAMPLE), ['births-deaths-ua']);
});

test('ids match exactly: a longer linked id does not cover a shorter one', () => {
  const text = `[x](${BASE}births-deaths-ua)`;
  assert.deepEqual(missingFromChangelog(['births-deaths', 'births-deaths-ua'], text), ['births-deaths']);
});

test('keeps input order; empty when every id is linked or nothing is published', () => {
  assert.deepEqual(missingFromChangelog(['zeta', 'land-area', 'alpha'], SAMPLE), ['zeta', 'alpha']);
  assert.deepEqual(missingFromChangelog(['land-area', 'air-attacks-on-ukraine'], SAMPLE), []);
  assert.deepEqual(missingFromChangelog([], ''), []);
});

console.log(`✓ changelog — ${passed} tests passed`);
