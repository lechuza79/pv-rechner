from story_region_key import current_key
"""Extract valuation fields for requested municipalities from the official export."""
import io,json,re,sys,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
ids=set(sys.argv[1:])
if ids=={'--all'}:ids={r['regionId'] for r in json.loads(Path('scripts/.cache/story-discovery/index.json').read_text())}
if not ids or any(not re.fullmatch(r'\d{8}',x) for x in ids):raise ValueError('Municipality IDs required')
archive=sorted(Path('scripts/.cache/bnetza').glob('Gesamtdatenexport_*.zip'))[-1]
source='-'.join(re.search(r'_(\d{4})(\d{2})(\d{2})_',archive.name).groups())
root=Path('scripts/.cache/story-radial');root.mkdir(parents=True,exist_ok=True)
rows={};counts={x:0 for x in ids}
for region in ids:
 (root/(region+'-value-units.tmp')).write_text(json.dumps({'sourceDate':source,'source':archive.name})[:-1]+',"units":[')
def flush():
 for region,units in rows.items():
  with (root/(region+'-value-units.tmp')).open('a') as out:
   out.write((',' if counts[region] else '')+','.join(json.dumps(u,separators=(',',':')) for u in units))
  counts[region]+=len(units)
 rows.clear()
fields={'EinheitMastrNummer':'id','Inbetriebnahmedatum':'day','Bruttoleistung':'kwp','EinheitBetriebsstatus':'status','ArtDerSolaranlage':'art','Nutzungsbereich':'usage','Einspeisungsart':'feedInMode','SpeicherAmGleichenOrt':'storage','EegMaStRNummer':'eegId'}
with zipfile.ZipFile(archive) as z:
 names=sorted(n for n in z.namelist() if re.fullmatch(r'EinheitenSolar(?:_\d+)?\.xml',n))
 for i,name in enumerate(names):
  with io.TextIOWrapper(z.open(name),encoding='utf-16') as f:
   pending=''
   while True:
    block=f.read(2**22)
    if not block:break
    parts=(pending+block).split('</EinheitSolar>');pending=parts.pop()
    for part in parts:
     match=re.search(r'<Gemeindeschluessel>(\d{8})</Gemeindeschluessel>',part)
     region=current_key(match.group(1)) if match else None
     if region not in ids:continue
     element=ET.fromstring(part[part.index('<EinheitSolar>'):]+'</EinheitSolar>')
     row={alias:element.findtext(field,'') for field,alias in fields.items()};row['kwp']=float(row['kwp'] or 0);rows.setdefault(region,[]).append(row)
  flush()
  print(f'{i+1}/{len(names)}',flush=True)
for region in ids:
 path=root/(region+'-value-units.tmp')
 with path.open('a') as out:out.write(']}')
 path.replace(root/(region+'-value-units.json'))
print({'cities':len(ids),'units':sum(counts.values())},flush=True)
if '--all' in sys.argv:
 (root/('units-complete-'+source+'.json')).write_text(json.dumps({'sourceDate':source,'cities':len(ids),'units':sum(counts.values())}))
