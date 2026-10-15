"""Build the country mix race from Ember's public annual generation release.
Usage: python3 scripts/ember-country-mix-sync.py /path/to/release.csv
Missing observations are errors, never zero. The cohort stays fixed over time.
"""
import csv
import datetime
import json
import pathlib
import sys

COUNTRIES = [('DEU', 'Deutschland'), ('FRA', 'Frankreich'), ('GBR', 'Großbritannien'),
             ('USA', 'USA'), ('CHN', 'China'), ('IND', 'Indien'), ('JPN', 'Japan'),
             ('KOR', 'Südkorea'), ('BRA', 'Brasilien'), ('CAN', 'Kanada')]
source = 'https://files.ember-energy.org/public-downloads/generation/outputs/release_generation_yearly_global.csv'
values = {}
with open(sys.argv[1]) as file:
    for row in csv.DictReader(file):
        if row['ISO 3 code'] not in dict(COUNTRIES) or row['Electricity source'] not in ('Renewables', 'Nuclear'):
            continue
        raw = row['Share of generation (%)']
        if raw != '':
            values[(row['ISO 3 code'], int(row['Year']), row['Electricity source'])] = float(raw)
end = min(max(year for code, year, kind in values if code == country) for country, _ in COUNTRIES)
years = list(range(2000, end + 1))
frames = []
for year in years:
    rows = []
    for code, _ in COUNTRIES:
        renewable = values[(code, year, 'Renewables')]
        nuclear = values[(code, year, 'Nuclear')]
        other = 100 - renewable - nuclear
        if not (0 <= renewable <= 100 and 0 <= nuclear <= 100 and other >= -0.01):
            raise ValueError(f'Invalid mix: {code} {year}')
        rows.append({'id': code, 'value': renewable, 'segments': [renewable, nuclear, max(0, other)]})
    frames.append({'year': year, 'rows': rows})
result = {'source': source, 'license': 'CC BY 4.0', 'retrievedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'countries': [{'id': code, 'name': name, 'href': None} for code, name in COUNTRIES], 'history': frames}
pathlib.Path('data/country-electricity-mix-race.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(f'{len(COUNTRIES)} countries, {years[0]}–{end}; complete observations, validated 100% totals.')

# Optional second input adds per-capita observations without changing share history.
if len(sys.argv) > 2:
    population_response = json.loads(pathlib.Path(sys.argv[2]).read_text())
    population = {(row['countryiso3code'], int(row['date'])): row['value']
                  for row in population_response[1] if row['value'] is not None}
    generation = {}
    with open(sys.argv[1]) as file:
        for row in csv.DictReader(file):
            if row['ISO 3 code'] in dict(COUNTRIES) and row['Electricity source'] in ('Renewables', 'Nuclear', 'Total generation') and row['Generation (TWh)'] != '':
                generation[(row['ISO 3 code'], int(row['Year']), row['Electricity source'])] = float(row['Generation (TWh)'])
    common_end = min(end, min(max(year for code, year in population if code == country) for country, _ in COUNTRIES))
    per_capita_frames = []
    for year in range(2000, common_end + 1):
        per_capita_rows = []
        for code, _ in COUNTRIES:
            people = population[(code, year)]
            if people <= 0:
                raise ValueError(f'Invalid population: {code} {year}')
            total = generation[(code, year, 'Total generation')]
            renewable = generation[(code, year, 'Renewables')]
            nuclear = generation[(code, year, 'Nuclear')]
            other = total - renewable - nuclear
            if min(renewable, nuclear, other) < 0:
                raise ValueError(f'Invalid generation mix: {code} {year}')
            segments = [value * 1e9 / people for value in (renewable, nuclear, other)]
            per_capita_rows.append({'id': code, 'value': segments[0], 'segments': segments,
                                   'population': people, 'generationTWh': total})
        per_capita_frames.append({'year': year, 'rows': per_capita_rows})
    result.update({'populationSource': 'https://data.worldbank.org/indicator/SP.POP.TOTL',
                   'populationUpdated': population_response[0]['lastupdated'],
                   'unit': 'kWh/person/year', 'history': per_capita_frames})
    pathlib.Path('data/country-electricity-per-capita-race.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(f'Per capita: 2000–{common_end}, annual population matched to generation.')
