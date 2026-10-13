// ticks.ts — CHANGED (S3-ai1): axis ticks of angle B for the full and the zoomed-in plot (pure; unit-tested).
import type { Lang } from '../../catalog/types';
import { formatFlop, formatMonth, formatPowerOfTen } from '../../lib/format';

/** Year ticks, or months when the year has a fraction (zoomed in). */
export function formatYearTick(v: number, lang: Lang): string {
  const year = Math.floor(v + 1e-6);
  const month = Math.min(11, Math.max(0, Math.round((v - year) * 12)));
  return month === 0 ? String(year) : formatMonth(`${year}-${String(month + 1).padStart(2, '0')}`, lang);
}

/** Ticks for a zoomed-in time span: years, half-years, quarters or months. */
export function yearTicks([d0, d1]: [number, number]): number[] {
  const span = d1 - d0;
  const step = span > 6 ? 1 : span > 3 ? 0.5 : span > 1.2 ? 0.25 : 1 / 12;
  const out: number[] = [];
  for (let k = Math.ceil(d0 / step - 1e-9); k * step <= d1 + 1e-9; k++) out.push(Math.round(k * step * 1e6) / 1e6);
  return out;
}

/** Ticks for a zoomed-in log span: powers of ten (every second one past 8 orders), or 1-2-5 within an order. */
export function flopTicks([d0, d1]: [number, number]): number[] {
  const e0 = Math.log10(d0);
  const e1 = Math.log10(d1);
  if (e1 - e0 >= 2.5) {
    const step = e1 - e0 > 8 ? 2 : 1;
    const out: number[] = [];
    for (let e = Math.ceil(e0); e <= e1; e++) if (e % step === 0) out.push(10 ** e);
    return out;
  }
  const out: number[] = [];
  for (let e = Math.floor(e0); e <= Math.ceil(e1); e++) for (const m of [1, 2, 5]) if (m * 10 ** e >= d0 && m * 10 ** e <= d1) out.push(m * 10 ** e);
  return out;
}

const isPowerOfTen = (v: number): boolean => Math.abs(Math.log10(v) - Math.round(Math.log10(v))) < 1e-9;

/** A FLOP tick: '10²⁴' on a power of ten, '2.0 × 10²⁴' between (zoomed in). */
export function formatFlopTick(v: number, lang: Lang): string {
  return isPowerOfTen(v) ? formatPowerOfTen(Math.round(Math.log10(v))) : formatFlop(v, lang);
}
