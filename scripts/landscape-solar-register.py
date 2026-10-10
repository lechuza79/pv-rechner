"""Cache active MaStR ground-solar technical fields and spatially link prepared parks.

Credentials and operator/address fields are neither required nor saved.
A matched footprint is a spatial display association, never an ownership claim.
"""
import argparse,datetime,json,time
from pathlib import Path
import requests
from pyproj import Transformer
from shapely.geometry import Point,Polygon
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--root',type=Path,required=True)
parser.add_argument('--district',required=True)
args=parser.parse_args();root=args.root
cache=root/'inputs'/'ground-solar-register.json';out=root/'public/geo/landscape-tours'/args.district
api='https://www.marktstammdatenregister.de/MaStR/Einheit/EinheitJson/GetErweiterteOeffentlicheEinheitStromerzeugung'
def save(path,value):
 tmp=path.with_suffix(path.suffix+'.tmp');tmp.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':')));tmp.replace(path)
if not cache.exists():
 units=[];expected=None
 for page in range(1,1000):
  query={'page':page,'pageSize':1000,'filter':"Art der Solaranlage~eq~'852'~and~Betriebs-Status~eq~'35'",'sort[0][field]':'Id','sort[0][dir]':'asc'}
  response=requests.get(api,params=query,timeout=(20,120));response.raise_for_status();payload=response.json()
  if payload.get('Errors'):raise ValueError(payload['Errors'])
  if expected is None:expected=payload['Total']
  if payload['Total']!=expected:raise ValueError('Register changed during read; repeat the snapshot')
  for row in payload['Data']:
   if row['ArtDerSolaranlageId']!=852 or row['BetriebsStatusId']!=35:raise ValueError('Register ignored the active ground-solar filter')
   units.append({'id':row['MaStRNummer'],'capacityKw':row['Bruttoleistung'],'lon':row['Laengengrad'],'lat':row['Breitengrad'],'direction':row['HauptausrichtungSolarModuleBezeichnung']})
  print('solar register',page,len(units),'of',expected,flush=True)
  if len(units)>=expected:break
  time.sleep(1)
 if len(units)!=expected or len({u['id'] for u in units})!=expected:raise ValueError('Incomplete or duplicated register snapshot')
 save(cache,{'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceUrl':api,'filter':query['filter'],'units':units})
stock=json.loads(cache.read_text());scene=json.loads((out/'scene.json').read_text());east,north,_=scene['origin'];metric=Transformer.from_crs(4326,25832,always_xy=True)
polygons={field['id']:Polygon(field['ring']) for field in scene['solar']};matches={key:[] for key in polygons};ambiguous=[];ambiguous_fields=set()
for unit in stock['units']:
 if unit['lon'] is None or unit['lat'] is None:continue
 x,y=metric.transform(unit['lon'],unit['lat']);point=Point(x-east,north-y)
 inside=[key for key,polygon in polygons.items() if polygon.covers(point)]
 if len(inside)>1:ambiguous.append(unit['id']);ambiguous_fields.update(inside);continue
 if len(inside)==1:matches[inside[0]].append(unit)
parks=[]
for field in scene['solar']:
 units=matches[field['id']];ids=[u['id'] for u in units]
 # Unknown unit capacities must not be silently added as zero.
 capacity=sum(u['capacityKw'] for u in units) if field['id'] not in ambiguous_fields and units and all(u['capacityKw'] is not None for u in units) else None
 field['registerReferences']=ids
 stop=next(s for s in scene['stops'] if s['id']=='solar-'+field['id'][len('osm-way-'):]);stop.update(capacityKw=capacity,unitIds=ids)
 parks.append({'footprintId':field['id'],'capacityKw':capacity,'units':units})
save(out/'scene.json',scene)
evidence={'checkedAt':stock['checkedAt'],'sourceUrl':stock['sourceUrl'],'selection':'Active register coordinates inside exactly one mapped ground-solar park; display association only, no operator, payment or ownership inference.','parks':parks,'ambiguousUnits':ambiguous,'modelLimitations':'Shared municipal weather profile, not a measured or orientation-specific park forecast. Mapped solar parks are a subset of all register ground-mounted units.'}
save(out/'solar-register.json',evidence)
audit=json.loads((out/'provenance.json').read_text());audit['solarRegister']={'checkedAt':stock['checkedAt'],'evidenceFile':'solar-register.json','mappedParks':len(parks),'linkedParks':sum(p['capacityKw'] is not None for p in parks),'unlinkedParks':[p['footprintId'] for p in parks if p['capacityKw'] is None]};save(out/'provenance.json',audit)
print('solar parks linked',audit['solarRegister'],flush=True)
