#!/usr/bin/env python3
"""extract-wb.py — CHANGED (S3-el): World Bank API → wb-access.csv (stdlib only, run with -I).

    python3 -I extract-wb.py

Two WDI indicators, every economy and aggregate, 2000–2024 (CC BY 4.0, https://data.worldbank.org/):
    EG.ELC.ACCS.ZS  Access to electricity (% of population) — WB from the IEA/IRENA/UNSD/WB/WHO Tracking SDG 7 report
    SP.POP.TOTL     Population, total — so "people without electricity" uses the same source and year as the share

Writes wb-access.csv: iso3, name, year, access, population (empty = no value). Prints each indicator's
`lastupdated`, which README.md records. Aggregates (WLD, SSF, …) are kept: the page quotes the World Bank's own
world and Sub-Saharan Africa figures instead of re-adding countries.
"""
import csv
import json
import os
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = 'https://api.worldbank.org/v2/country/all/indicator/{}?format=json&date=2000:2024&per_page=20000'
INDICATORS = {'access': 'EG.ELC.ACCS.ZS', 'population': 'SP.POP.TOTL'}


def fetch(indicator):
    with urllib.request.urlopen(API.format(indicator), timeout=60) as r:
        meta, rows = json.load(r)
    if meta.get('pages') != 1:
        sys.exit(f'{indicator}: expected one page, got {meta.get("pages")}')
    print(f'{indicator}: {len(rows)} rows, lastupdated {meta.get("lastupdated")}')
    return rows


def main():
    table = {}
    for col, ind in INDICATORS.items():
        for r in fetch(ind):
            iso3 = r.get('countryiso3code') or ''
            if not iso3:
                continue
            k = (iso3, int(r['date']))
            rec = table.setdefault(k, {'iso3': iso3, 'name': r['country']['value'], 'year': k[1], 'access': '', 'population': ''})
            if r['value'] is not None:
                rec[col] = repr(float(r['value'])) if col == 'access' else str(int(r['value']))
    out = os.path.join(HERE, 'wb-access.csv')
    with open(out, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=['iso3', 'name', 'year', 'access', 'population'], lineterminator='\n')
        w.writeheader()
        for k in sorted(table):
            w.writerow(table[k])
    print(f'wb-access.csv: {len(table)} rows')


if __name__ == '__main__':
    main()
