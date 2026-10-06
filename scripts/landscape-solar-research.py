"""Find real solar outlines omitted by the first plant-way-only extraction.

Runs on the preparation server. Reuses the OSM snapshot; no paid API or AI.
Register coordinates must lie inside an explicit solar polygon. Proximity is
recorded as a research lead only and never authorizes an automatic association.
"""
import argparse, datetime, json
from pathlib import Path
import osmium
from shapely.geometry import Point, shape, mapping
from shapely.ops import transform
from pyproj import Transformer

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--root',type=Path,required=True)
parser.add_argument('--district',required=True)
args=parser.parse_args();root=args.root;out=root/'public/geo/landscape-tours'/args.district
inputs=root/'inputs'

def save(name,value):
 path=out/name;temporary=path.with_suffix(path.suffix+'.tmp')
 temporary.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':')));temporary.replace(path)

now=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat()
state={'startedAt':now(),'status':'running','stage':'solar-outlines'}
save('research-status.json',state)
try:
 boundary=shape(json.loads((out/'boundary.geo.json').read_text())['geometry'])
 source=json.loads((inputs/(args.district+'-osm.json')).read_text())
 candidates=[];factory=osmium.geom.GeoJSONFactory()
 processor=osmium.FileProcessor(str(inputs/'rheinland-pfalz-260930.osm.pbf')).with_areas().with_filter(osmium.filter.KeyFilter('plant:source','generator:source'))
 for entity in processor:
  if not entity.is_area():continue
  tags=dict(entity.tags)
  if tags.get('plant:source')!='solar' and tags.get('generator:source')!='solar':continue
  if tags.get('location')=='roof' or tags.get('generator:location')=='roof':continue
  geometry=shape(json.loads(factory.create_multipolygon(entity)))
  if geometry.is_empty or not geometry.is_valid or not geometry.intersects(boundary):continue
  candidates.append({'id':('way/' if entity.from_way() else 'relation/')+str(entity.orig_id()),'geometry':geometry,'tags':{k:v for k,v in tags.items() if k in ['name','power','plant:source','generator:source','location','generator:location','ref:mastr']}})
 print('solar polygons',len(candidates),flush=True)
 units=json.loads((inputs/'ground-solar-register.json').read_text())['units']
 metric=Transformer.from_crs(4326,25832,always_xy=True).transform
 projected={c['id']:transform(metric,c['geometry']) for c in candidates}
 matches=[];leads=[]
 for unit in units:
  if unit['lon'] is None or unit['lat'] is None:continue
  point=Point(unit['lon'],unit['lat'])
  if not boundary.covers(point):continue
  inside=[c for c in candidates if c['geometry'].covers(point)]
  plants=[c for c in inside if c['tags'].get('power')=='plant']
  chosen=plants if plants else inside
  if len(chosen)==1:
   c=chosen[0]
   matches.append({'unitId':unit['id'],'capacityKw':unit['capacityKw'],'lon':unit['lon'],'lat':unit['lat'],'outlineId':c['id'],'outlineKind':'plant' if plants else 'generator','rule':'Active ground-solar register coordinate inside exactly one preferred plant polygon, or one explicit solar generator polygon. A generator outline is not asserted to be the complete park.'})
  else:
   p=transform(metric,point)
   nearest=sorted(({'outlineId':c['id'],'distanceMetres':round(projected[c['id']].distance(p),1)} for c in candidates),key=lambda x:x['distanceMetres'])[:3]
   leads.append({'unitId':unit['id'],'status':'ambiguous' if chosen else 'unmatched','containingOutlines':[c['id'] for c in chosen],'nearbyOutlines':[n for n in nearest if n['distanceMetres']<=500],'automaticAssignment':False})
 used={m['outlineId'] for m in matches}
 features=[{'type':'Feature','geometry':mapping(c['geometry']),'properties':{'id':c['id'],**c['tags'],'osmUrl':'https://www.openstreetmap.org/'+c['id'],'registerUnits':[m for m in matches if m['outlineId']==c['id']]}} for c in candidates if c['id'] in used]
 save('solar-enrichment.geo.json',{'type':'FeatureCollection','features':features,'checkedAt':now(),'sourceUrl':source.get('sourceUrl'),'sourceSha256':source.get('sourceSha256'),'attribution':'OpenStreetMap contributors, ODbL-1.0','researchLeads':leads,'sceneIntegration':'pending: preserve multipolygon holes, generator-versus-park meaning and source identity; never flatten rings silently.'})
 gaps=json.loads((out/'data-gaps.json').read_text())['gaps']
 missing={g.get('unitId') for g in gaps if g['kind']=='solar-outline-or-link'}
 state.update(status='ready',stage='solar-reconciled',finishedAt=now(),solarPolygons=len(candidates),matchedRegisterUnits=len(matches),newlyMatchedMissingUnits=len(missing & {m['unitId'] for m in matches}),unmatchedOrAmbiguous=len(leads),sceneIntegration='pending')
 save('research-status.json',state);print(json.dumps(state),flush=True)
except Exception as error:
 state.update(status='failed',error=str(error),finishedAt=now());save('research-status.json',state)
 raise
