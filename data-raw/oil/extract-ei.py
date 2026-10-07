#!/usr/bin/env python3
"""extract-ei.py — CHANGED (S3-oil): EI Statistical Review 2026, narrow-format workbook -> ei-2026-oil-consumption.csv.

Usage: python3 extract-ei.py "<Statistical Review of World Energy Narrow format.xlsx>" <out.csv>
Keeps the variable `oilcons_kbd` (oil consumption, thousand barrels daily — inland demand + international bunkers +
refinery fuel and loss; biofuels excluded) for every row the EI publishes: countries (ISO3 code), the former USSR
(SUN, 1965–1984) and the aggregates (codes T-… / O-… / WLD). One row per country, one column per year 1965–2025;
an empty cell = the EI publishes no value for that year. Values are rounded to 0.1 kb/d (the workbook stores
floats). Needs `openpyxl`. Prints the sha256 of the input and the output.
"""
import csv
import hashlib
import sys

import openpyxl

SRC, OUT = sys.argv[1], sys.argv[2]
VAR = 'oilcons_kbd'

wb = openpyxl.load_workbook(SRC, read_only=True)
rows = wb['TES Narrow File'].iter_rows(values_only=True)
header = next(rows)
col = {name: i for i, name in enumerate(header)}
series = {}
years = set()
for r in rows:
    if r[col['Var']] != VAR:
        continue
    key = (r[col['Country']], r[col['ISO3166_alpha3']])
    year = int(r[col['Year']])
    years.add(year)
    value = r[col['Value']]
    series.setdefault(key, {})[year] = None if value is None else round(float(value), 1)

span = list(range(min(years), max(years) + 1))
with open(OUT, 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f, lineterminator='\n')
    w.writerow(['name', 'iso3'] + span)
    for (name, iso3), values in sorted(series.items(), key=lambda kv: kv[0][0]):
        w.writerow([name, iso3] + ['' if values.get(y) is None else f'{values[y]:.1f}' for y in span])


def sha(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


print(f'{len(series)} rows, {span[0]}–{span[-1]}')
print(f'{sha(SRC)}  input\n{sha(OUT)}  {OUT}')
