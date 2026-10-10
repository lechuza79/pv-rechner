"""Inventory prepared landscape gaps; refresh missing wind fields from exact public IDs.

No paid API, model inference or manufacturer-name dimension guesses are used.
Unknown values remain unknown. Evidence contains only public technical fields.
"""
import argparse, datetime, json
from pathlib import Path
import requests
from shapely.geometry import Point, shape

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--root', type=Path, required=True)
parser.add_argument('--district', required=True)
parser.add_argument('--refresh-wind', action='store_true')
args = parser.parse_args()
out = args.root / 'public/geo/landscape-tours' / args.district
now = datetime.datetime.now(datetime.timezone.utc).isoformat()
api = 'https://www.marktstammdatenregister.de/MaStR/Einheit/EinheitJson/GetErweiterteOeffentlicheEinheitStromerzeugung'

def read(name):
    path = out / name
    return json.loads(path.read_text()) if path.exists() else None

def save(name, value):
    path = out / name
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')))
    temporary.replace(path)

register = read('register.json')
evidence = read('wind-field-evidence.json') or {'units': {}}
research = read('wind-research-evidence.json') or {'entries': []}
fields = {'rotor_m': 'RotordurchmesserWindenergieanlage', 'nabenhoehe_m': 'NabenhoeheWindenergieanlage', 'brutto_kw': 'Bruttoleistung', 'hersteller': 'HerstellerWindenergieanlageBezeichnung', 'typ': 'Typenbezeichnung'}
gaps = []
for unit in register['turbines']:
    missing = [key for key in fields if not unit.get(key)]
    if missing and args.refresh_wind:
        try:
            response = requests.get(api, params={'page': 1, 'pageSize': 5, 'filter': "MaStR-Nr. der Einheit~eq~'" + unit['mastr_nr'] + "'"}, timeout=(15, 60))
            response.raise_for_status()
            payload = response.json()
            if payload.get('Errors') or payload.get('Total') != 1:
                raise ValueError('Register did not return exactly one unit')
            row = payload['Data'][0]
            if row['MaStRNummer'] != unit['mastr_nr'] or abs(row['Breitengrad'] - unit['lat']) > 0.00001 or abs(row['Laengengrad'] - unit['lon']) > 0.00001:
                raise ValueError('Register identity or coordinate mismatch')
            values = {key: row.get(remote) for key, remote in fields.items()}
            evidence['units'][unit['mastr_nr']] = {'checkedAt': now, 'sourceUrl': api, 'lat': row['Breitengrad'], 'lon': row['Laengengrad'], 'values': values}
            for key in missing:
                value = values[key]
                if value and (key not in ['rotor_m', 'nabenhoehe_m', 'brutto_kw'] or isinstance(value, (int, float)) and value > 0):
                    unit[key] = value
        except (requests.RequestException, ValueError, KeyError, TypeError) as error:
            gaps.append({'kind': 'register-read', 'unitId': unit['mastr_nr'], 'status': 'retry', 'reason': str(error)})
    for entry in research['entries']:
        if entry.get('status') != 'verified' or entry['unitId'] != unit['mastr_nr']:
            continue
        if not all(unit.get(key) == value for key, value in entry['expected'].items()):
            gaps.append({'kind': 'research-evidence-conflict', 'unitId': unit['mastr_nr'], 'status': 'research-required'})
            continue
        key = entry['field']
        if key in fields and not unit.get(key):
            unit[key] = entry['value']
            unit.setdefault('enrichmentSources', {})[key] = {'sourceUrl': entry['sourceUrl'], 'evidenceFile': 'wind-research-evidence.json'}
    for key in fields:
        if not unit.get(key):
            gaps.append({'kind': 'wind-field', 'unitId': unit['mastr_nr'], 'field': key, 'status': 'research-required', 'sourceEvidence': 'wind-field-evidence.json', 'nextStep': 'Find a unit-specific authority or manufacturer document; do not infer dimensions from the model name.'})
save('register.json', register)
save('wind-field-evidence.json', evidence)
solar = read('solar-register.json')
if solar:
    for park in solar.get('parks', []):
        if park['capacityKw'] is None:
            gaps.append({'kind': 'solar-register-link', 'footprintId': park['footprintId'], 'status': 'research-required', 'reason': 'No complete unambiguous capacity association', 'sourceEvidence': 'solar-register.json'})
    for unit in solar.get('ambiguousUnits', []):
        gaps.append({'kind': 'solar-overlap', 'unitId': unit, 'status': 'research-required'})
    cache = args.root / 'inputs/ground-solar-register.json'
    boundary = read('boundary.geo.json')
    if cache.exists() and boundary:
        polygon = shape(boundary['geometry'])
        linked = {u['id'] for p in solar.get('parks', []) for u in p['units']}
        for unit in json.loads(cache.read_text())['units']:
            if unit['lon'] is not None and unit['lat'] is not None and polygon.covers(Point(unit['lon'], unit['lat'])) and unit['id'] not in linked:
                gaps.append({'kind': 'solar-outline-or-link', 'unitId': unit['id'], 'lat': unit['lat'], 'lon': unit['lon'], 'capacityKw': unit['capacityKw'], 'status': 'research-required', 'reason': 'Active ground-solar register unit inside district has no unique mapped footprint association; do not invent a park outline.'})
else:
    gaps.append({'kind': 'solar-audit', 'status': 'pending-preparation'})
scene = read('scene.json')
if not scene:
    gaps.append({'kind': 'geometry-audit', 'status': 'pending-preparation'})
else:
    if not scene.get('buildings'):
        gaps.append({'kind': 'buildings', 'status': 'research-required'})
# Live weather availability and rendered geometry require a separate preview gate.
save('data-gaps.json', {'checkedAt': now, 'scope': 'Wind technical fields, solar register links and missing park outlines, prepared geometry availability. Not a claim of complete real-world inventory.', 'gaps': gaps, 'previewChecksRequired': ['Live hub-height wind availability', 'Building and terrain coverage at every flight destination', 'Visitor rendering performance', 'Source attribution and municipal boundary acceptance']})
print('data gaps', len(gaps), flush=True)
