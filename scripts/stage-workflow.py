"""Prepare a NEW municipal stage from the shared cached sources, without publishing.

Standard-library entry point. Heavy geospatial dependencies are only needed by
run, which belongs on the existing preparation host. No model calls or secrets.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from urllib.parse import urlencode, urlparse
from urllib.request import urlopen

SCRIPTS = Path(__file__).resolve().parent
REPO = SCRIPTS.parent


def timestamp():
    return datetime.now(timezone.utc).isoformat()


def read(path):
    return json.loads(Path(path).read_text())


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.next')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False)+'\n')
    temporary.replace(path)


def digest(path):
    checksum = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024*1024), b''):
            checksum.update(block)
    return checksum.hexdigest()


def place_id(value):
    if not re.fullmatch(r'(?:[0-9]{5}|[0-9]{8})', value):
        raise argparse.ArgumentTypeError('Use the verified five-digit district or eight-digit municipality code')
    return value


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def plan(root, place):
    inventory_path = root/'prepared-inventory'/place/'inventory.json'
    inventory = read(inventory_path) if inventory_path.exists() else None
    if inventory and inventory.get('municipality') != place:
        raise ValueError('Inventory belongs to another municipality')
    adapter = 'niedersachsen-municipality' if len(place) == 8 and place.startswith('03') else None
    counts = dict(Counter(unit['kind'] for unit in inventory.get('units', []))) if inventory else {}
    blockers = []
    if not adapter:
        blockers.append('No generic geometry adapter for this location yet; use the source-adapter step in the runbook, not an unrelated pilot recipe')
    if not inventory:
        blockers.append('Municipality inventory missing; districts require a verified member/boundary preparation')
    if adapter and inventory and not counts.get('wind'):
        blockers.append('Current Niedersachsen worker requires active onshore wind; solar-only/town-only support must be added explicitly')
    for relative in ('inputs/national-register/wind.json', 'inputs/national-register/solar.json', 'inputs/DE_VG250.gpkg'):
        if not (root/relative).is_file():
            blockers.append('Missing cached input: '+relative)
    return dict(place=place, name=inventory.get('name') if inventory else None,
                adapter=adapter, counts=counts, blockers=blockers,
                preparationPossible=not blockers, stageReady=False,
                candidateRoot=str(root/'candidates'/place),
                inventoryGaps=inventory.get('gaps', []) if inventory else [],
                nextStep='run' if not blockers else 'resolve-inputs-or-adapter',
                noModelCalls=True, noPublication=True)


def check(directory, place):
    """Technical checks, deliberately separate from source/browser acceptance."""
    errors, gaps = [], []
    required = ('scene.json', 'register.json', 'provenance.json', 'data-gaps.json')
    missing = [name for name in required if not (directory/name).is_file()]
    if missing:
        return dict(place=place, technicalChecksPassed=False, stageReady=False,
                    errors=['Missing '+name for name in missing], gaps=[])
    scene, register, provenance, recorded = [read(directory/name) for name in required]
    if scene.get('municipality') != place or register.get('feature', {}).get('properties', {}).get('id') != place:
        errors.append('Scene/register municipality mismatch')
    if scene.get('crs') != 'ETRS89_UTM32' or scene.get('heightReference') != 'DHHN2016_NH':
        errors.append('Unrecognized coordinate/height reference')
    terrain = scene.get('terrain', {})
    width, height = terrain.get('width'), terrain.get('height')
    elevations = terrain.get('elevations', [])
    if not isinstance(width, int) or not isinstance(height, int) or width < 2 or height < 2 or len(elevations) != width*height:
        errors.append('Invalid terrain dimensions')
    if not elevations or any(value is not None and not finite(value) for value in elevations):
        errors.append('Invalid terrain samples')
    if any(value is None for value in elevations) and terrain.get('coverage') != 'explicit-outer-mask':
        errors.append('Unexplained terrain gaps')
    bounds = terrain.get('groundBounds', [])
    valid_bounds = len(bounds) == 4 and all(finite(v) for v in bounds) and bounds[0] < bounds[2] and bounds[1] < bounds[3]
    if not valid_bounds:
        errors.append('Invalid terrain bounds')
    rows, turbines = register.get('turbines', []), scene.get('turbines', [])
    ids, rendered = [r.get('mastr_nr') for r in rows], [t.get('id') for t in turbines]
    if len(ids) != len(set(ids)) or len(rendered) != len(set(rendered)) or set(ids) != set(rendered):
        errors.append('Rendered wind units differ from coordinate-selected register')
    by_id = {r.get('mastr_nr'): r for r in rows}
    for turbine in turbines:
        for displayed, source in (('hub', 'nabenhoehe_m'), ('rotor', 'rotor_m'), ('ratedKw', 'brutto_kw')):
            if turbine.get(displayed) != by_id.get(turbine.get('id'), {}).get(source):
                errors.append('Wind model differs from register: '+str(turbine.get('id'))+' '+displayed)
    stops = scene.get('stops', [])
    if not stops or not any(stop.get('kind') == 'town' for stop in stops):
        errors.append('Sourced town start missing')
    if len({stop.get('id') for stop in stops}) != len(stops):
        errors.append('Duplicate destinations')
    for stop in stops:
        sid = str(stop.get('id'))
        x, z = stop.get('x'), stop.get('z')
        if not finite(x) or not finite(z) or not valid_bounds or not (bounds[0] <= x <= bounds[2] and bounds[1] <= z <= bounds[3]):
            errors.append('Destination outside measured terrain: '+sid)
        elif isinstance(width, int) and isinstance(height, int) and len(elevations) == width*height:
            column = round((x-bounds[0])/(bounds[2]-bounds[0])*(width-1))
            row = round((z-bounds[1])/(bounds[3]-bounds[1])*(height-1))
            if elevations[row*width+column] is None:
                errors.append('Missing terrain at destination: '+sid)
        if stop.get('kind') in ('wind', 'solar'):
            capacity = stop.get('capacityKw')
            if capacity is None:
                gaps.append('Missing registered capacity: '+sid+'; no fabricated kW')
            elif not finite(capacity) or capacity <= 0:
                errors.append('Invalid registered capacity: '+sid)
            if stop.get('kind') == 'wind':
                units = stop.get('unitIds', [])
                if not units or len(set(units)) != len(units) or any(unit not in by_id for unit in units):
                    errors.append('Missing or ambiguous wind unit links: '+sid)
                elif capacity is not None:
                    powers = [by_id[unit].get('brutto_kw') for unit in units]
                    if any(not finite(power) for power in powers) or abs(sum(powers)-capacity) > .001:
                        errors.append('Wind capacity differs from linked units: '+sid)
    if not scene.get('buildings'):
        errors.append('Real buildings missing; not a complete hero stage')
    for field in ('buildingLicense', 'terrainLicense', 'sources'):
        if not provenance.get(field):
            errors.append('Missing source/license evidence: '+field)
    gaps.extend(recorded.get('gaps', []))
    if provenance.get('cadastralVerification') is not True:
        gaps.append('Precise official boundary verification not confirmed')
    return dict(place=place, technicalChecksPassed=not errors, stageReady=False,
                sceneSha256=digest(directory/'scene.json'), errors=errors, gaps=gaps,
                counts=dict(buildings=len(scene.get('buildings', [])), wind=len(turbines), destinations=len(stops)),
                pending=['source-and-license-review', 'resolve-or-explicitly-accept-data-gaps',
                         'live-weather-integration', 'desktop-and-mobile-browser-review',
                         'publication-and-public-link-verification'])


def process_birth(pid):
    try:
        return Path('/proc/'+str(pid)+'/stat').read_text().rpartition(')')[2].split()[19]
    except (OSError, IndexError):
        return None


def job_status(root, place):
    path = root/'jobs/stages'/(place+'.json')
    if not path.exists():
        return dict(status='not-started', **plan(root, place))
    state = read(path)
    if state.get('status') == 'running':
        pid = state.get('pid')
        alive = False
        if isinstance(pid, int) and pid > 0:
            try:
                os.kill(pid, 0)
                alive = not state.get('processBirth') or process_birth(pid) == state['processBirth']
            except ProcessLookupError:
                pass
            except PermissionError:
                alive = True
        if not alive:
            state.update(status='interrupted', error='Recorded worker is no longer active; inspect the service journal before retrying', stageReady=False)
    return state


def run(root, place, osm_file):
    root = root.resolve()
    (root/'queue').mkdir(parents=True, exist_ok=True)
    with (root/'queue/stage-preparation.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        preparation = plan(root, place)
        if preparation['blockers']:
            raise ValueError('; '.join(preparation['blockers']))
        if not osm_file or not osm_file.is_file():
            raise ValueError('Provide the cached, dated Niedersachsen OSM extract with --osm-file')
        if shutil.disk_usage(root).free < 2*1024**3:
            raise ValueError('Less than 2 GiB free; no automatic storage expansion')
        # Hold the same lock as the national collector, preventing mixed input generations.
        with (root/'logs/national-register.lock').open('a') as source_lock:
            fcntl.flock(source_lock, fcntl.LOCK_SH | fcntl.LOCK_NB)
            candidate = Path(preparation['candidateRoot'])
            output = candidate/'public/geo/landscape-tours'/place
            if output.exists():
                raise ValueError('Existing candidate protected; inspect it with check, do not overwrite')
            candidate.mkdir(parents=True, exist_ok=True)
            for name in ('inputs', 'prepared-inventory'):
                target = candidate/name
                if not target.exists():
                    target.symlink_to(root/name, target_is_directory=True)
                if target.resolve() != root/name:
                    raise ValueError('Unexpected candidate input path')
            (candidate/'logs').mkdir(exist_ok=True)
            status_path = root/'jobs/stages'/(place+'.json')
            state = dict(preparation, status='running', pid=os.getpid(), processBirth=process_birth(os.getpid()), startedAt=timestamp(), log=str(root/'logs'/('stage-'+place+'.log')))
            write(status_path, state)
            command = [sys.executable, str(SCRIPTS/'landscape-niedersachsen-worker.py'), '--root', str(candidate),
                       '--municipality', place, '--osm-file', str(osm_file.resolve())]
            try:
                with Path(state['log']).open('a') as log:
                    subprocess.run(command, check=True, stdout=log, stderr=subprocess.STDOUT,
                                   env=dict(os.environ, OPENBLAS_NUM_THREADS='1', OMP_NUM_THREADS='1'))
                report = check(output, place)
                write(candidate/'checks.json', report)
                state.update(status='needs-review' if report['technicalChecksPassed'] else 'failed-validation',
                             report=str(candidate/'checks.json'))
                if not report['technicalChecksPassed']:
                    raise ValueError('Candidate failed technical validation; see '+state['report'])
            except Exception as error:
                state.update(status='failed', error=str(error))
                raise
            finally:
                state['updatedAt'] = timestamp()
                write(status_path, state)
            return state



def fetch_json(url):
    with urlopen(url, timeout=30) as response:
        return json.load(response)


def verify_live(directory, place, base_url, fetch=fetch_json):
    """Read-only check of the published scene and each actual weather route."""
    parsed = urlparse(base_url)
    if parsed.scheme != 'https' or not parsed.netloc or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ('', '/'):
        raise ValueError('Use an HTTPS origin without credentials, path, or query')
    base_url = base_url.rstrip('/')
    local = read(directory/'scene.json')
    published = fetch(base_url+'/geo/landscape-tours/'+place+'/scene.json')
    errors, checked = [], []
    if local != published or published.get('municipality') != place:
        errors.append('Published scene differs from the reviewed candidate')
    weather_place = published.get('weatherMunicipality') or place
    requests = [(None, dict(gemeinde=weather_place, **({'kreis':place} if len(place)==5 else {})))]
    requests += [(stop, dict(gemeinde=weather_place, tour=place, stop=stop['id']))
                 for stop in published.get('stops', []) if stop.get('kind')=='wind']
    # Solar parks use municipal per-kW weather, not the district total curve.
    if len(place)==5 and any(stop.get('kind')=='solar' for stop in published.get('stops', [])):
        requests.append((None, dict(gemeinde=weather_place)))
    now = datetime.now(timezone.utc)
    for stop, params in requests:
        label = stop['id'] if stop else urlencode(params)
        try:
            data = fetch(base_url+'/api/windraeder-vorschau/microcharts?'+urlencode(params)).get('data')
            if not data:
                raise ValueError('No weather data')
            field = 'windPerKw' if stop else 'solarPerKw'
            points = data.get(field)
            if not points or any(not finite(p.get('value')) for p in points):
                raise ValueError('Missing or invalid '+field)
            dates = [datetime.fromisoformat(p['time'].replace('Z','+00:00')) for p in points]
            if any(value.tzinfo is None for value in dates) or len(set(dates)) != len(dates) or dates != sorted(dates) or not min(dates) <= now <= max(dates):
                raise ValueError('Curve does not cover now or has invalid timestamps')
            model = data.get('windModelRun') if stop else data.get('modelRun')
            if not model:
                raise ValueError('Model timestamp missing')
            age = (now-datetime.fromisoformat(model.replace('Z','+00:00'))).total_seconds()
            if not -900 <= age <= 12*3600:
                raise ValueError('Weather model is stale or dated in the future')
            if stop and not data.get('conditions'):
                raise ValueError('Wind conditions missing')
            checked.append(dict(destination=label, samples=len(points), modelRun=model))
        except (OSError, ValueError, TypeError, KeyError) as error:
            errors.append(label+': '+str(error))
    return dict(place=place, checkedAt=timestamp(), liveDataChecksPassed=not errors,
                stageReady=False, errors=errors, checked=checked,
                candidateUrl=base_url+'/fuer-organisationen/kommunen?gemeinde='+place,
                pending=['public-desktop-and-mobile-browser-check', 'explicit-release-decision-before-outreach'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('plan', 'run', 'status', 'check', 'verify-live'))
    parser.add_argument('--place', required=True, type=place_id)
    parser.add_argument('--root', type=Path, default=Path('/opt/solar-check-landscape'))
    parser.add_argument('--osm-file', type=Path)
    parser.add_argument('--base-url', default='https://solar-check.io')
    parser.add_argument('--directory', type=Path, help='Prepared output directory for check')
    args = parser.parse_args()
    try:
        if args.action == 'plan':
            result = plan(args.root, args.place)
        elif args.action == 'run':
            result = run(args.root, args.place, args.osm_file)
        elif args.action in ('check', 'verify-live'):
            directory = args.directory or args.root/'candidates'/args.place/'public/geo/landscape-tours'/args.place
            result = check(directory, args.place) if args.action == 'check' else verify_live(directory, args.place, args.base_url)
        else:
            result = job_status(args.root, args.place)
        print(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False))
        if result.get('technicalChecksPassed') is False or result.get('liveDataChecksPassed') is False or result.get('status') in ('failed', 'failed-validation', 'interrupted'):
            return 1
        if result.get('blockers'):
            return 2
        return 0
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        print(json.dumps(dict(status='failed', stageReady=False, error=str(error)), ensure_ascii=False))
        return 1


if __name__ == '__main__':
    sys.exit(main())
