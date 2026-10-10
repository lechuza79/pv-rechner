"""Download bounded LGLN terrain/building tiles for a registered municipality tour.

Requires the checked register snapshot and sourced OSM context. Downloads only
terrain covering the destinations and buildings within the shared display windows.
Original source URLs and hashes are retained for repeatable preparation.
"""
import argparse
import concurrent.futures
import hashlib
import json
import math
from pathlib import Path

import requests
from pyproj import Transformer
from shapely.geometry import Point, box, shape
from shapely.ops import transform, unary_union

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('directory', type=Path)
parser.add_argument('municipality')
parser.add_argument('--prefix', required=True)
parser.add_argument('--town', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
register = json.loads((root / 'public/geo/landscape-tours' / args.municipality / 'register.json').read_text())
context_path = args.directory / (args.municipality + '-osm.json')
if not context_path.exists():
    context_path = root / 'public/geo/landscape-tours' / args.municipality / 'context-source.json'
context = json.loads(context_path.read_text())
town = next(e for e in context['elements'] if e['type'] == 'node' and e.get('tags', {}).get('name') == args.town)
metric = Transformer.from_crs(4326, 25832, always_xy=True)
geographic = Transformer.from_crs(25832, 4326, always_xy=True)
town_point = metric.transform(town['lon'], town['lat'])
coordinates = [metric.transform(t['lon'], t['lat']) for t in register['turbines']]
destinations = coordinates + [town_point]
xs, ys = zip(*destinations)
terrain_bounds = (math.floor((min(xs)-650)/20)*20, math.floor((min(ys)-650)/20)*20,
                  math.ceil((max(xs)+650)/20)*20, math.ceil((max(ys)+650)/20)*20)
terrain = box(*terrain_bounds)
building_windows = unary_union([Point(*town_point).buffer(550)] + [Point(*p).buffer(350) for p in coordinates])
bounds = transform(geographic.transform, terrain).bounds


def items(host, collection):
    response = requests.get('https://' + host + '.stac.lgln.niedersachsen.de/search',
                            params={'collections': collection, 'bbox': ','.join(map(str, bounds)), 'limit': 300}, timeout=45)
    response.raise_for_status()
    result = []
    while True:
        page = response.json()
        result.extend(page['features'])
        following = next((link['href'] for link in page.get('links', []) if link['rel'] == 'next'), None)
        if not following:
            return result
        response = requests.get(following, timeout=45)
        response.raise_for_status()


def selected(host, collection, asset, area):
    candidates = {}
    for item in items(host, collection):
        if not transform(metric.transform, shape(item['geometry'])).intersects(area):
            continue
        # DGM contains multiple acquisition dates. Use the newest complete tile
        # for each metric grid cell, never whichever historical row arrived first.
        grid = tuple(item['id'].split('_')[2:4])
        stamp = item['properties'].get('datetime') or item['properties'].get('start_datetime') or item['id']
        previous = candidates.get(grid)
        if previous is None or stamp > previous[0]:
            candidates[grid] = (stamp, item)
    return [item['assets'][asset]['href'] for _, item in candidates.values()]


def download(entry):
    url, kind = entry
    name = args.prefix + '-' + kind + '-' + url.rsplit('/', 1)[-1]
    path = args.directory / name
    if not path.exists():
        temporary = path.with_suffix(path.suffix + '.part')
        with requests.get(url, stream=True, timeout=(15, 60)) as response:
            response.raise_for_status()
            with temporary.open('wb') as output:
                for chunk in response.iter_content(1024*1024):
                    output.write(chunk)
        temporary.replace(path)
    print(name, flush=True)
    return {'file': name, 'url': url, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


args.directory.mkdir(parents=True, exist_ok=True)
jobs = [(url, 'lod') for url in selected('lod', 'lod2', 'lod2-gml', building_windows)]
jobs += [(url, 'dgm') for url in selected('dgm', 'dgm1', 'dgm1-tif', terrain)]
if not jobs:
    raise ValueError('No official source tiles')
print('Official source tiles:', len(jobs), flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    manifest = list(executor.map(download, jobs))
(args.directory / (args.prefix + '-sources.json')).write_text(json.dumps(manifest, indent=2))
