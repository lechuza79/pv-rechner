"""Restartable RLP landscape worker. Public inputs only; no database credentials.

Downloads run sequentially. Outputs use the existing shared scene preparation.
The worker runs independently of the MacBook under a dedicated server unit.
"""
import argparse, datetime, hashlib, json, math, os, re, shutil, subprocess, sys, time
from pathlib import Path
import requests
from pyproj import Transformer
from shapely.geometry import Point, Polygon, LineString, box, shape
from shapely.ops import transform

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--root',type=Path,required=True)
parser.add_argument('--district',default='07335')
parser.add_argument('--town',default='Landstuhl')
args=parser.parse_args()
root=args.root; inputs=root/'inputs'; output=root/'public/geo/landscape-tours'/args.district
output.mkdir(parents=True,exist_ok=True); inputs.mkdir(parents=True,exist_ok=True)
state_path=root/'logs'/f'{args.district}-status.json'
state_path.parent.mkdir(exist_ok=True)
started=time.time(); state={'district':args.district,'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'running'}

def save(path,value):
 tmp=path.with_suffix(path.suffix+'.tmp');tmp.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':')));tmp.replace(path)
def status(stage,**values):
 state.update(stage=stage,updatedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),elapsedSeconds=round(time.time()-started),**values);save(state_path,state);print(stage,values,flush=True)
def read_json(url,path,params=None):
 if path.exists():return json.loads(path.read_text())
 for attempt in range(3):
  try:
   response=requests.get(url,params=params,timeout=(15,90));response.raise_for_status();value=response.json();save(path,value);return value
  except (requests.RequestException,ValueError):
   if attempt==2:raise
   time.sleep(5*(attempt+1))

def digest(path):
 h=hashlib.sha256()
 with path.open('rb') as stream:
  for chunk in iter(lambda:stream.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()

def index(url,path):
 if path.exists():return json.loads(path.read_text())
 response=requests.get(url,timeout=(15,90));response.raise_for_status()
 names=[n for n in re.findall(r'href="([^"]+)"',response.text) if re.fullmatch(r'[A-Za-z0-9_]+\.(?:tif|gml)',n)]
 if not names:raise ValueError('Empty official tile index')
 save(path,names);return names

def download(url,path):
 if path.exists():return digest(path)
 if shutil.disk_usage(inputs).free<2*1024**3:raise RuntimeError('Insufficient disk space for safe preparation')
 temporary=path.with_suffix(path.suffix+'.part')
 for attempt in range(3):
  try:
   with requests.get(url,stream=True,timeout=(20,120)) as response:
    response.raise_for_status()
    with temporary.open('wb') as stream:
     for chunk in response.iter_content(1024*1024):stream.write(chunk)
   if not temporary.stat().st_size:raise ValueError('Empty source tile')
   temporary.replace(path);return digest(path)
  except (requests.RequestException,ValueError):
   if attempt==2:raise
   time.sleep(10*(attempt+1))

def run():
 status('boundaries')
 endpoint='https://www.geoportal.rlp.de/spatial-objects/314/collections/vermkv:landkreise_rlp/items'
 counties=read_json(endpoint,inputs/'rlp-counties.json',{'f':'json','limit':100})
 found=[f for f in counties['features'] if f['properties']['kreissch']==int(args.district[2:]) and f['properties']['kreistyp']=='Landkreis']
 if len(found)!=1:raise ValueError('No unique official district boundary')
 feature=found[0];feature['properties'].update(id=args.district,name='Landkreis '+feature['properties']['ldkreis'],source='LVermGeoRP administrative district boundary',sourceUrl=endpoint,license='dl-de/by-2-0')
 boundary=shape(feature['geometry'])
 if not boundary.is_valid:raise ValueError('Invalid official boundary')
 save(output/'boundary.geo.json',feature)
 municipalities=read_json('https://www.geoportal.rlp.de/spatial-objects/314/collections/vermkv:gemeinde_rlp/items',inputs/'municipalities.json',{'f':'json','bbox':','.join(map(str,boundary.bounds)),'limit':1000})
 members=[f for f in municipalities['features'] if f['properties']['kreissch']==int(args.district[2:])]
 if args.district=='07335' and len(members)!=50:raise ValueError('Incomplete Kaiserslautern municipality boundaries')
 save(output/'municipal-boundaries.geo.json',{'type':'FeatureCollection','features':members})
 candidates=json.loads((inputs/(args.district+'-wind-candidates.json')).read_text())
 b=boundary.bounds;c=candidates['bounds']
 if not(c['minLon']<=b[0] and c['minLat']<=b[1] and c['maxLon']>=b[2] and c['maxLat']>=b[3]):raise ValueError('Candidate window does not cover official boundary')
 rows=[]
 for row in candidates['turbines']:
  point=Point(row['lon'],row['lat'])
  if boundary.covers(point):
   owners=[m for m in members if shape(m['geometry']).covers(point)]
   if len(owners)!=1:raise ValueError('Ambiguous municipality for '+row['mastr_nr'])
   owner=owners[0]['properties'];rows.append(dict(row,coordinateMunicipality='07'+str(owner['gmdesch']).zfill(6),coordinateMunicipalityName=owner['gemeinde']))
 if not rows:raise ValueError('No coordinate-selected wind units')
 save(output/'register.json',{'checkedAt':candidates['checkedAt'],'turbines':rows})
 subprocess.run([sys.executable,str(root/'scripts/landscape-data-gaps.py'),'--root',str(root),'--district',args.district,'--refresh-wind'],check=True)
 rows=json.loads((output/'register.json').read_text())['turbines']
 save(output/'register.json',{'checkedAt':candidates['checkedAt'],'boundarySource':feature['properties']['source'],'feature':feature,'turbines':rows,'stock':None})
 save(output/'assignment-audit.json',{'candidates':len(candidates['turbines']),'selected':len(rows),'municipalities':len(members),'missingDimensions':[r['mastr_nr'] for r in rows if not r['nabenhoehe_m'] or not r['rotor_m']],'rule':'Coordinate inside official district and exactly one official municipality; no buffer. Register region field retained separately.'})
 status('context',windUnits=len(rows),municipalities=len(members))
 west,south,east,north=boundary.bounds
 osm_path=inputs/(args.district+'-osm.json')
 if osm_path.exists():osm=json.loads(osm_path.read_text())
 else:
  import osmium
  osm_url='https://download.geofabrik.de/europe/germany/rheinland-pfalz-260930.osm.pbf'
  pbf=inputs/'rheinland-pfalz-260930.osm.pbf'
  status('osm-download',osmSource=osm_url)
  osm_sha=download(osm_url,pbf)
  status('osm-extract',osmSha256=osm_sha)
  elements=[]
  class Context(osmium.SimpleHandler):
   def node(self,node):
    tags=dict(node.tags)
    if tags.get('place') and node.location.valid() and boundary.covers(Point(node.location.lon,node.location.lat)):
     elements.append(dict(type='node',id=node.id,lon=node.location.lon,lat=node.location.lat,tags={k:v for k,v in tags.items() if k in ['place','name']}))
   def way(self,way):
    tags=dict(way.tags)
    if not(tags.get('waterway') or tags.get('natural')=='water' or tags.get('power')=='plant' and tags.get('plant:source')=='solar'):return
    if len(way.nodes)<2 or not all(n.location.valid() for n in way.nodes):return
    points=[(n.lon,n.lat) for n in way.nodes]
    if not LineString(points).intersects(boundary):return
    elements.append(dict(type='way',id=way.id,geometry=[dict(lon=x,lat=y) for x,y in points],tags={k:v for k,v in tags.items() if k in ['waterway','natural','power','plant:source','name','ref:mastr']}))
  handler=Context()
  # The native key filter discards unrelated objects before entering Python,
  # while the location cache still sees all nodes needed by retained ways.
  processor=osmium.FileProcessor(str(pbf)).with_locations('flex_mem').with_filter(osmium.filter.KeyFilter('place','waterway','natural','plant:source'))
  for entity in processor:
   if isinstance(entity,osmium.osm.Node):handler.node(entity)
   elif isinstance(entity,osmium.osm.Way):handler.way(entity)
  osm={'sourceUrl':osm_url,'sourceSha256':osm_sha,'elements':elements};save(osm_path,osm)
 towns=[e for e in osm['elements'] if e['type']=='node' and e.get('tags',{}).get('name')==args.town and e.get('tags',{}).get('place') in ['town','city','village'] and boundary.covers(Point(e['lon'],e['lat']))]
 if len(towns)!=1:raise ValueError('No unique sourced town point')
 town=towns[0]
 town_members=[m for m in members if shape(m['geometry']).covers(Point(town['lon'],town['lat']))]
 if len(town_members)!=1:raise ValueError('Ambiguous town municipality')
 weather_id='07'+str(town_members[0]['properties']['gmdesch']).zfill(6)
 solar={}
 for element in osm['elements']:
  if element['type']!='way' or element.get('tags',{}).get('plant:source')!='solar' or 'geometry' not in element:continue
  ring=[(p['lon'],p['lat']) for p in element['geometry']]
  if len(ring)<4 or ring[0]!=ring[-1]:continue
  polygon=Polygon(ring)
  if polygon.is_valid and boundary.covers(polygon):solar[element['id']]=element.get('tags',{}).get('name') or 'Solarpark bei '+next((m['properties']['gemeinde'] for m in members if shape(m['geometry']).covers(polygon.representative_point())),'Kaiserslautern')
 config={'prefix':'klkreis','townName':args.town,'townLabel':args.town,'weatherMunicipality':weather_id,'solarFootprints':solar}
 save(output/'preparation.json',config)
 metric=Transformer.from_crs(4326,25832,always_xy=True)
 coords=[metric.transform(r['lon'],r['lat']) for r in rows]+[metric.transform(town['lon'],town['lat'])]
 for element in osm['elements']:
  if element['id'] in solar:coords.extend(metric.transform(p['lon'],p['lat']) for p in element['geometry'])
 enrichment_windows=[]
 enrichment_file=output/'solar-enrichment.geo.json'
 if enrichment_file.exists():
  for entry in json.loads(enrichment_file.read_text())['features']:
   geometry=shape(entry['geometry'])
   parts=[geometry] if geometry.geom_type=='Polygon' else list(geometry.geoms) if geometry.geom_type=='MultiPolygon' else []
   if not parts or not geometry.is_valid or any(p.interiors for p in parts) or not boundary.covers(geometry):continue
   for part in parts:coords.extend(metric.transform(x,y) for x,y in part.exterior.coords)
   anchor=transform(metric.transform,geometry).representative_point();enrichment_windows.append((anchor.x,anchor.y,350))
 xs,ys=zip(*coords)
 bounds=(math.floor((min(xs)-650)/20)*20,math.floor((min(ys)-650)/20)*20,math.ceil((max(xs)+650)/20)*20,math.ceil((max(ys)+650)/20)*20)
 dgm_url='https://geobasis-rlp.de/data/dgm1/current/tif/'
 lod_url='https://geobasis-rlp.de/data/geb3dlo/current/gml/'
 dgms=index(dgm_url,inputs/'dgm-index.json');lods=index(lod_url,inputs/'lod-index.json')
 grid={}
 for name in dgms:
  match=re.fullmatch(r'dgm1_32_(\d+)_(\d+)_1_rp_(\d+)\.tif',name)
  if match:
   x,y,year=map(int,match.groups());key=(x,y)
   if key not in grid or name>grid[key]:grid[key]=name
 requested=[]
 for x in range(math.floor(bounds[0]/1000),math.ceil(bounds[2]/1000)):
  for y in range(math.floor(bounds[1]/1000),math.ceil(bounds[3]/1000)):
   if (x,y) not in grid:raise ValueError(f'Missing official terrain tile {x},{y}')
   name=grid[(x,y)];requested.append(('klkreis-dgm-'+name,dgm_url+name))
 windows=[(*metric.transform(town['lon'],town['lat']),550)]+enrichment_windows
 windows += [(*metric.transform(r['lon'],r['lat']),350) for r in rows]
 for element in osm['elements']:
  if element['id'] in solar:
   p=Polygon([metric.transform(p['lon'],p['lat']) for p in element['geometry']]).representative_point();windows.append((p.x,p.y,350))
 for name in lods:
  match=re.fullmatch(r'LoD2_32_(\d+)_(\d+)_2_RP\.gml',name)
  if not match:continue
  x,y=map(int,match.groups());tile=box(x*1000,y*1000,(x+2)*1000,(y+2)*1000)
  if any(tile.distance(Point(a,b))<=radius for a,b,radius in windows):requested.append(('klkreis-lod-'+name,lod_url+name))
 save(inputs/'klkreis-download-plan.json',{'bounds':bounds,'files':requested,'solarFootprints':len(solar),'windUnits':len(rows)})
 manifest_path=inputs/'klkreis-sources.json'
 manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else []
 done={m['file'] for m in manifest}
 status('download',totalFiles=len(requested),completedFiles=len(done),solarFootprints=len(solar))
 for filename,url in requested:
  path=inputs/filename
  if filename not in done or not path.exists():
   sha=download(url,path);manifest=[m for m in manifest if m['file']!=filename]+[{'file':filename,'url':url,'sha256':sha}];save(manifest_path,manifest);done.add(filename)
  status('download',completedFiles=len(done),lastFile=filename)
 status('prepare')
 subprocess.run([sys.executable,str(root/'scripts/landscape-tour-prepare.py'),str(inputs),args.district],check=True,env={**os.environ,'GDAL_CACHEMAX':'128','OPENBLAS_NUM_THREADS':'1','OMP_NUM_THREADS':'1'})
 status('solar-register')
 subprocess.run([sys.executable,str(root/'scripts/landscape-solar-register.py'),'--root',str(root),'--district',args.district],check=True)
 scene=json.loads((output/'scene.json').read_text())
 if {t['id'] for t in scene['turbines']}!={t['mastr_nr'] for t in rows}:raise ValueError('Scene omitted registered wind units')
 if not scene['buildings'] or not all(math.isfinite(v) for v in scene['terrain']['elevations']):raise ValueError('Incomplete prepared scene')
 audit_path=output/'provenance.json';audit=json.loads(audit_path.read_text());audit['osmSource']=osm.get('sourceUrl');audit['osmSourceSha256']=osm.get('sourceSha256');audit['coordinateAssignmentAudit']='assignment-audit.json';audit['weatherMunicipality']=weather_id;save(audit_path,audit)
 subprocess.run([sys.executable,str(root/'scripts/landscape-data-gaps.py'),'--root',str(root),'--district',args.district],check=True)
 if enrichment_file.exists():
  status('integrate-evidenced-outlines')
  subprocess.run([sys.executable,str(root/'scripts/landscape-showcase-enrich.py'),'--root',str(root),'--district',args.district],check=True)
  scene=json.loads((output/'scene.json').read_text())
 status('ready',status='ready',buildings=len(scene['buildings']),windUnits=len(rows),stops=len(scene['stops']),sceneBytes=(output/'scene.json').stat().st_size)

# Preserve the last usable scene and dependent evidence if a rebuild fails.
preserved_names=['scene.json','register.json','solar-register.json','provenance.json','data-gaps.json','context-source.json','assignment-audit.json','preparation.json']
previous=output/'previous-preparation'
previous.mkdir(exist_ok=True)
for name in preserved_names:
 path=output/name
 if path.exists():shutil.copy2(path,previous/name)
try:run()
except BaseException as error:
 for name in preserved_names:
  saved=previous/name
  if saved.exists():
   temporary=output/(name+'.restore');shutil.copy2(saved,temporary);temporary.replace(output/name)
 status('failed',status='failed',error=str(error))
 if isinstance(error,requests.RequestException):sys.exit(75)
 raise
