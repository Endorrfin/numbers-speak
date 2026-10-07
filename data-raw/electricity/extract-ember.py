#!/usr/bin/env python3
"""extract-ember.py — CHANGED (S3-el): Ember's two yearly long-format files → the narrow CSVs prep.ts reads.

Usage (stdlib only, run with -I):
    python3 -I extract-ember.py <yearly_full_release_long_format.csv> <europe_yearly_full_release_long_format.csv>

Downloads (CC BY 4.0, https://ember-energy.org/data/yearly-electricity-data/):
    https://storage.googleapis.com/emb-prod-bkt-publicdata/public-downloads/yearly_full_release_long_format.csv
    https://storage.googleapis.com/emb-prod-bkt-publicdata/public-downloads/europe_yearly_full_release_long_format.csv

Writes next to this script:
    ember-yearly.csv          every "Country or economy" + World, 2000–latest: generation by fuel (TWh), total,
                              demand (TWh), demand per person (MWh), CO2 intensity (gCO2/kWh), net imports (TWh)
    ember-europe-ukraine.csv  Ukraine from Ember's European file, which starts in 1990 (the global file starts in 2000)

The two files name some variables differently ("Other Fossil" / "Other fossil", "Total Generation" / "Total
generation"), so variables are matched case-insensitively. A year whose fuels do not add up to its total within
0.5 % (or 0.05 TWh) fails, as does a missing total — the CSVs never carry a half-read year.
"""
import csv
import hashlib
import os
import sys

FUELS = ['coal', 'gas', 'other fossil', 'nuclear', 'hydro', 'wind', 'solar', 'bioenergy', 'other renewables']
COLUMNS = ['iso3', 'area', 'year', *[f.replace(' ', '_') for f in FUELS], 'total', 'demand', 'demand_pc', 'co2_intensity', 'net_imports']
HERE = os.path.dirname(os.path.abspath(__file__))


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def key_of(row):
    """Column name for one long-format row, or None when the row is not one we keep."""
    cat, var, unit = row['Category'].lower(), row['Variable'].lower(), row['Unit']
    if cat == 'electricity generation' and unit == 'TWh':
        if var == 'total generation':
            return 'total'
        if var in FUELS:
            return var.replace(' ', '_')
    if cat == 'electricity demand' and var == 'demand' and unit == 'TWh':
        return 'demand'
    if cat == 'electricity demand' and var == 'demand per capita' and unit == 'MWh':
        return 'demand_pc'
    if cat == 'power sector emissions' and var == 'co2 intensity' and unit == 'gCO2/kWh':
        return 'co2_intensity'
    if cat == 'electricity imports' and var == 'net imports' and unit == 'TWh':
        return 'net_imports'
    return None


def collect(path, keep):
    table = {}
    with open(path, newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            if not keep(row):
                continue
            col = key_of(row)
            if col is None or row['Value'] == '':
                continue
            iso3 = row['ISO 3 code'] or 'WLD'
            k = (iso3, int(row['Year']))
            rec = table.setdefault(k, {'iso3': iso3, 'area': row['Area'], 'year': k[1]})
            if col in rec and float(rec[col]) != float(row['Value']):
                sys.exit(f'{path}: two values for {k} {col}')
            rec[col] = row['Value']
    return table


def check(table, where):
    problems = []
    for (iso3, year), rec in table.items():
        if 'total' not in rec:
            problems.append(f'{where}: {iso3} {year} has no total generation')
            continue
        fuels = sum(float(rec.get(f.replace(' ', '_'), 0) or 0) for f in FUELS)
        total = float(rec['total'])
        if abs(fuels - total) > max(0.05, total * 0.005):
            problems.append(f'{where}: {iso3} {year} fuels add up to {fuels:.2f}, total {total:.2f}')
    if problems:
        sys.exit('\n'.join(problems[:20]))


def write(name, table):
    out = os.path.join(HERE, name)
    with open(out, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS, lineterminator='\n')
        w.writeheader()
        for k in sorted(table):
            w.writerow({c: table[k].get(c, '') for c in COLUMNS})
    print(f'{name}: {len(table)} rows')


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    yearly, europe = sys.argv[1], sys.argv[2]
    for p in (yearly, europe):
        print(f'{os.path.basename(p)} sha256 {sha256(p)}')

    world = collect(yearly, lambda r: r['Area type'] == 'Country or economy' or r['Area'] == 'World')
    check(world, 'yearly')
    write('ember-yearly.csv', world)

    ukraine = collect(europe, lambda r: r['ISO 3 code'] == 'UKR')
    check(ukraine, 'europe')
    write('ember-europe-ukraine.csv', ukraine)


if __name__ == '__main__':
    main()
