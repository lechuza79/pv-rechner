"""Reconcile already evidenced district solar outlines and wind models.

No research or paid API calls. Multipolygon components retain source identity;
unsupported holes are reported and the whole outline is excluded, never filled.
"""
import argparse
import copy
import datetime
import hashlib
import json
import math
import os
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import Point, Polygon, shape, GeometryCollection
from shapely.ops import transform


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''): h.update(block)
    return h.hexdigest()


def outlines(feature):
    geometry = shape(feature['geometry'])
    if geometry.is_empty or not geometry.is_valid:
        raise ValueError('invalid-geometry')
    if geometry.geom_type not in ('Polygon', 'MultiPolygon'):
        raise ValueError('unsupported-geometry-type')
    parts = [geometry] if geometry.geom_type == 'Polygon' else list(geometry.geoms)
    if any(part.interiors for part in parts):
        raise ValueError('unsupported-interior-holes; entire source outline excluded')
    return geometry, parts


def enrich(scene, register, evidence, cache, boundary, wind_evidence, terrain_protection=None):
    result = copy.deepcopy(scene)
    register = copy.deepcopy(register)
    east, north, _ = result['origin']
    metric = Transformer.from_crs(4326, 25832, always_xy=True).transform
    units = {unit['id']: unit for unit in cache['units']}
    if len(units) != len(cache['units']): raise ValueError('Duplicated solar register cache')
    terrain = result['terrain']
    left, top, right, bottom = terrain['groundBounds']
    skipped, integrated, parks, consumed = [], [], [], set()
    replacement_ids = set()
    new_fields, new_stops = [], []
    for feature in evidence['features']:
        props = feature['properties']
        source_id = props['id']
        base_id = 'osm-' + source_id.replace('/', '-')
        replacement_ids.add(base_id)
        try:
            geometry, parts = outlines(feature)
            if not boundary.covers(geometry): raise ValueError('outside-district-boundary')
            projected = transform(metric, geometry)
            x1, y1, x2, y2 = projected.bounds
            if not (left <= x1-east <= x2-east <= right and top <= north-y2 <= north-y1 <= bottom):
                raise ValueError('outside-prepared-terrain')
            matches = props['registerUnits']
            if not matches: raise ValueError('no-evidenced-register-units')
            kind = matches[0]['outlineKind']
            if kind not in ('plant', 'generator') or any(u['outlineKind'] != kind for u in matches):
                raise ValueError('inconsistent-source-kind')
            matched = []
            for match in matches:
                unit = units.get(match['unitId'])
                if unit is None or any(unit.get(k) != match.get(k) for k in ('capacityKw', 'lon', 'lat')):
                    raise ValueError('register-cache-evidence-conflict')
                if unit['id'] in consumed: raise ValueError('duplicated-register-association')
                if not geometry.covers(Point(unit['lon'], unit['lat'])):
                    raise ValueError('register-coordinate-outside-outline')
                matched.append(unit)
            ids = [u['id'] for u in matched]
            if len(set(ids)) != len(ids): raise ValueError('duplicate-units-within-outline')
            if any(u['capacityKw'] is not None and (not isinstance(u['capacityKw'], (float, int)) or not math.isfinite(u['capacityKw']) or u['capacityKw'] <= 0) for u in matched):
                raise ValueError('invalid-register-capacity')
            capacity = sum(u['capacityKw'] for u in matched) if all(u['capacityKw'] is not None for u in matched) else None
            stop_id = 'solar-source-' + source_id.replace('/', '-')
            # One destination and capacity per source, even with disjoint parts.
            anchor = projected.representative_point()
            label = props.get('name') or ('Solarpark' if kind == 'plant' else 'Solaranlage')
            if kind == 'generator': label = 'Solaranlage: ' + label
            new_stops.append(dict(id=stop_id, name=label, kind='solar', x=round(anchor.x-east,3), z=round(north-anchor.y,3),
                                  zoom=8, throughPark=True, cta='Zum Solarpark' if kind == 'plant' else 'Zur Solaranlage',
                                  capacityKw=capacity, unitIds=ids, sourceOutlineId=source_id, outlineKind=kind,
                                  capacityScope='Sum of linked register units; generator outline does not establish whole-park capacity.'))
            for index, part in enumerate(parts):
                projected_part = transform(metric, part)
                part_ids = [u['id'] for u in matched if part.covers(Point(u['lon'],u['lat']))]
                new_fields.append(dict(id=base_id if len(parts)==1 else base_id+'-part-'+str(index+1),
                                       ring=[[round(x-east,3), round(north-y,3)] for x,y in projected_part.exterior.coords],
                                       registerReferences=part_ids, sourceOutlineId=source_id,
                                       sourceGeometry=feature['geometry'], outlineKind=kind,
                                       sourceUrl=props['osmUrl'], componentIndex=index, componentCount=len(parts), stopId=stop_id))
            consumed.update(ids)
            parks.append(dict(footprintId=base_id, sourceOutlineId=source_id, outlineKind=kind,
                              capacityKw=capacity, units=matched, componentCount=len(parts)))
            integrated.append(source_id)
        except (ValueError, TypeError, KeyError) as error:
            skipped.append(dict(sourceOutlineId=source_id, reason=str(error), sourceUrl=props.get('osmUrl'),
                                geometry=feature['geometry'], registerUnits=props.get('registerUnits', [])))
    # Replace source identities, including components from a previous integration.
    removed = [field for field in result['solar'] if field.get('sourceOutlineId') in {f['properties']['id'] for f in evidence['features']} or field['id'] in replacement_ids]
    removed_stops = {f.get('stopId', 'solar-'+f['id'][len('osm-way-'):]) for f in removed}
    result['solar'] = [field for field in result['solar'] if field not in removed] + new_fields
    result['stops'] = [stop for stop in result['stops'] if stop['id'] not in removed_stops] + new_stops
    applied, conflicts = [], []
    allowed = {'typ': 'model', 'hersteller': 'manufacturer', 'rotor_m': 'rotor', 'nabenhoehe_m': 'hub', 'brutto_kw': 'ratedKw'}
    by_id = {u['mastr_nr']: u for u in register['turbines']}
    for entry in wind_evidence.get('entries', []):
        if entry.get('status') != 'verified' or entry.get('field') not in allowed: continue
        unit = by_id.get(entry['unitId'])
        if unit is None or any(unit.get(k) != v for k,v in entry['expected'].items()):
            conflicts.append(dict(unitId=entry['unitId'], reason='wind-evidence-conflict')); continue
        field = entry['field']
        if unit.get(field) and unit[field] != entry['value']:
            conflicts.append(dict(unitId=entry['unitId'], reason='wind-register-value-conflict')); continue
        unit[field] = entry['value']
        unit.setdefault('enrichmentSources', {})[field] = dict(sourceUrl=entry['sourceUrl'], evidenceFile='wind-research-evidence.json')
        turbine = next(t for t in result['turbines'] if t['id']==entry['unitId'])
        turbine[allowed[field]] = entry['value']
        if field=='rotor_m': turbine['rotorMetres'] = entry['value']
        turbine.setdefault('enrichmentSources', {})[allowed[field]] = unit['enrichmentSources'][field]
        applied.append(dict(unitId=entry['unitId'], field=field, sourceUrl=entry['sourceUrl']))
    context_clip=None
    previous = terrain['elevations']
    if len(previous) != terrain['width'] * terrain['height'] or not all((isinstance(v,(int,float)) and math.isfinite(v)) or (v is None and terrain.get('coverage')=='explicit-outer-mask') for v in previous):
        raise ValueError('Invalid prepared terrain grid')
    if terrain.get('coverage')=='explicit-outer-mask':
        import numpy as np
        from affine import Affine
        from landscape_terrain_quality import mask_uncovered_outer_surface, assert_measured_points, clip_context_to_measured_surface
        if terrain_protection is None:raise ValueError('Masked terrain requires sourced protection geometry')
        array=np.asarray(previous,dtype=float).reshape(terrain['height'],terrain['width'])
        dx=(right-left)/(terrain['width']-1);dz=(bottom-top)/(terrain['height']-1)
        affine=Affine(dx,0,east+left-dx/2,0,-dz,north-top+dz/2)
        required=GeometryCollection([transform(metric,boundary),terrain_protection])
        mask_uncovered_outer_surface(array,affine,None,required)
        points=[(east+t['x'],north-t['z']) for t in result['turbines']+result['stops']]
        points += [(east+x,north-z) for field in result['solar'] for x,z in field['ring']]
        points += [(east+p[0],north-p[2]) for b in result['buildings'] for surface in b['surfaces'] for ring in [surface['points']]+surface.get('holes',[]) for p in ring]
        assert_measured_points(array,affine,points)
        result['context'],context_clip=clip_context_to_measured_surface(result,transform(metric,boundary))
    rounded = [round(float(value),3) if value is not None else None for value in previous]
    max_error = max((abs(a-b) for a,b in zip(previous,rounded) if a is not None),default=0)
    if max_error > .000501: raise ValueError('Unexpected terrain quantization loss')
    terrain['elevations'] = rounded
    return result, register, dict(integratedOutlines=integrated, linkedUnits=len(consumed), skippedOutlines=skipped,
                                 windEnrichments=applied, windConflicts=conflicts, parks=parks,
                                 terrainQuantizationMaxErrorMetres=max_error, terrainSampleCount=len(rounded),contextSurfaceClip=context_clip,
                                 terrainResolutionUnchanged=True, buildingHeightsUnchanged=True)


def write_staged(path, value):
    temporary = path.with_suffix(path.suffix+'.next')
    with temporary.open('w') as stream:
        json.dump(value, stream, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
        stream.flush(); os.fsync(stream.fileno())
    return temporary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--district', required=True)
    args = parser.parse_args()
    out = args.root/'public/geo/landscape-tours'/args.district
    read = lambda name: json.loads((out/name).read_text())
    evidence = read('solar-enrichment.geo.json')
    config = read('preparation.json') if (out/'preparation.json').exists() else {}
    cache_path = args.root/config.get('solarRegisterCache','inputs/ground-solar-register.json')
    if not cache_path.resolve().is_relative_to((args.root/'inputs').resolve()): raise ValueError('Solar cache must stay within inputs')
    cache = json.loads(cache_path.read_text())
    wind = read('wind-research-evidence.json') if (out/'wind-research-evidence.json').exists() else {'entries': []}
    old_size = (out/'scene.json').stat().st_size
    protection=read('terrain-protection.geo.json') if config.get('allowOuterTerrainGaps') else None
    if protection and protection.get('crs')!='ETRS89_UTM32':raise ValueError('Unsupported terrain protection reference')
    scene, register, report = enrich(read('scene.json'),read('register.json'),evidence,cache,shape(read('boundary.geo.json')['geometry']),wind,shape(protection['geometry']) if protection else None)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    report.update(checkedAt=now, sourceEvidenceSha256=digest(out/'solar-enrichment.geo.json'),
                  windEvidenceSha256=digest(out/'wind-research-evidence.json') if (out/'wind-research-evidence.json').exists() else None,
                  previousSceneBytes=old_size, status='ready', scope='Evidenced solar geometries and wind fields; no completeness or browser-performance claim.')
    retained_ids = {f['id'] for f in scene['solar'] if not f.get('sourceOutlineId')}
    older_solar = read('solar-register.json') if (out/'solar-register.json').exists() else {'parks': []}
    report['parks'] += [p for p in older_solar.get('parks', []) if p['footprintId'] in retained_ids]
    linked_ids = [u['id'] for p in report['parks'] for u in p['units']]
    if len(set(linked_ids)) != len(linked_ids): raise ValueError('Duplicate retained solar register association')
    report['linkedUnits'] = len(linked_ids)
    solar_register = dict(checkedAt=cache['checkedAt'], sourceUrl=cache['sourceUrl'], parks=report['parks'], ambiguousUnits=[],
                          modelLimitations='Only linked register units; generator footprints are not complete parks; shared municipal weather remains illustrative.',
                          sceneIntegration='complete')
    gaps = read('data-gaps.json')
    linked = {u['id'] for p in report['parks'] for u in p['units']}
    applied = {(u['unitId'],u['field']) for u in report['windEnrichments']}
    gaps['gaps'] = [g for g in gaps['gaps'] if not (g['kind']=='solar-outline-or-link' and g.get('unitId') in linked) and not (g['kind']=='wind-field' and (g.get('unitId'),g.get('field')) in applied)]
    gaps['gaps'] = [g for g in gaps['gaps'] if g['kind'] != 'solar-unsupported-outline']
    gaps['gaps'] += [dict(kind='solar-unsupported-outline',status='research-required',sourceOutlineId=g['sourceOutlineId'],reason=g['reason']) for g in report['skippedOutlines']]
    gaps['checkedAt'] = now
    audit = read('provenance.json')
    audit['showcaseEnrichment'] = {k:v for k,v in report.items() if k != 'parks'}
    audit['solarFootprints'] = len(scene['solar'])
    audit['solarRegister'] = dict(checkedAt=cache['checkedAt'], evidenceFile='solar-register.json', sourceUrl=cache['sourceUrl'],
                                 linkedOutlines=len(report['parks']), unitCount=report['linkedUnits'], generatorCapacityScope='Linked units only; not a complete park claim.')
    audit['checkedAt'] = now
    report['remainingGapCount'] = len(gaps['gaps'])
    # Stage and validate all documents before replacing any existing output.
    documents = [('register.json',register),('solar-register.json',solar_register),('data-gaps.json',gaps),('scene.json',scene)]
    staged = [(out/name, write_staged(out/name,value)) for name,value in documents]
    scene_bytes = next(temp.stat().st_size for path,temp in staged if path.name=='scene.json')
    report['sceneBytes'] = scene_bytes
    audit['showcaseEnrichment'].update(sceneBytes=scene_bytes, remainingGapCount=report['remainingGapCount'])
    staged += [(out/'provenance.json',write_staged(out/'provenance.json',audit)),(out/'showcase-integration.json',write_staged(out/'showcase-integration.json',report))]
    # Scene switches last: incomplete staging never replaces the working scene.
    for path,temp in sorted(staged,key=lambda item:item[0].name=='scene.json'):
        os.replace(temp,path)
    print(json.dumps({k:v for k,v in report.items() if k not in ('parks','skippedOutlines')},ensure_ascii=False),flush=True)


if __name__=='__main__': main()
