"""Offline preparation queue using public cached inputs; never publishes a scene."""
import argparse
import datetime as dt
import fcntl
import hashlib
import json
import math
from pathlib import Path
import shutil
import sqlite3
from collections import defaultdict


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix('.next')
    tmp.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False))
    tmp.replace(path)


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def connect(root):
    path = root / 'queue/preparation.sqlite'
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    db.execute('CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)')
    db.execute('CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,payload TEXT NOT NULL,status TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,error TEXT,updated_at TEXT NOT NULL)')
    return db


def decode_gpkg(blob):
    from shapely import wkb
    if blob[:2] != b'GP' or blob[2] != 0:
        raise ValueError('Unsupported GeoPackage geometry')
    envelope = (blob[3] >> 1) & 7
    sizes = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}
    if envelope not in sizes or blob[3] & 16:
        raise ValueError('Empty or invalid GeoPackage geometry')
    return wkb.loads(blob[8 + sizes[envelope]:])


def classify(unit, tree, geometries, ids, project):
    from shapely.geometry import Point
    lon, lat = unit.get('lon'), unit.get('lat')
    if not all(isinstance(v, (float, int)) and not isinstance(v, bool) and math.isfinite(v) for v in (lon, lat)) or not (-180 <= lon <= 180 and -90 <= lat <= 90):
        return None, 'missing-or-invalid-coordinate', None
    x, y = project(lon, lat)
    point = Point(x, y)
    hits = [int(i) for i in tree.query(point) if geometries[int(i)].covers(point)]
    choices = {ids[i] for i in hits}
    if len(choices) != 1:
        return None, 'outside-boundaries' if not choices else 'ambiguous-boundary', None
    ags = next(iter(choices))
    distance = min(geometries[i].boundary.distance(point) for i in hits)
    return ags, 'boundary-review-required' if distance < 100 else 'provisional-coordinate-assignment', round(distance, 1)


def seed(root, db):
    from shapely.strtree import STRtree
    from shapely.ops import unary_union
    from pyproj import Transformer
    paths = [root / 'inputs/national-register' / (kind + '.json') for kind in ('wind', 'solar')]
    gpkg = root / 'inputs/DE_VG250.gpkg'
    hashes = {p.name: digest(p) for p in paths + [gpkg]}
    fingerprint = json.dumps(hashes, sort_keys=True)
    previous = db.execute("SELECT value FROM meta WHERE key='sourceFingerprint'").fetchone()
    if previous and previous[0] == fingerprint:
        return
    inputs = [json.loads(p.read_text()) for p in paths]
    for data, kind in zip(inputs, ('wind', 'solar')):
        if data.get('status') != 'complete' or data.get('kind') != kind or data.get('count') != len(data.get('units', [])):
            raise ValueError('Complete national source required: ' + kind)
        if len({u['id'] for u in data['units']}) != data['count']:
            raise ValueError('Duplicate source identifiers')
    geo = sqlite3.connect('file:' + str(gpkg) + '?mode=ro', uri=True)
    if geo.execute("SELECT srs_id FROM gpkg_geometry_columns WHERE table_name='vg250_gem'").fetchone() != (25832,):
        raise ValueError('Unexpected boundary coordinate reference')
    grouped, names = defaultdict(list), {}
    for ags, name, blob in geo.execute('SELECT AGS,GEN,geom FROM vg250_gem'):
        if not ags or len(ags) != 8 or not ags.isdigit():
            raise ValueError('Invalid municipality identifier')
        geometry = decode_gpkg(blob)
        if not geometry.is_valid or geometry.is_empty:
            raise ValueError('Invalid supplied boundary: ' + ags)
        grouped[ags].append(geometry)
        names[ags] = name
    geo.close()
    ids = sorted(grouped)
    geometries = [unary_union(grouped[ags]) for ags in ids]
    tree = STRtree(geometries)
    project = Transformer.from_crs(4326, 25832, always_xy=True).transform
    assigned, leads, unresolved = defaultdict(list), defaultdict(list), []
    for data in inputs:
        for unit in data['units']:
            ags, quality, distance = classify(unit, tree, geometries, ids, project)
            record = dict(unit, coordinateMunicipality=ags, assignmentStatus=quality, boundaryDistanceMetres=distance)
            if ags:
                assigned[ags].append(record)
            else:
                unresolved.append(record)
            registered = str(unit.get('municipalityCode') or '')
            if registered in names and registered != ags:
                leads[registered].append(dict(unitId=unit['id'], kind=unit['kind'], coordinateMunicipality=ags, reason=quality))
    source = dict(hashes=hashes, preparedAt=now(), register=[{k: d.get(k) for k in ('kind', 'checkedAt', 'sourceUrl', 'count')} for d in inputs],
                  boundary='BKG VG250; generalized administrative geometry, provisional only',
                  membership='Coordinate-based candidates; register municipality retained independently; no economic ownership claim')
    with db:
        db.execute('DELETE FROM jobs')
        for ags in ids:
            payload = dict(municipality=ags, name=names[ags], units=assigned[ags], registerLeads=leads[ags], sources=source)
            db.execute('INSERT INTO jobs(id,payload,status,updated_at) VALUES(?,?,?,?)', (ags, json.dumps(payload, allow_nan=False), 'pending', now()))
        db.execute("INSERT OR REPLACE INTO meta VALUES('sourceFingerprint',?)", (fingerprint,))
        db.execute("INSERT OR REPLACE INTO meta VALUES('unassigned',?)", (json.dumps(dict(sources=source, units=unresolved), allow_nan=False),))
    print('Queued municipalities:', len(ids), 'Unassigned records:', len(unresolved), flush=True)


def prepare(payload):
    gaps = []
    for unit in payload['units']:
        fields = ('hubHeightM', 'rotorDiameterM', 'capacityKw', 'manufacturer', 'model') if unit['kind'] == 'wind' else ('capacityKw',)
        for field in fields:
            if unit.get(field) is None:
                gaps.append(dict(kind='missing-register-field', unitId=unit['id'], field=field))
        if unit['assignmentStatus'] == 'boundary-review-required':
            gaps.append(dict(kind='official-boundary-verification', unitId=unit['id']))
        if unit['kind'] == 'solar':
            gaps.append(dict(kind='solar-outline-and-register-link', unitId=unit['id']))
    if payload['registerLeads']:
        gaps.append(dict(kind='register-coordinate-discrepancy', count=len(payload['registerLeads'])))
    return dict(payload, stageReady=False, status='inventory-ready-needs-geometry', gaps=gaps,
                pending=['official-boundary-verification', 'terrain-and-building-source-adapter', 'solar-outline-validation', 'scene-generation-and-browser-acceptance'],
                updatedAt=now())


def run_batch(root, db, limit):
    # A single host lock guarantees that recovered jobs are no longer executing.
    with db:
        db.execute("UPDATE jobs SET status='pending' WHERE status='processing'")
    completed = 0
    for ags, raw in db.execute("SELECT id,payload FROM jobs WHERE status='pending' ORDER BY CASE WHEN substr(id,1,5) IN ('07335','03458','09679') THEN 0 ELSE 1 END,id LIMIT ?", (limit,)).fetchall():
        if shutil.disk_usage(root).free < 2 * 1024**3:
            raise RuntimeError('Less than 2 GiB free; no automatic storage purchase')
        with db:
            db.execute("UPDATE jobs SET status='processing',attempts=attempts+1,updated_at=? WHERE id=?", (now(), ags))
        try:
            result = prepare(json.loads(raw))
            atomic_json(root / 'prepared-inventory' / ags / 'inventory.json', result)
            with db:
                db.execute("UPDATE jobs SET status='needs-geometry',error=NULL,updated_at=? WHERE id=?", (now(), ags))
            completed += 1
        except Exception as error:
            with db:
                db.execute("UPDATE jobs SET status=CASE WHEN attempts<3 THEN 'pending' ELSE 'failed' END,error=?,updated_at=? WHERE id=?", (str(error), now(), ags))
    counts = dict(db.execute('SELECT status,count(*) FROM jobs GROUP BY status'))
    atomic_json(root / 'logs/preparation-queue-status.json', dict(updatedAt=now(), counts=counts, preparedThisRun=completed, stageReady=False, nextStep='Geometry/source adapters required; no publication and no model research'))
    value = db.execute("SELECT value FROM meta WHERE key='unassigned'").fetchone()
    if value:
        atomic_json(root / 'prepared-inventory/unassigned.json', json.loads(value[0]))
    print('Queue:', counts, 'Prepared this run:', completed, flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--batch', type=int, default=250)
    args = parser.parse_args()
    if not 1 <= args.batch <= 1000:
        raise ValueError('Batch must be between 1 and 1000')
    args.root.joinpath('queue').mkdir(parents=True, exist_ok=True)
    with (args.root / 'queue/worker.lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print('Another queue worker is active'); return
        db = connect(args.root)
        try:
            # Never seed from mixed generations while the national fetch replaces files.
            with (args.root / 'logs/national-register.lock').open('a') as source_lock:
                try:
                    fcntl.flock(source_lock, fcntl.LOCK_SH | fcntl.LOCK_NB)
                    source_status = args.root / 'logs/national-register-status.json'
                    if source_status.exists() and json.loads(source_status.read_text()).get('status') == 'complete':
                        seed(args.root, db)
                    else:
                        print('Keeping previous queue: register refresh is incomplete', flush=True)
                except BlockingIOError:
                    print('Keeping previous queue while register refresh is active', flush=True)
            run_batch(args.root, db, args.batch)
        finally:
            db.close()


if __name__ == '__main__':
    main()
