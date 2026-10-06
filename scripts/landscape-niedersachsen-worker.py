"""Serial Niedersachsen tour preparation on the existing preparation host.

Uses cached provisional coordinate inventories and official source tiles. Never
publishes, buys storage, calls model services, or replaces an existing tour.
"""
import argparse
import hashlib
import fcntl
import importlib.util
import json
import math
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from urllib.parse import urljoin, urlparse

import requests
from pyproj import Transformer
from shapely.geometry import Point, LineString, box, mapping, shape
from shapely.ops import transform, unary_union


def helper(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), Path(__file__).resolve().parent/name)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


shared = helper('landscape-district-worker.py')
queue = helper('landscape-background-queue.py')
metric = Transformer.from_crs(4326, 25832, always_xy=True)
geographic = Transformer.from_crs(25832, 4326, always_xy=True)


def read_boundary(root, ags):
    path = root/'inputs/DE_VG250.gpkg'
    with sqlite3.connect('file:'+str(path)+'?mode=ro', uri=True) as db:
        if db.execute("SELECT srs_id FROM gpkg_geometry_columns WHERE table_name='vg250_gem'").fetchone() != (25832,):
            raise ValueError('Unexpected boundary reference')
        rows = db.execute('SELECT GEN,geom FROM vg250_gem WHERE AGS=?', (ags,)).fetchall()
    if not rows or len({name for name, _ in rows}) != 1:
        raise ValueError('Unique municipality boundary required')
    geometry = unary_union([queue.decode_gpkg(blob) for _, blob in rows])
    if geometry.is_empty or not geometry.is_valid:
        raise ValueError('Invalid cached boundary')
    return dict(type='Feature', geometry=mapping(transform(geographic.transform, geometry)), properties=dict(
        id=ags, name=rows[0][0], source='BKG VG250; generalized administrative boundary, provisional only',
        sourceUrl='https://gdz.bkg.bund.de/index.php/default/verwaltungsgebiete-1-250-000-vg250.html',
        sourceSha256=shared.digest(path), cadastralVerification=False))


def choose_town(elements, name, admin_ids=()):
    nodes = [e for e in elements if e['type']=='node' and e.get('tags', {}).get('place') in ('city','town','village')]
    exact = [e for e in nodes if e['tags'].get('name')==name]
    choices = exact if exact else [e for e in nodes if e['id'] in admin_ids]
    if len(choices)!=1 or not choices[0]['tags'].get('name'):
        raise ValueError('Start town missing or ambiguous; no arbitrary fallback')
    return choices[0]


def extract_osm(path, boundary, ags, scratch):
    import osmium
    factory = osmium.geom.GeoJSONFactory()
    context, candidates, admin_ids = [], [], set()
    cache = scratch/'node-locations.cache'
    processor = osmium.FileProcessor(str(path)).with_locations('sparse_file_array,'+str(cache)).with_areas().with_filter(
        osmium.filter.KeyFilter('place','waterway','natural','plant:source','generator:source','boundary'))
    try:
        for entity in processor:
            tags = dict(entity.tags)
            if isinstance(entity, osmium.osm.Relation) and tags.get('boundary')=='administrative' and tags.get('de:amtlicher_gemeindeschluessel')==ags:
                admin_ids.update(m.ref for m in entity.members if m.role=='admin_centre' and m.type=='n')
            elif isinstance(entity, osmium.osm.Node) and tags.get('place') and entity.location.valid():
                if boundary.covers(Point(entity.location.lon,entity.location.lat)):
                    context.append(dict(type='node',id=entity.id,lon=entity.location.lon,lat=entity.location.lat,
                                        tags={k:v for k,v in tags.items() if k in ('name','place')}))
            elif isinstance(entity, osmium.osm.Way) and (tags.get('waterway') or tags.get('natural')=='water'):
                if len(entity.nodes)>1 and all(n.location.valid() for n in entity.nodes):
                    points = [dict(lon=n.lon,lat=n.lat) for n in entity.nodes]
                    if LineString([(p['lon'],p['lat']) for p in points]).intersects(boundary):
                        context.append(dict(type='way',id=entity.id,geometry=points,tags={k:v for k,v in tags.items() if k in ('natural','waterway')}))
            elif entity.is_area() and (tags.get('plant:source')=='solar' or tags.get('generator:source')=='solar'):
                if tags.get('location')=='roof' or tags.get('generator:location')=='roof':continue
                geometry = shape(json.loads(factory.create_multipolygon(entity)))
                if geometry.is_valid and not geometry.is_empty and geometry.intersects(boundary):
                    candidates.append(dict(id=('way/' if entity.from_way() else 'relation/')+str(entity.orig_id()),geometry=geometry,
                                           tags={k:v for k,v in tags.items() if k in ('name','power','plant:source','generator:source','location','generator:location','ref:mastr')}))
    finally:
        del processor
        cache.unlink(missing_ok=True)
    return context, candidates, admin_ids


def coverage(rows, town, features, boundary):
    coordinates = [metric.transform(r['lon'],r['lat']) for r in rows]
    anchor = metric.transform(town['lon'],town['lat'])
    extent = coordinates+[anchor]
    windows = shared.wind_destination_windows(coordinates)+[(*anchor,550)]
    for feature in features:
        geometry = shape(feature['geometry'])
        parts = [geometry] if geometry.geom_type=='Polygon' else list(geometry.geoms)
        if any(part.interiors for part in parts) or not boundary.covers(geometry):continue
        for part in parts:extent.extend(metric.transform(x,y) for x,y in part.exterior.coords)
        destination = transform(metric.transform,geometry).representative_point()
        windows.append((destination.x,destination.y,350))
    xs,ys = zip(*extent)
    bounds = (math.floor((min(xs)-650)/20)*20,math.floor((min(ys)-650)/20)*20,
              math.ceil((max(xs)+650)/20)*20,math.ceil((max(ys)+650)/20)*20)
    return box(*bounds),unary_union([Point(x,y).buffer(radius) for x,y,radius in windows])


def selected_tiles(pages, area, asset):
    selected = {}
    for page in pages:
        for item in page['features']:
            geometry = transform(metric.transform,shape(item['geometry']))
            if not geometry.intersects(area):continue
            # Cell identity does not depend on date-specific filename conventions.
            cell = tuple(round(v,2) for v in geometry.bounds)
            stamp = item['properties'].get('datetime') or item['properties'].get('start_datetime')
            if not stamp:raise ValueError('Source acquisition date missing')
            rank = (stamp,item['id'],item['assets'][asset]['href'])
            if cell not in selected or rank>selected[cell][0]:selected[cell]=(rank,item)
    return [selected[cell][1]['assets'][asset]['href'] for cell in sorted(selected)]


def stac_pages(host, collection, bounds):
    url = 'https://'+host+'.stac.lgln.niedersachsen.de/search'
    params = dict(collections=collection,bbox=','.join(map(str,bounds)),limit=300)
    visited = set()
    while url:
        if url in visited or urlparse(url).scheme!='https' or urlparse(url).hostname!=host+'.stac.lgln.niedersachsen.de':
            raise ValueError('Invalid or repeated STAC pagination')
        visited.add(url)
        response = requests.get(url,params=params,timeout=(20,90));response.raise_for_status()
        page = response.json()
        yield page
        following = next((link['href'] for link in page.get('links',[]) if link['rel']=='next'),None)
        url = urljoin(url,following) if following else None
        params = None


def download(inputs, prefix, kind, url, reuse):
    suffix = Path(urlparse(url).path).suffix
    if suffix not in ('.tif','.gml','.zip') or urlparse(url).scheme!='https':raise ValueError('Unsupported tile URL')
    name = prefix+'-'+kind+'-'+hashlib.sha256(url.encode()).hexdigest()[:24]+suffix
    path = inputs/name
    verified = next((e for e in reuse.get(url,[]) if (inputs/e['file']).is_file() and shared.digest(inputs/e['file'])==e['sha256']),None)
    if path.exists() and (not verified or shared.digest(path)!=verified['sha256']):raise ValueError('Existing tile lacks matching hash manifest')
    if not path.exists() and verified:os.link(inputs/verified['file'],path)
    if not path.exists():
        temporary = path.with_suffix(suffix+'.part')
        try:
            with requests.get(url,stream=True,timeout=(20,120)) as response:
                response.raise_for_status()
                size = int(response.headers.get('Content-Length','0'))
                if shutil.disk_usage(inputs).free<2*1024**3+size:raise RuntimeError('Insufficient free storage')
                with temporary.open('wb') as stream:
                    for chunk in response.iter_content(1024*1024):
                        if shutil.disk_usage(inputs).free<2*1024**3:raise RuntimeError('Free storage guard reached')
                        stream.write(chunk)
            if not temporary.stat().st_size:raise ValueError('Empty source tile')
            temporary.replace(path)
        finally:temporary.unlink(missing_ok=True)
    return dict(file=name,url=url,sha256=shared.digest(path))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,required=True)
    parser.add_argument('--municipality',required=True)
    parser.add_argument('--osm-file',type=Path,required=True)
    args = parser.parse_args()
    ags = args.municipality
    if len(ags)!=8 or not ags.isdigit() or not ags.startswith('03'):raise ValueError('Niedersachsen municipality required')
    root = args.root.resolve();inputs = root/'inputs';destination = root/'public/geo/landscape-tours'/ags
    lock_directory = root/'queue';lock_directory.mkdir(exist_ok=True)
    preparation_lock = (lock_directory/'niedersachsen-worker.lock').open('a')
    try:fcntl.flock(preparation_lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    except BlockingIOError:raise RuntimeError('Another Niedersachsen preparation worker is active')
    if shutil.disk_usage(root).free<2*1024**3:raise RuntimeError('Insufficient free storage before preparation')
    if destination.exists():raise ValueError('Existing tour protected; use separate preparation root')
    inventory = json.loads((root/'prepared-inventory'/ags/'inventory.json').read_text())
    if inventory['municipality']!=ags:raise ValueError('Inventory municipality mismatch')
    for name,path in [('wind.json',inputs/'national-register/wind.json'),('solar.json',inputs/'national-register/solar.json'),('DE_VG250.gpkg',inputs/'DE_VG250.gpkg')]:
        expected = inventory['sources']['hashes'].get(name)
        if not expected or shared.digest(path)!=expected:raise ValueError('Inventory source hash is stale: '+name)
    feature = read_boundary(root,ags);geometry = shape(feature['geometry']);units = inventory['units']
    if len({u['id'] for u in units})!=len(units):raise ValueError('Duplicate inventory units')
    for unit in units:
        if unit.get('coordinateMunicipality')!=ags or unit.get('status')!='active' or not geometry.covers(Point(unit['lon'],unit['lat'])):
            raise ValueError('Inventory coordinate/status mismatch')
    winds = [u for u in units if u['kind']=='wind']
    if not winds or any(u.get('locationType') not in ('Windenergie an Land',) for u in winds):raise ValueError('Active onshore wind inventory required')
    rows = shared.district_units(dict(kind='wind',status='complete',units=winds),geometry,[feature])
    prefix = 'ni-'+ags
    root.joinpath('staging').mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=prefix+'-',dir=root/'staging') as temp:
        stage = Path(temp);out = stage/'public/geo/landscape-tours'/ags;out.mkdir(parents=True)
        context,candidates,admin_ids = extract_osm(args.osm_file,geometry,ags,stage)
        town = choose_town(context,feature['properties']['name'],admin_ids)
        solar = json.loads((inputs/'national-register/solar.json').read_text())
        if solar.get('status')!='complete' or solar.get('kind')!='solar':raise ValueError('Complete solar snapshot required')
        features,leads = shared.solar_evidence(candidates,[u for u in units if u['kind']=='solar'],geometry)
        sources = {s['kind']:s for s in inventory['sources']['register']}
        shared.save(out/'boundary.geo.json',feature)
        shared.save(out/'register.json',dict(feature=feature,turbines=rows,checkedAt=sources['wind']['checkedAt'],boundarySource=feature['properties']['source'],stock=None))
        gaps = [dict(kind='wind-field',unitId=r['mastr_nr'],field=field,status='research-required') for r in rows
                for field in ('nabenhoehe_m','rotor_m','brutto_kw','hersteller','typ') if r.get(field) is None]
        gaps += [dict(kind='solar-outline-or-link',unitId=u['id'],status='research-required') for u in units if u['kind']=='solar']
        gaps += [dict(kind='official-boundary-verification',unitId=u['id'],status='research-required') for u in units if u.get('assignmentStatus')=='boundary-review-required']
        gaps.append(dict(kind='provisional-municipality-boundary',status='official-verification-pending'))
        shared.save(out/'data-gaps.json',dict(municipality=ags,gaps=gaps,stageReady=False,browserAcceptance='pending'))
        shared.save(out/'assignment-audit.json',dict(municipality=ags,cadastralVerification=False,
            nearBoundaryUnits=[u['id'] for u in units if u.get('assignmentStatus')=='boundary-review-required'],
            units=[{k:u.get(k) for k in ('id','municipalityCode','coordinateMunicipality','assignmentStatus','boundaryDistanceMetres')} for u in units],sources=inventory['sources']))
        osm_source = 'https://download.geofabrik.de/europe/germany/niedersachsen.html'
        osm_hash = shared.digest(args.osm_file)
        shared.save(out/'solar-enrichment.geo.json',dict(type='FeatureCollection',features=features,researchLeads=leads,checkedAt=solar['checkedAt'],sourceUrl=osm_source,sourceSha256=osm_hash))
        shared.save(out/'preparation.json',dict(prefix=prefix,townName=town['tags']['name'],townLabel=town['tags']['name'],weatherMunicipality=ags,
            solarFootprints={},solarRegisterCache='inputs/national-register/solar.json',buildingLicense='CC BY 4.0 · LGLN',terrainLicense='CC BY 4.0 · LGLN'))
        document = dict(elements=context,sourceUrl=osm_source,sourceSha256=osm_hash,sourceFile=args.osm_file.name)
        shared.save(out/'context-source.json',document);shared.save(inputs/(ags+'-osm.json'),document)
        terrain,buildings = coverage(rows,town,features,geometry);bounds = transform(geographic.transform,terrain).bounds
        reuse = {}
        for manifest in sorted(inputs.glob('*sources.json')):
            for entry in json.loads(manifest.read_text()):
                if entry.get('url') and entry.get('sha256') and Path(entry['file']).name==entry['file']:reuse.setdefault(entry['url'],[]).append(entry)
        jobs = []
        for host,collection,asset,area in [('dgm','dgm1','dgm1-tif',terrain),('lod','lod2','lod2-gml',buildings)]:
            urls = selected_tiles(stac_pages(host,collection,bounds),area,asset)
            if not urls:raise ValueError('Missing official '+collection+' tiles')
            jobs.extend((host,url) for url in urls)
        shared.save(inputs/(prefix+'-download-plan.json'),dict(terrainBounds=terrain.bounds,files=jobs))
        manifest = []
        for kind,url in jobs:
            entry = download(inputs,prefix,kind,url,reuse);manifest.append(entry);reuse.setdefault(url,[]).append(entry)
            shared.save(inputs/(prefix+'-sources.json'),manifest)
        # __file__-derived roots must point to isolated copies, not script symlinks.
        scripts = stage/'scripts';scripts.mkdir()
        for path in Path(__file__).resolve().parent.glob('landscape*.py'):shutil.copy2(path,scripts/path.name)
        (stage/'inputs').symlink_to(inputs,target_is_directory=True)
        source = stage/'selected-sources';source.mkdir()
        for entry in manifest:os.link(inputs/entry['file'],source/entry['file'])
        shared.save(source/(prefix+'-sources.json'),manifest)
        shared.save(source/(ags+'-osm.json'),document)
        subprocess.run([sys.executable,str(scripts/'landscape-tour-prepare.py'),str(source),ags],check=True)
        subprocess.run([sys.executable,str(scripts/'landscape-showcase-enrich.py'),'--root',str(stage),'--district',ags],check=True)
        audit = json.loads((out/'provenance.json').read_text())
        audit.update(cadastralVerification=False,osmSource=osm_source,osmSourceSha256=osm_hash,osmSourceFile=args.osm_file.name,
                     townSourceId='osm-node-'+str(town['id']),townSourceName=town['tags']['name'],boundarySource=feature['properties']['source'])
        audit['limitations'].append('Generalized BKG boundary; near-border inventory requires precise official verification. Browser acceptance and publication pending.')
        shared.save(out/'provenance.json',audit);shared.save(out/'context-source.json',document)
        destination.parent.mkdir(parents=True,exist_ok=True)
        if destination.exists():raise ValueError('Destination appeared during preparation; preserve it')
        out.rename(destination)
        print('Prepared provisional tour:',ags,flush=True)


if __name__=='__main__':main()
