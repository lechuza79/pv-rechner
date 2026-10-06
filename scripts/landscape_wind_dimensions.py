"""Complete missing turbine dimensions in prepared landscape scenes.

The register leaves hub height or rotor diameter empty for some units. Without
both values the stage can only draw a ground marker. Missing values are taken
from the median of comparable turbines in all prepared scenes: same model first,
otherwise the same rated capacity (+/-10 %). Register values are never
overwritten, and every filled value names its method and peer count, both in
the scene and in data-gaps.json.

LoD2 building data also models turbine towers as buildings. Drawn next to our
own turbine they appear as a bare cylinder beside it, often with a different
height. Slim, tall building bodies standing on a turbine position are removed
and listed in data-gaps.json.
"""
import math
import argparse
import json
import re
import statistics
from pathlib import Path

# Same model: two installations already bound the variant; capacity alone needs more.
MIN_PEERS = {'same-model-median': 2, 'same-capacity-median': 3}
CAPACITY_TOLERANCE = .10
TOWER_RADIUS = 15        # metres between building centre and turbine position
TOWER_MAX_FOOTPRINT = 16 # widest tower base or foundation ring seen in LoD2
TOWER_MIN_HEIGHT = 20    # transformer stations and sheds stay

FIELDS = (('hub', 'hubMetres'), ('rotorMetres', 'rotorMetres'))


def model_key(model):
    return re.sub(r'[^a-z0-9]', '', (model or '').lower())


def complete(turbine):
    return bool(turbine.get('hub')) and bool(turbine.get('rotorMetres')) and not turbine.get('dimensionEstimates')


def estimate(turbine, pool):
    """Return {field: (value, method, peers)} for missing fields; empty if nothing is estimable."""
    found = {}
    key = model_key(turbine.get('model'))
    same_model = [t for t in pool if key and model_key(t.get('model')) == key]
    kw = turbine.get('ratedKw')
    same_capacity = [t for t in pool if kw and t.get('ratedKw') and abs(t['ratedKw'] - kw) <= kw * CAPACITY_TOLERANCE]
    for field, label in FIELDS:
        if turbine.get(field):
            continue
        for method, peers in (('same-model-median', same_model), ('same-capacity-median', same_capacity)):
            values = [t[field] for t in peers]
            if len(values) >= MIN_PEERS[method]:
                found[field] = (round(float(statistics.median(values)), 1), method, len(values))
                break
    return found


def tower_duplicates(scene):
    turbines = scene.get('turbines') or []
    if not turbines:
        return []
    found = []
    for building in scene.get('buildings') or []:
        points = [p for surface in building['surfaces'] for p in surface['points']]
        xs, ys, zs = [p[0] for p in points], [p[1] for p in points], [p[2] for p in points]
        x, z = (max(xs) + min(xs)) / 2, (max(zs) + min(zs)) / 2
        footprint = max(max(xs) - min(xs), max(zs) - min(zs))
        nearest = min(turbines, key=lambda t: math.hypot(x - t['x'], z - t['z']))
        if (math.hypot(x - nearest['x'], z - nearest['z']) <= TOWER_RADIUS and footprint <= TOWER_MAX_FOOTPRINT
                and max(ys) - min(ys) >= TOWER_MIN_HEIGHT):
            found.append(dict(buildingId=building['id'], unitId=nearest['id'], heightMetres=round(max(ys) - min(ys), 1)))
    return found


def remove_towers(scene):
    towers = tower_duplicates(scene)
    ids = {t['buildingId'] for t in towers}
    scene['buildings'] = [b for b in scene['buildings'] if b['id'] not in ids]
    return towers


def apply(scene, pool):
    filled = []
    for turbine in scene.get('turbines') or []:
        if turbine.get('hub') and turbine.get('rotorMetres'):
            continue
        result = estimate(turbine, pool)
        if not result:
            continue
        notes = {}
        for field, (value, method, peers) in result.items():
            turbine[field] = value
            if field == 'rotorMetres':
                turbine['rotor'] = value
            notes[field] = dict(method=method, peers=peers)
        turbine['dimensionEstimates'] = notes
        filled.append(dict(unitId=turbine['id'], model=turbine.get('model'), ratedKw=turbine.get('ratedKw'), estimates=notes,
                           hub=turbine.get('hub'), rotorMetres=turbine.get('rotorMetres')))
    return filled


REGISTER_FIELD = {'hub': 'nabenhoehe_m', 'rotorMetres': 'rotor_m'}


def mark_gaps(gaps, filled):
    """Keep each register gap visible, but record the estimate that replaced it on stage."""
    entries = gaps.setdefault('gaps', [])
    for item in filled:
        for field, note in item['estimates'].items():
            register_field = REGISTER_FIELD[field]
            entry = next((g for g in entries if g.get('kind') == 'wind-field' and g.get('unitId') == item['unitId']
                          and g.get('field') == register_field), None)
            if entry is None:
                entry = dict(kind='wind-field', unitId=item['unitId'], field=register_field)
                entries.append(entry)
            entry.update(status='estimated-from-comparable-turbines', value=item[field], method=note['method'], peers=note['peers'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True, help='Directory containing one folder per prepared place')
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    scenes = {p.parent.name: json.loads(p.read_text()) for p in sorted(args.root.glob('*/scene.json'))}
    pool = [t for s in scenes.values() for t in s.get('turbines') or [] if complete(t)]
    remaining = 0
    for place, scene in scenes.items():
        filled = apply(scene, pool)
        towers = remove_towers(scene)
        missing = [t['id'] for t in scene.get('turbines') or [] if not (t.get('hub') and t.get('rotorMetres'))]
        remaining += len(missing)
        if not filled and not missing and not towers:
            continue
        print(place, 'filled', len(filled), 'still missing', len(missing), 'tower buildings removed', len(towers))
        if args.write and (filled or towers):
            (args.root / place / 'scene.json').write_text(json.dumps(scene, ensure_ascii=False, separators=(',', ':'), allow_nan=False))
            gaps_path = args.root / place / 'data-gaps.json'
            gaps = json.loads(gaps_path.read_text()) if gaps_path.exists() else {'gaps': []}
            mark_gaps(gaps, filled)
            if towers:
                previous = gaps.get('removedTowerBuildings') or []
                known = {t['buildingId'] for t in previous}
                gaps['removedTowerBuildings'] = previous + [t for t in towers if t['buildingId'] not in known]
            gaps_path.write_text(json.dumps(gaps, ensure_ascii=False, separators=(',', ':')))
    print('turbines still without dimensions:', remaining)


if __name__ == '__main__':
    main()
