"""Serial district preparation using cached national stock and existing sources.

Runs in the existing resource-limited preparation service. Public technical data
only; no model calls. County and municipal boundaries are supplied separately.
"""
import argparse
import datetime as dt
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time

import requests
from pyproj import Transformer
from shapely.geometry import Point, Polygon, MultiPoint, box, mapping, shape
from shapely.ops import transform, unary_union


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary=path.with_suffix(path.suffix+'.next')
    temporary.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':'),allow_nan=False))
    temporary.replace(path)


def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()


def district_units(stock,boundary,members):
    if stock.get('status')!='complete' or stock.get('kind')!='wind':raise ValueError('Complete national wind snapshot required')
    geometries=[(member,shape(member['geometry'])) for member in members]
    result=[]
    for unit in stock['units']:
        if unit.get('lat') is None or unit.get('lon') is None:continue
        point=Point(unit['lon'],unit['lat'])
        if not boundary.covers(point):continue
        if unit.get('kind')!='wind' or unit.get('status')!='active':raise ValueError('Invalid active wind snapshot')
        owners=[member for member,geometry in geometries if geometry.covers(point)]
        if len(owners)!=1:raise ValueError('Wind coordinate needs exactly one municipality: '+unit['id'])
        owner=owners[0]['properties']
        result.append(dict(mastr_nr=unit['id'],region_id=unit.get('municipalityCode'),status='35',lage=unit.get('locationType'),
                           lat=unit['lat'],lon=unit['lon'],nabenhoehe_m=unit.get('hubHeightM'),rotor_m=unit.get('rotorDiameterM'),
                           brutto_kw=unit.get('capacityKw'),hersteller=unit.get('manufacturer'),typ=unit.get('model'),
                           windpark=None,inbetriebnahme=unit.get('commissionedAt'),coordinateMunicipality=owner['id'],
                           coordinateMunicipalityName=owner['name']))
    if not result or len({r['mastr_nr'] for r in result})!=len(result):raise ValueError('Empty or duplicate district wind selection')
    return result


def solar_evidence(candidates,units,boundary):
    if len({u['id'] for u in units})!=len(units):raise ValueError('Duplicate solar units')
    matches,leads=[],[]
    for unit in units:
        if unit.get('lat') is None or unit.get('lon') is None:continue
        point=Point(unit['lon'],unit['lat'])
        if not boundary.covers(point):continue
        if unit.get('kind')!='solar' or unit.get('status')!='active':raise ValueError('Invalid active solar snapshot')
        inside=[c for c in candidates if c['geometry'].covers(point)]
        plants=[c for c in inside if c['tags'].get('power')=='plant']
        chosen=plants if plants else inside
        if len(chosen)!=1:
            leads.append(dict(unitId=unit['id'],status='ambiguous' if chosen else 'unmatched',automaticAssignment=False));continue
        c=chosen[0]
        matches.append(dict(unitId=unit['id'],capacityKw=unit.get('capacityKw'),lon=unit['lon'],lat=unit['lat'],outlineId=c['id'],
                            outlineKind='plant' if plants else 'generator',rule='Active ground-solar coordinate inside exactly one preferred plant, or one explicit solar generator; no complete-park or ownership claim.'))
    features=[]
    for c in candidates:
        linked=[m for m in matches if m['outlineId']==c['id']]
        if linked:features.append(dict(type='Feature',geometry=mapping(c['geometry']),properties=dict(id=c['id'],**c['tags'],osmUrl='https://www.openstreetmap.org/'+c['id'],registerUnits=linked)))
    return features,leads


def wind_destination_windows(coords):
    # Match the shared preparer's 1,200 metre connected camera clusters.
    remaining=set(range(len(coords)));windows=[]
    while remaining:
        group={remaining.pop()};todo=list(group)
        while todo:
            a=todo.pop()
            near={b for b in remaining if math.dist(coords[a],coords[b])<=1200}
            remaining-=near;group|=near;todo+=list(near)
        windows.append((sum(coords[i][0] for i in group)/len(group),sum(coords[i][1] for i in group)/len(group),350))
    return windows


def bavarian_tiles(terrain_bounds,windows):
    result=[]
    for x in range(math.floor(terrain_bounds[0]/1000),math.ceil(terrain_bounds[2]/1000)):
        for y in range(math.floor(terrain_bounds[1]/1000),math.ceil(terrain_bounds[3]/1000)):
            name=f'{x}_{y}.tif';result.append(('dgm','https://download1.bayernwolke.de/a/dgm/dgm1/'+name))
    for x in range(math.floor(terrain_bounds[0]/2000)*2,math.ceil(terrain_bounds[2]/2000)*2,2):
        for y in range(math.floor(terrain_bounds[1]/2000)*2,math.ceil(terrain_bounds[3]/2000)*2,2):
            tile=box(x*1000,y*1000,(x+2)*1000,(y+2)*1000)
            if any(tile.distance(Point(a,b))<=radius for a,b,radius in windows):
                result.append(('lod',f'https://download1.bayernwolke.de/a/lod2/citygml/{x}_{y}.gml'))
    return result


def bw_dgm_url(x,y):
    request=requests.Request('GET','https://owsproxy.lgl-bw.de/owsproxy/wcs/WCS_INSP_BW_Hoehe_Coverage_DGM1',params=[
        ('SERVICE','WCS'),('REQUEST','GetCoverage'),('VERSION','2.0.1'),('COVERAGEID','EL.ElevationGridCoverage'),
        ('FORMAT','image/tiff'),('SUBSET',f'E({x*1000},{(x+1)*1000})'),('SUBSET',f'N({y*1000},{(y+1)*1000})')]).prepare()
    return request.url


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,required=True)
    parser.add_argument('--district',choices=['03458','09679'],required=True)
    parser.add_argument('--town',required=True)
    parser.add_argument('--weather-municipality',required=True)
    parser.add_argument('--osm-file',type=Path,required=True)
    args=parser.parse_args()
    root=args.root;inputs=root/'inputs';out=root/'public/geo/landscape-tours'/args.district
    preserved=['scene.json','register.json','solar-register.json','provenance.json','data-gaps.json','context-source.json','preparation.json','solar-enrichment.geo.json','showcase-integration.json','assignment-audit.json','terrain-protection.geo.json']
    backup=out/'previous-preparation'
    if (out/'scene.json').exists():
        backup.mkdir(exist_ok=True)
        for name in preserved:
            if (out/name).exists():shutil.copy2(out/name,backup/name)
    prefix='oldenburgkreis' if args.district=='03458' else 'wuerzburgkreis'
    started=time.time();state=dict(district=args.district,status='running',startedAt=dt.datetime.now(dt.timezone.utc).isoformat())
    def status(stage,**values):
        state.update(stage=stage,updatedAt=dt.datetime.now(dt.timezone.utc).isoformat(),elapsedSeconds=round(time.time()-started),**values)
        save(root/'logs'/(args.district+'-status.json'),state);print(stage,values,flush=True)
    def read(name):return json.loads((out/name).read_text())
    def fetch_json(url,params=None):
        for attempt in range(3):
            try:
                response=requests.get(url,params=params,timeout=(20,90));response.raise_for_status();return response.json()
            except (requests.RequestException,ValueError):
                if attempt==2:raise
                time.sleep(5*(attempt+1))
    # Index source manifests once, rather than re-reading them for every tile.
    reuse={}
    for manifest in inputs.glob('*sources.json'):
        for entry in json.loads(manifest.read_text()):
            if entry.get('url'):reuse.setdefault(entry['url'],[]).append(entry)
    def download(kind,url):
        name=prefix+'-'+kind+'-'+(hashlib.sha256(url.encode()).hexdigest()[:20]+'.tif' if kind=='dgm-bw' else url.rsplit('/',1)[-1])
        if Path(name).name!=name:raise ValueError('Invalid source basename')
        path=inputs/name
        if not path.exists():
            # Reuse a byte-identical source tile already cached for another tour.
            for entry in reuse.get(url,[]):
                cached=inputs/entry['file']
                if cached.exists() and digest(cached)==entry['sha256']:
                    os.link(cached,path);break
        if not path.exists():
            if shutil.disk_usage(inputs).free<2*1024**3:raise RuntimeError('Insufficient disk space; no automatic storage expansion')
            temporary=path.with_suffix(path.suffix+'.part')
            for attempt in range(3):
                try:
                    with requests.get(url,stream=True,timeout=(20,120)) as response:
                        response.raise_for_status()
                        with temporary.open('wb') as stream:
                            for chunk in response.iter_content(1024*1024):stream.write(chunk)
                    if not temporary.stat().st_size:raise ValueError('Empty official source tile')
                    temporary.replace(path);break
                except (requests.RequestException,ValueError):
                    if attempt==2:raise
                    time.sleep(10*(attempt+1))
        return dict(file=name,url=url,sha256=digest(path))
    try:
        status('boundaries')
        feature=read('boundary.geo.json');boundary=shape(feature['geometry']);members=read('municipal-boundaries.geo.json')['features']
        if not boundary.is_valid or feature['properties']['id']!=args.district or not feature['properties'].get('sourceUrl'):raise ValueError('Valid sourced district boundary required')
        if not members or len({m['properties']['id'] for m in members})!=len(members):raise ValueError('Unique municipal boundaries required')
        if any(not m['properties']['id'].startswith(args.district) or not shape(m['geometry']).is_valid for m in members):raise ValueError('Invalid district municipality')
        if args.weather_municipality not in {m['properties']['id'] for m in members}:raise ValueError('Weather municipality is outside district')
        wind_path=inputs/'national-register/wind.json';solar_path=inputs/'national-register/solar.json'
        wind=json.loads(wind_path.read_text());solar=json.loads(solar_path.read_text())
        if solar.get('kind')!='solar' or solar.get('status')!='complete':raise ValueError('Complete national solar snapshot required')
        rows=district_units(wind,boundary,members)
        save(out/'register.json',dict(checkedAt=wind['checkedAt'],boundarySource=feature['properties'].get('source','Supplied official boundary'),feature=feature,turbines=rows,stock=None))
        metric_boundary=transform(Transformer.from_crs(4326,25832,always_xy=True).transform,boundary)
        metric_members={m['properties']['id']:transform(Transformer.from_crs(4326,25832,always_xy=True).transform,shape(m['geometry'])) for m in members}
        distances=[]
        metric_point=Transformer.from_crs(4326,25832,always_xy=True).transform
        for row in rows:
            point=Point(*metric_point(row['lon'],row['lat']));distances.append(dict(unitId=row['mastr_nr'],districtDistanceMetres=round(metric_boundary.boundary.distance(point),1),municipalityDistanceMetres=round(metric_members[row['coordinateMunicipality']].boundary.distance(point),1)))
        save(out/'assignment-audit.json',dict(sourceUrl=wind['sourceUrl'],sourceSha256=digest(wind_path),selected=len(rows),municipalities=len(members),boundaryDistances=distances,nearBoundaryUnits=[d for d in distances if min(d['districtDistanceMetres'],d['municipalityDistanceMetres'])<100],rule='Coordinate inside supplied BKG VG250 district and exactly one municipality; no buffer; not a cadastral survey. Registered region remains separate.'))
        status('osm-context',windUnits=len(rows),municipalities=len(members))
        cache=inputs/(args.district+'-district-context.json')
        osm_sha=digest(args.osm_file);boundary_sha=digest(out/'boundary.geo.json')
        cached=json.loads(cache.read_text()) if cache.exists() else None
        if cached and cached.get('sourceSha256')==osm_sha and cached.get('boundarySha256')==boundary_sha:
            context=cached['context'];candidates=[dict(c,geometry=shape(c['geometry'])) for c in cached['candidates']]
        else:
            import osmium
            factory=osmium.geom.GeoJSONFactory();context=[];candidates=[]
            node_cache=inputs/(args.district+'-node-locations.cache')
            node_cache.unlink(missing_ok=True)
            processor=osmium.FileProcessor(str(args.osm_file)).with_locations('sparse_file_array,'+str(node_cache)).with_areas().with_filter(osmium.filter.KeyFilter('place','waterway','natural','plant:source','generator:source'))
            for entity in processor:
                tags=dict(entity.tags)
                if isinstance(entity,osmium.osm.Node) and tags.get('place') and entity.location.valid() and boundary.covers(Point(entity.location.lon,entity.location.lat)):
                    context.append(dict(type='node',id=entity.id,lon=entity.location.lon,lat=entity.location.lat,tags={k:v for k,v in tags.items() if k in ('name','place')}))
                elif isinstance(entity,osmium.osm.Way) and (tags.get('waterway') or tags.get('natural')=='water') and len(entity.nodes)>1 and all(n.location.valid() for n in entity.nodes):
                    points=[dict(lon=n.lon,lat=n.lat) for n in entity.nodes]
                    from shapely.geometry import LineString
                    if LineString([(p['lon'],p['lat']) for p in points]).intersects(boundary):context.append(dict(type='way',id=entity.id,geometry=points,tags={k:v for k,v in tags.items() if k in ('waterway','natural')}))
                elif entity.is_area() and (tags.get('plant:source')=='solar' or tags.get('generator:source')=='solar'):
                    if tags.get('location')=='roof' or tags.get('generator:location')=='roof':continue
                    geometry=shape(json.loads(factory.create_multipolygon(entity)))
                    if not geometry.is_empty and geometry.is_valid and geometry.intersects(boundary):candidates.append(dict(id=('way/' if entity.from_way() else 'relation/')+str(entity.orig_id()),geometry=geometry,tags={k:v for k,v in tags.items() if k in ('name','power','plant:source','generator:source','location','generator:location','ref:mastr')}))
            del processor
            node_cache.unlink(missing_ok=True)
            save(cache,dict(sourceSha256=osm_sha,boundarySha256=boundary_sha,context=context,candidates=[dict(c,geometry=mapping(c['geometry'])) for c in candidates]))
        osm_source='https://download.geofabrik.de/europe/germany/'+('' if args.district=='03458' else 'bayern/')+args.osm_file.name
        save(inputs/(args.district+'-osm.json'),dict(sourceUrl=osm_source,sourceSha256=osm_sha,elements=context))
        towns=[p for p in context if p['type']=='node' and p.get('tags',{}).get('name')==args.town and p['tags'].get('place') in ('town','city','village')]
        if len(towns)!=1:raise ValueError('Unique sourced start town required')
        town=towns[0];town_owners=[m for m in members if shape(m['geometry']).covers(Point(town['lon'],town['lat']))]
        if len(town_owners)!=1 or town_owners[0]['properties']['id']!=args.weather_municipality:raise ValueError('Town/weather municipality mismatch')
        features,leads=solar_evidence(candidates,solar['units'],boundary)
        save(out/'solar-enrichment.geo.json',dict(type='FeatureCollection',features=features,checkedAt=solar['checkedAt'],sourceUrl=osm_source,sourceSha256=osm_sha,attribution='OpenStreetMap contributors, ODbL-1.0',researchLeads=leads))
        save(out/'preparation.json',dict(prefix=prefix,townName=args.town,townLabel=args.town,weatherMunicipality=args.weather_municipality,solarFootprints={},solarRegisterCache='inputs/national-register/solar.json',allowOuterTerrainGaps=args.district=='09679',buildingLicense='CC BY 4.0 · LGLN (2026)' if args.district=='03458' else 'CC BY 4.0 · Bayerische Vermessungsverwaltung',terrainLicense='CC BY 4.0 · LGLN (2026)' if args.district=='03458' else 'CC BY 4.0 · Bayerische Vermessungsverwaltung'))
        metric=Transformer.from_crs(4326,25832,always_xy=True);geographic=Transformer.from_crs(25832,4326,always_xy=True)
        coords=[metric.transform(r['lon'],r['lat']) for r in rows]+[metric.transform(town['lon'],town['lat'])]
        windows=[(*coords[-1],550)]+wind_destination_windows(coords[:-1])
        for entry in features:
            geometry=shape(entry['geometry']);parts=[geometry] if geometry.geom_type=='Polygon' else list(geometry.geoms)
            if any(part.interiors for part in parts) or not boundary.covers(geometry):continue
            for part in parts:coords.extend(metric.transform(x,y) for x,y in part.exterior.coords)
            anchor=transform(metric.transform,geometry).representative_point();windows.append((anchor.x,anchor.y,350))
        xs,ys=zip(*coords);bounds=(math.floor((min(xs)-650)/20)*20,math.floor((min(ys)-650)/20)*20,math.ceil((max(xs)+650)/20)*20,math.ceil((max(ys)+650)/20)*20)
        terrain_protection=unary_union([metric_boundary,MultiPoint(coords).convex_hull.buffer(650)]+[Point(a,b).buffer(radius+40) for a,b,radius in windows])
        save(out/'terrain-protection.geo.json',dict(type='Feature',crs='ETRS89_UTM32',geometry=mapping(terrain_protection),properties=dict(rule='Entire district plus convex flight corridor and object/building windows; missing heights are allowed only outside this union',boundarySha256=boundary_sha)))
        if args.district=='09679':
            jobs=[]
            for kind,url in bavarian_tiles(bounds,windows):
                x,y=map(int,url.rsplit('/',1)[-1].split('.')[0].split('_'))
                if kind=='lod' or box(x*1000,y*1000,(x+1)*1000,(y+1)*1000).intersects(terrain_protection):jobs.append((kind,url))
        else:
            geographic_bounds=transform(geographic.transform,box(*bounds)).bounds
            area={'dgm':box(*bounds),'lod':unary_union([Point(a,b).buffer(radius) for a,b,radius in windows])};jobs=[]
            for host,collection,asset,kind in [('dgm','dgm1','dgm1-tif','dgm'),('lod','lod2','lod2-gml','lod')]:
                url=f'https://{host}.stac.lgln.niedersachsen.de/search';params={'collections':collection,'bbox':','.join(map(str,geographic_bounds)),'limit':300};selected={};visited=set()
                while url:
                    if url in visited:raise ValueError('Repeated STAC pagination URL')
                    visited.add(url);page=fetch_json(url,params);params=None
                    for item in page['features']:
                        if not transform(metric.transform,shape(item['geometry'])).intersects(area[kind]):continue
                        cell=tuple(item['id'].split('_')[2:4]);stamp=item['properties'].get('datetime') or item['properties'].get('start_datetime') or item['id']
                        if cell not in selected or stamp>selected[cell][0]:selected[cell]=(stamp,item)
                    url=next((link['href'] for link in page.get('links',[]) if link['rel']=='next'),None)
                jobs.extend((kind,item['assets'][asset]['href']) for _,item in selected.values())
        if args.district=='09679':
            status('classify-terrain',totalFiles=len(jobs))
            coverage_path=inputs/(prefix+'-coverage-index.json')
            coverage=json.loads(coverage_path.read_text()) if coverage_path.exists() else {}
            classified=[];session=requests.Session()
            for index,(kind,url) in enumerate(jobs,1):
                if kind!='dgm':classified.append((kind,url));continue
                path=inputs/(prefix+'-dgm-'+url.rsplit('/',1)[-1])
                if path.exists():code=200
                elif url in coverage:code=coverage[url]['httpStatus']
                else:
                    response=session.head(url,timeout=(15,30))
                    if response.status_code not in (200,404):response.raise_for_status();raise ValueError('Unexpected official source status')
                    code=response.status_code
                    coverage[url]=dict(httpStatus=code,checkedAt=dt.datetime.now(dt.timezone.utc).isoformat())
                    save(coverage_path,coverage)
                if code==404:
                    x,y=map(int,url.rsplit('/',1)[-1].split('.')[0].split('_'))
                    classified.append(('dgm-bw',bw_dgm_url(x,y)))
                else:classified.append((kind,url))
                if index%50==0:status('classify-terrain',classifiedFiles=index,bwTiles=sum(k=='dgm-bw' for k,_ in classified))
            jobs=classified
            gap_audit=out/'terrain-gap-audit.json'
            if gap_audit.exists():
                gaps=json.loads(gap_audit.read_text())
                # A diagnosed partial-NoData Bayerische tile may return HTTP 200.
                # Add only the exact audited one-kilometre source windows.
                additions=[('dgm-bw',bw_dgm_url(tile['east'],tile['north'])) for tile in gaps['tiles']]
                jobs+= [job for job in additions if job not in jobs]
            bw_count=sum(kind=='dgm-bw' for kind,_ in jobs)
            if bw_count:
                config=read('preparation.json');config['terrainLicense']+='; Datenquelle: LGL, www.lgl-bw.de, dl-de/by-2-0';save(out/'preparation.json',config)
            status('classified',bwTiles=bw_count)
        if not jobs or not any(kind=='lod' for kind,_ in jobs) or not any(kind=='dgm' for kind,_ in jobs):raise ValueError('Missing official terrain/building tiles')
        save(inputs/(prefix+'-download-plan.json'),dict(bounds=bounds,files=jobs,windUnits=len(rows),solarOutlines=len(features)))
        status('download',totalFiles=len(jobs),solarOutlines=len(features))
        manifest_path=inputs/(prefix+'-sources.json');manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else []
        for index,(kind,url) in enumerate(jobs,1):
            entry=download(kind,url);manifest=[old for old in manifest if old['file']!=entry['file']]+[entry];save(manifest_path,manifest);status('download',completedFiles=index,lastFile=entry['file'])
        gaps=[dict(kind='wind-field',unitId=r['mastr_nr'],field=field,status='research-required') for r in rows for field in ('nabenhoehe_m','rotor_m','brutto_kw','hersteller','typ') if r.get(field) is None]
        gaps += [dict(kind='register-coordinate',unitId=u['id'],technology=stock['kind'],status='research-required') for stock in (wind,solar) for u in stock['units'] if (u.get('lat') is None or u.get('lon') is None) and str(u.get('municipalityCode') or '').startswith(args.district)]
        gaps += [dict(kind='solar-outline-or-link',unitId=u['id'],status='research-required') for u in solar['units'] if u.get('lat') is not None and u.get('lon') is not None and boundary.covers(Point(u['lon'],u['lat']))]
        save(out/'data-gaps.json',dict(checkedAt=solar['checkedAt'],gaps=gaps,previewChecksRequired=['Browser performance and every destination surface']))
        status('prepare')
        env={**os.environ,'GDAL_CACHEMAX':'128','OPENBLAS_NUM_THREADS':'1','OMP_NUM_THREADS':'1'}
        subprocess.run([sys.executable,str(root/'scripts/landscape-tour-prepare.py'),str(inputs),args.district],check=True,env=env)
        subprocess.run([sys.executable,str(root/'scripts/landscape-showcase-enrich.py'),'--root',str(root),'--district',args.district],check=True,env=env)
        scene=read('scene.json')
        if {t['id'] for t in scene['turbines']}!={r['mastr_nr'] for r in rows}:raise ValueError('Prepared scene omitted wind units')
        audit=read('provenance.json');audit['limitations'].append('Assignments use BKG VG250 administrative boundaries, not cadastral surveying; units within 100 metres of district or municipal boundaries are flagged in assignment-audit.json.')
        audit.update(osmSource=osm_source,osmSourceSha256=osm_sha,coordinateAssignmentAudit='assignment-audit.json',weatherMunicipality=args.weather_municipality);save(out/'provenance.json',audit)
        status('ready',status='ready',windUnits=len(rows),buildings=len(scene['buildings']),solarComponents=len(scene['solar']),stops=len(scene['stops']),sceneBytes=(out/'scene.json').stat().st_size)
        return 0
    except Exception as error:
        if backup.exists():
            for name in preserved:
                if (backup/name).exists():
                    temporary=out/(name+'.restore');shutil.copy2(backup/name,temporary);temporary.replace(out/name)
        (inputs/(args.district+'-node-locations.cache')).unlink(missing_ok=True)
        status('failed',status='failed',error=str(error));return 75 if isinstance(error,requests.RequestException) and (getattr(getattr(error,'response',None),'status_code',500)>=500 or getattr(getattr(error,'response',None),'status_code',None)==429) else 1


if __name__=='__main__':sys.exit(main())
