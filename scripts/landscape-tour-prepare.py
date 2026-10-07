"""Prepare bounded real-data tours in a shared metric UTM32/NHN reference.

Sources are downloaded separately into SOURCE_DIRECTORY; no fabricated heights,
buildings, plant outlines, or missing register dimensions are introduced.
"""
import json,sys,hashlib,zipfile,math
import xml.etree.ElementTree as E
from pathlib import Path
from datetime import datetime,timezone
import numpy as np
import rasterio
from rasterio.merge import merge
from landscape_terrain_quality import trim_uncovered_margin, mask_uncovered_outer_surface, assert_measured_points, normalise_bw_crs
from pyproj import Transformer
from shapely.geometry import shape,Polygon,Point,LineString,GeometryCollection
from shapely.ops import transform
root=Path(__file__).resolve().parents[1];source=Path(sys.argv[1])
tr=Transformer.from_crs(4326,25832,always_xy=True)
ns={'b':'http://www.opengis.net/citygml/building/1.0','g':'http://www.opengis.net/gml'}
def osm_data(id):
 p=source/(id+'-osm.json')
 if p.exists():return json.loads(p.read_text())['elements']
 saved=root/'public/geo/landscape-tours'/id/'context-source.json'
 if saved.exists():return json.loads(saved.read_text())['elements']
 # The tiny town fallback comes from the original OSM XML, not guessed coordinates.
 xml=E.parse(source/'hoechberg-osm.xml').getroot();elements=[]
 nodes={n.get('id'):{'lon':float(n.get('lon')),'lat':float(n.get('lat'))} for n in xml.findall('node')}
 for n in xml.findall('node'):
  tags={t.get('k'):t.get('v') for t in n.findall('tag')}
  if tags.get('place'):elements.append(dict(type='node',id=n.get('id'),tags=tags,**nodes[n.get('id')]))
 for w in xml.findall('way'):
  tags={t.get('k'):t.get('v') for t in w.findall('tag')}
  if tags.get('waterway'):elements.append(dict(type='way',id=w.get('id'),tags=tags,geometry=[nodes[n.get('ref')] for n in w.findall('nd')]))
 return elements

def buildings(files,boundary,windows,origin):
 result={}
 def ring(el):
  vals=list(map(float,el.find('.//g:posList',ns).text.split()));pts=[vals[i:i+3] for i in range(0,len(vals),3)]
  if pts and pts[0]==pts[-1]:pts.pop()
  # Some Bavarian deliveries include the UTM zone prefix in easting.
  return [[round((p[0]%1000000)-origin[0],3),round(p[2]-origin[2],3),round(origin[1]-p[1],3)] for p in pts]
 def parse(stream):
  for _,el in E.iterparse(stream,events=('end',)):
   if el.tag!='{'+ns['b']+'}Building':continue
   identifier=el.get('{'+ns['g']+'}id');surfaces=[]
   for kind in ['RoofSurface','WallSurface','GroundSurface']:
    for p in el.findall('.//b:'+kind+'//g:Polygon',ns):
     surfaces.append(dict(kind=kind,points=ring(p.find('g:exterior',ns)),holes=[ring(r) for r in p.findall('g:interior',ns)]))
   pts=[p for s in surfaces for p in s['points']]
   if pts:
    x=sum(p[0]+origin[0] for p in pts)/len(pts);y=sum(origin[1]-p[2] for p in pts)/len(pts)
    if boundary.covers(Point(x,y)) and any((x-a)**2+(y-b)**2<=radius**2 for a,b,radius in windows):result[identifier]=dict(id=identifier,surfaces=surfaces)
   el.clear()
 for file in files:
  if file.suffix=='.zip':
   with zipfile.ZipFile(file) as z:
    for name in z.namelist():
     if name.endswith('.gml'):
      with z.open(name) as stream:parse(stream)
  else:parse(file)
 return list(result.values())

def main(id):
 out=root/'public/geo/landscape-tours'/id;register=json.loads((out/'register.json').read_text());name=register['feature']['properties']['name'];boundary=transform(tr.transform,shape(register['feature']['geometry']));elements=osm_data(id)
 configuration=json.loads((out/'preparation.json').read_text()) if (out/'preparation.json').exists() else {}
 town_name=configuration.get('townName','Kirchhatten' if id=='03458009' else name)
 towns=[e for e in elements if e['type']=='node' and e.get('tags',{}).get('name')==town_name and e['tags'].get('place') in ['town','city','village','hamlet']]
 if not towns:raise ValueError('No sourced town point: '+name)
 town=towns[0];east,north=tr.transform(town['lon'],town['lat']);stops=[dict(id='town',name=configuration.get('townLabel',name),kind='town',x=0,z=0,zoom=12,cta='Nach '+configuration.get('townLabel',name))]
 rows=register['turbines'];remaining=set(range(len(rows)));groups=[]
 coords=[tr.transform(t['lon'],t['lat']) for t in rows]
 # Spatial clusters are camera destinations, not economic or ownership assignments.
 while remaining:
  group={remaining.pop()};todo=list(group)
  while todo:
   a=todo.pop();near={b for b in remaining if np.hypot(coords[a][0]-coords[b][0],coords[a][1]-coords[b][1])<=1200};remaining-=near;group|=near;todo+=list(near)
  groups.append(sorted(group))
 for number,group in enumerate(sorted(groups,key=lambda g:-len(g)),1):
  names={rows[i]['windpark'] for i in group if rows[i]['windpark']};label=next(iter(names)) if len(names)==1 else 'Windanlagen '+name
  x=float(np.mean([coords[i][0] for i in group]));y=float(np.mean([coords[i][1] for i in group]));capacity=sum(rows[i]['brutto_kw'] for i in group) if all(rows[i]['brutto_kw'] is not None for i in group) else None
  stops.append(dict(id='wind-'+str(number),name=label,kind='wind',x=x-east,z=north-y,zoom=8,throughPark=True,cta='Zum Windpark',capacityKw=capacity,unitIds=[rows[i]['mastr_nr'] for i in group]))
 solar=[]
 # Curated ground footprints, not every OSM solar generator (many are roofs).
 # Hölzengraben is corroborated by the city plan; the Heringen polygons carry
 # explicit register references. References are retained without guessing power.
 selected_solar={'07312000':{534045827:'Solarpark Hölzengraben'},'06632009':{1484161571:'Solarpark Heringen',1484161572:'Solaranlage Heringen'}}.get(id,{})
 selected_solar={int(k):v for k,v in configuration.get('solarFootprints',selected_solar).items()}
 for e in elements:
  if e['type']!='way' or e['id'] not in selected_solar:continue
  ring=[tr.transform(p['lon'],p['lat']) for p in e['geometry']];poly=Polygon(ring)
  if not boundary.covers(poly):raise ValueError('Solar footprint outside municipality')
  solar.append(dict(id='osm-way-'+str(e['id']),ring=[[x-east,north-y] for x,y in ring],registerReferences=e.get('tags',{}).get('ref:mastr','').split(';') if e.get('tags',{}).get('ref:mastr') else []))
  p=poly.representative_point();stops.append(dict(id='solar-'+str(e['id']),name=selected_solar[e['id']],kind='solar',x=p.x-east,z=north-p.y,zoom=8,throughPark=True,cta='Zum Solarpark',capacityKw=None))
 # Reuse only audited park matches, and recheck their coordinates against the
 # actual footprint so a rebuild cannot silently drop or misassign capacity.
 evidence_file=out/'solar-register.json'
 if evidence_file.exists():
  evidence=json.loads(evidence_file.read_text())
  for match in ([] if evidence.get('sceneIntegration')=='complete' and (out/'solar-enrichment.geo.json').exists() else evidence.get('parks',[evidence])):
   if match['capacityKw'] is None:continue
   field=next((p for p in solar if p['id']==match['footprintId']),None)
   if field is None:raise ValueError('Verified solar footprint missing')
   polygon=Polygon([(east+x,north-z) for x,z in field['ring']])
   units=match['units']
   if not units or any(not polygon.covers(Point(*tr.transform(u['lon'],u['lat']))) for u in units):raise ValueError('Verified solar unit outside footprint')
   capacity=sum(u['capacityKw'] for u in units)
   if abs(capacity-match['capacityKw'])>.001:raise ValueError('Solar capacity evidence inconsistent')
   field['registerReferences']=[u['id'] for u in units]
   stop=next(p for p in stops if p['id']=='solar-'+match['footprintId'][len('osm-way-'):])
   stop.update(capacityKw=capacity,unitIds=field['registerReferences'])
 prefix=configuration.get('prefix') or {'09679147':'hoechberg','07312000':'kl','06632009':'heringen','03458009':'hatten'}[id]
 rasters=sorted(source.glob(prefix+'-dgm*.tif'),key=lambda path:('-dgm-bw-' in path.name,path.name))
 if not rasters:raise ValueError('No terrain source tiles')
 raw_rasters=rasters[:];crs_normalisations=[]
 source_entries={entry['file']:entry for entry in json.loads((source/(prefix+'-sources.json')).read_text())} if (source/(prefix+'-sources.json')).exists() else {}
 for index,path in enumerate(rasters):
  if '-dgm-bw-' in path.name:
   rasters[index],correction=normalise_bw_crs(path,source_entries[path.name]['url'])
   if correction:crs_normalisations.append(correction)
 extent=coords+[(east,north)]+[(east+p['x'],north-p['z']) for p in stops]
 for field in solar:extent.extend((east+x,north-z) for x,z in field['ring'])
 enrichment_destinations=[]
 enrichment_path=out/'solar-enrichment.geo.json'
 if enrichment_path.exists():
  for entry in json.loads(enrichment_path.read_text())['features']:
   geometry=shape(entry['geometry'])
   parts=[geometry] if geometry.geom_type=='Polygon' else list(geometry.geoms) if geometry.geom_type=='MultiPolygon' else []
   if not parts or not geometry.is_valid or any(p.interiors for p in parts) or not boundary.covers(transform(tr.transform,geometry)):continue
   for part in parts:extent.extend(tr.transform(x,y) for x,y in part.exterior.coords)
   destination=transform(tr.transform,geometry).representative_point();enrichment_destinations.append((destination.x,destination.y,350))
 # Align the crop to the output grid: fractional bounds can leave a synthetic
 # nodata row/column when rasterio rounds the individual tile windows.
 xs,ys=zip(*extent);bounds=(math.floor((min(xs)-650)/20)*20,math.floor((min(ys)-650)/20)*20,math.ceil((max(xs)+650)/20)*20,math.ceil((max(ys)+650)/20)*20)
 data,affine=merge(rasters,res=20,bounds=bounds,target_aligned_pixels=True);data=data[0]
 with rasterio.open(rasters[0]) as first_tile:nodata=first_tile.nodata
 windows=[(east+stop['x'],north-stop['z'],550 if stop['kind']=='town' else 350) for stop in stops]+enrichment_destinations
 protected=[(x-100,y-100,x+100,y+100) for x,y in coords]+[(x-radius,y-radius,x+radius,y+radius) for x,y,radius in windows]+[(x-20,y-20,x+20,y+20) for x,y in extent]
 required=(min(p[0] for p in protected)-20,min(p[1] for p in protected)-20,max(p[2] for p in protected)+20,max(p[3] for p in protected)+20)
 terrain_crop=None;terrain_mask=None
 if configuration.get('allowOuterTerrainGaps'):
  protection=json.loads((out/'terrain-protection.geo.json').read_text())
  if protection.get('crs')!='ETRS89_UTM32':raise ValueError('Unsupported terrain protection reference')
  # Keep the exact district as an independent mandatory geometry. A polygon
  # union can introduce microscopic boundary slivers during intersections.
  protected_geometry=GeometryCollection([boundary,shape(protection['geometry'])])
  if not protected_geometry.covers(boundary):raise ValueError('Terrain protection must cover entire district')
  data,terrain_mask=mask_uncovered_outer_surface(data,affine,nodata,protected_geometry)
 else:
  data,affine,terrain_crop=trim_uncovered_margin(data,affine,nodata,required)
  if not np.isfinite(data).all() or (nodata is not None and np.any(data==nodata)):raise ValueError('Terrain has gaps')
 height,width=data.shape;w,n=affine*(.5,.5);e,s=affine*(width-.5,height-.5)
 # Use one vertical origin for buildings, terrain and turbine bases.
 reference=float(np.floor(np.nanmin(data)/10)*10);origin=[east,north,reference]
 terrain=dict(width=width,height=height,groundBounds=[w-east,north-n,e-east,north-s],elevations=[round(float(value),3) if np.isfinite(value) else None for value in data.flat],minimum=float(np.nanmin(data)),maximum=float(np.nanmax(data)))
 if terrain_mask:terrain['coverage']='explicit-outer-mask'
 for stop in stops:
  x,y=east+stop['x'],north-stop['z']
  if not (w<=x<=e and s<=y<=n):raise ValueError('Destination outside terrain: '+stop['name'])
 windows=[(east+stop['x'],north-stop['z'],550 if stop['kind']=='town' else 350) for stop in stops]+enrichment_destinations
 files=list(source.glob(prefix+'-lod*.gml'))+list(source.glob(prefix+'-lod*.zip'))
 architecture=buildings(files,boundary,windows,origin)
 # A very large building (industrial hall, chemical park) chosen by its centre inside a
 # window can reach beyond the terrain box. It is left out whole, never cut, and counted.
 inside=lambda b:all(w<=east+p[0]<=e and s<=north-p[2]<=n for surface in b['surfaces'] for ring in [surface['points']]+surface.get('holes',[]) for p in ring)
 beyond=[b['id'] for b in architecture if not inside(b)]
 architecture=[b for b in architecture if inside(b)]
 if not architecture:raise ValueError('No real buildings')
 assert_measured_points(data,affine,coords+[(east+p['x'],north-p['z']) for p in stops]+[(east+p[0],north-p[2]) for building in architecture for surface in building['surfaces'] for ring in [surface['points']]+surface.get('holes',[]) for p in ring])
 if any(not (w<=east+p[0]<=e and s<=north-p[2]<=n) for building in architecture for surface in building['surfaces'] for ring in [surface['points']]+surface.get('holes',[]) for p in ring):raise ValueError('Real building surface outside measured terrain')
 turbines=[dict(id=t['mastr_nr'],x=x-east,z=north-y,hub=t['nabenhoehe_m'],rotor=t['rotor_m'],rotorMetres=t['rotor_m'],manufacturer=t['hersteller'],model=t['typ'],ratedKw=t['brutto_kw']) for t,(x,y) in zip(rows,coords)]
 streams=[];areas=[]
 for el in elements:
  if el['type']!='way' or 'geometry' not in el:continue
  ps=[tr.transform(p['lon'],p['lat']) for p in el['geometry']];points=[[x-east,north-y] for x,y in ps]
  if el.get('tags',{}).get('waterway') in ['river','stream','canal','ditch']:streams.append(points)
  elif el.get('tags',{}).get('natural')=='water' and len(points)>3 and points[0]==points[-1]:areas.append(dict(kind='water',rings=[points]))
 result=dict(municipality=id,name=name,origin=origin,crs='ETRS89_UTM32',heightReference='DHHN2016_NH',terrain=terrain,buildings=architecture,turbines=turbines,solar=solar,stops=stops,context=dict(streams=streams,areas=areas,places=[]))
 if configuration.get('weatherMunicipality'):result['weatherMunicipality']=configuration['weatherMunicipality']
 # Preserve only reproducible public scene input, without OSM editor metadata,
 # private operators, addresses or unrelated features.
 public_context=[]
 for el in elements:
  tags=el.get('tags',{})
  if el['type']=='node' and tags.get('place'):
   public_context.append(dict(type='node',id=el['id'],lon=el['lon'],lat=el['lat'],tags={k:v for k,v in tags.items() if k in ['place','name']}))
  elif el['type']=='way' and (tags.get('waterway') or tags.get('natural')=='water' or el['id'] in selected_solar):
   public_context.append(dict(type='way',id=el['id'],geometry=el['geometry'],tags={k:v for k,v in tags.items() if k in ['waterway','natural','generator:source','plant:source','ref:mastr']}))
 (out/'context-source.json').write_text(json.dumps(dict(elements=public_context),ensure_ascii=False,separators=(',',':')))
 scene_temporary=out/'scene.json.next'
 scene_temporary.write_text(json.dumps(result,separators=(',',':'),allow_nan=False))
 scene_temporary.replace(out/'scene.json')
 audit=dict(checkedAt=datetime.now(timezone.utc).isoformat(),name=name,buildings=len(architecture),wind=len(rows),solarFootprints=len(solar),terrainResolutionMetres=20,crs=result['crs'],heightReference=result['heightReference'],osmAttribution='© OpenStreetMap contributors · ODbL-1.0',buildingLicense='CC BY 4.0 · Bayerische Vermessungsverwaltung' if id=='09679147' else 'dl-de/by-2-0 · HVBG Hessen' if id=='06632009' else '©GeoBasis-DE / LVermGeoRP2026, dl-de/by-2-0, www.lvermgeo.rlp.de [Daten bearbeitet]',terrainLicense='dl-de/zero-2-0 · HVBG Hessen' if id=='06632009' else 'Same attribution as buildings',sourceHashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in files+raw_rasters},limitations=['Bounded building windows around destinations, not full municipality building coverage.','Simplified BKG boundary; precise boundary verification outstanding.','PV modules reconstructed within mapped footprint, inclination and rows are schematic.','Park register linkage unknown; no park power estimated from municipality aggregate.','Weather-driven animation is illustrative, not measured operation or RPM.'])
 if evidence_file.exists():
  audit['limitations']=[x for x in audit['limitations'] if not x.startswith('Park register linkage unknown')]
  audit['limitations'].append(evidence['modelLimitations'])
  matches=evidence.get('parks',[evidence]);audit['solarRegister']=dict(checkedAt=evidence['checkedAt'],evidenceFile='solar-register.json',sourceUrl=evidence['sourceUrl'],mappedParks=len(matches),linkedParks=sum(m['capacityKw'] is not None for m in matches),unitCount=sum(len(m['units']) for m in matches))
 if terrain_crop:audit['terrainMarginCrop']=terrain_crop
 if crs_normalisations:audit['terrainCRSNormalisations']=crs_normalisations
 if terrain_mask:audit['terrainOuterMask']=terrain_mask;audit['limitations'].append('Missing source terrain outside district and protected flight/object surfaces is explicitly null and omitted from terrain geometry; no replacement heights.')
 if configuration.get('buildingLicense'):audit['buildingLicense']=configuration['buildingLicense']
 if configuration.get('terrainLicense'):audit['terrainLicense']=configuration['terrainLicense']
 audit['boundarySource']=register['boundarySource']
 if (out/'boundary.geo.json').exists():
  audit['limitations']=[x for x in audit['limitations'] if not x.startswith('Simplified BKG')]
  audit['boundaryUrl']=register['feature']['properties']['sourceUrl']
  if register['feature']['properties'].get('sourceSha256'):audit['boundarySourceSha256']=register['feature']['properties']['sourceSha256']
 if rows:audit['minimumBoundaryDistanceMetres']=round(min(boundary.boundary.distance(Point(x,y)) for x,y in coords),1)
 manifest=[]
 for path in [source/'sources.json',source/'heringen-sources.json',source/'hatten-sources.json',source/(prefix+'-sources.json')]:
  if path.exists():manifest+=json.loads(path.read_text())
 urls={entry['file']:entry['url'] for entry in manifest}
 for file in files+raw_rasters:
  if file.name not in urls:
   stem=file.stem.split('-')[-1]
   if prefix=='hoechberg':urls[file.name]='https://download1.bayernwolke.de/a/dgm/dgm1/'+stem+'.tif'
   elif prefix=='kl':urls[file.name]='https://geobasis-rlp.de/data/'+('geb3dlo/current/gml/' if file.suffix=='.gml' else 'dgm1/current/tif/')+stem+file.suffix
   else:raise ValueError('Missing source URL: '+file.name)
 audit['sources']=[dict(file=p.name,url=urls[p.name],sha256=audit['sourceHashes'][p.name]) for p in files+raw_rasters]
 audit['osmSource']='https://api.openstreetmap.org/api/0.6/map?bbox=9.878,49.781,9.886,49.788' if id=='09679147' else 'https://overpass-api.de/api/interpreter'
 if id=='03458009':
  audit['buildingLicense']='CC BY 4.0 · LGLN (2026)'
  audit['terrainLicense']=audit['buildingLicense']
  audit['osmSource']='https://api.openstreetmap.org/api/0.6/map?bbox=8.34,53.009,8.361,53.023'
  audit['townSourceName']=town_name
  audit['townSourceId']='osm-node-'+str(town['id'])
  audit['limitations'].append('Water context covers the sourced Kirchhatten window only; municipality-wide OSM queries were unavailable.')
 audit['solarEvidence']=['https://www.openstreetmap.org/way/'+str(way) for way in selected_solar]
 if id=='07312000':audit['solarEvidence'].append('https://www.kaiserslautern.de/sozial_leben_wohnen/planen_bauen_wohnen/bebauungsplan/rechtskraeftige_bebauungsplaene/innenstadt/039728/index.html.de')
 audit['limitations'].append('Solar footprints are the verified mapped subset, not a complete register inventory of all ground-mounted solar plants.')
 audit['buildingsBeyondTerrainOmitted']=beyond
 (out/'provenance.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2));print(audit['name'],len(architecture),len(rows),len(solar),width,height,flush=True)
if __name__=='__main__':
 for id in sys.argv[2:] or ['09679147','07312000','06632009']:main(id)

 import runpy
 runpy.run_path(str(root/'scripts/landscape-stop-metadata.py'),run_name='__main__')
