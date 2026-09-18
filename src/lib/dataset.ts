// dataset.ts — tiny runtime validators for JSON datasets (no schema library: a dataset is a handful
// of fields). The same parser runs at prep time, in `check:data` and in the browser, so a bad file
// fails the build instead of drawing a wrong chart.

export class DatasetError extends Error {
  override name = 'DatasetError';
}

export function fail(where: string, message: string): never {
  throw new DatasetError(`${where}: ${message}`);
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function record(v: unknown, where: string): Record<string, unknown> {
  if (!isRecord(v)) fail(where, 'object expected');
  return v;
}

export function string(v: unknown, where: string, pattern?: RegExp): string {
  if (typeof v !== 'string' || v.trim() === '') fail(where, 'non-empty string expected');
  if (pattern && !pattern.test(v)) fail(where, `'${v}' does not match ${pattern}`);
  return v;
}

export function finite(v: unknown, where: string, min = -Infinity, max = Infinity): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(where, 'finite number expected');
  if (v < min || v > max) fail(where, `${v} is outside [${min}, ${max}]`);
  return v;
}

export function array(v: unknown, where: string, minLength = 0): unknown[] {
  if (!Array.isArray(v)) fail(where, 'array expected');
  if (v.length < minLength) fail(where, `at least ${minLength} item(s) expected`);
  return v;
}

export function oneOf<T extends string>(v: unknown, allowed: readonly T[], where: string): T {
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
    fail(where, `one of ${allowed.join(' | ')} expected, got ${JSON.stringify(v)}`);
  }
  return v as T;
}
