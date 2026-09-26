from story_region_key import current_key
"""Build a replayable local unit catalogue from the complete official export.
Retain inactive units and exact dates separately; never infer historical status.
No network or database writes outside the local cache.
"""
import json, re, math, sqlite3, zipfile
from pathlib import Path
from datetime import date
from collections import Counter, defaultdict
from lxml import etree

archive=sorted(Path('scripts/.cache/bnetza').glob('Gesamtdatenexport_*.zip'))[-1]
source_date='-'.join(re.search(r'_(\d{4})(\d{2})(\d{2})_',archive.name).groups())
out=archive.parent/('story-history-'+source_date);out.mkdir(exist_ok=True)
connection=sqlite3.connect(out/'units.sqlite')
connection.execute('PRAGMA journal_mode=WAL')
connection.execute('CREATE TABLE IF NOT EXISTS units (id TEXT PRIMARY KEY, region TEXT, technology TEXT, segment TEXT, day TEXT, status TEXT, power REAL, capacity REAL, usage TEXT)')
connection.execute('DELETE FROM units');connection.commit()
audit=Counter(); capacities=defaultdict(float)
def records(z,pattern,tag):
    for name in sorted(n for n in z.namelist() if re.fullmatch(pattern,n,re.I)):
        with z.open(name) as stream:
            for _,element in etree.iterparse(stream,events=('end',),tag=tag,huge_tree=True):
                row={c.tag:(c.text or '').strip() for c in element}
                yield row
                element.clear()
                while element.getprevious() is not None: del element.getparent()[0]
        print(name,flush=True)
def number(value):
    try:
        value=float(value.replace(',','.'))
        return value if math.isfinite(value) and value>0 else None
    except ValueError:return None
with zipfile.ZipFile(archive) as z:
    for row in records(z,r'AnlagenStromSpeicher(?:_\d+)?\.xml','AnlageStromSpeicher'):
        audit['capacityRecords']+=1
        value=number(row.get('NutzbareSpeicherkapazitaet',''))
        linked=[s.strip() for s in re.split('[,;]',row.get('VerknuepfteEinheitenMaStRNummern','')) if s.strip()]
        if value and linked:
            for key in linked:capacities[key]+=value/len(linked)
        else:audit['capacityWithoutValueOrLink']+=1
    for technology,pattern,tag in [('solar',r'EinheitenSolar(?:_\d+)?\.xml','EinheitSolar'),('storage',r'EinheitenStromSpeicher(?:_\d+)?\.xml','EinheitStromSpeicher')]:
        batch=[]
        for row in records(z,pattern,tag):
            audit[technology+'Seen']+=1
            region=current_key(row.get('Gemeindeschluessel',''));day=row.get('Inbetriebnahmedatum','')[:10];key=row.get('EinheitMastrNummer','')
            try:valid_date=date.fromisoformat(day).year>=1900 and day<=source_date
            except ValueError:valid_date=False
            if not key or not re.fullmatch(r'\d{8}',region) or not valid_date:
                audit[technology+'InvalidIdentityOrDate']+=1;continue
            segment=({'2961':'steckersolar','852':'freiflaeche','853':'gebaeude'}.get(row.get('ArtDerSolaranlage'),'sonstige') if technology=='solar' else {'524':'batterie','1537':'pumpspeicher'}.get(row.get('Technologie'),'sonstiger-speicher'))
            capacity=capacities.get(key) if technology=='storage' else None
            if technology=='storage' and capacity is None:audit['storageMissingCapacity']+=1
            batch.append((key,region,technology,segment,day,row.get('EinheitBetriebsstatus',''),number(row.get('Bruttoleistung','')),capacity,row.get('SolarNutzungsbereich','')))
            if len(batch)>=20000:
                connection.executemany('INSERT INTO units VALUES (?,?,?,?,?,?,?,?,?)',batch);connection.commit();batch=[]
        connection.executemany('INSERT INTO units VALUES (?,?,?,?,?,?,?,?,?)',batch);connection.commit()
connection.execute('CREATE INDEX IF NOT EXISTS units_region_day ON units(region,day)');connection.commit()
rows=[dict(region_id=r,segment=s,month=m,count=c,kwh=v or 0,capacityCount=n) for r,s,m,c,v,n in connection.execute("SELECT region,segment,substr(day,1,7),count(*),sum(capacity),count(capacity) FROM units WHERE technology='storage' AND status='35' GROUP BY region,segment,substr(day,1,7)")]
(out/'storage.json').write_text(json.dumps(dict(source=archive.name,sourceDate=source_date,rows=rows,audit=dict(audit))))
coverage=[]
for r,t,s,n,first,last,active in connection.execute("SELECT region,technology,segment,count(*),min(day),max(day),sum(status='35') FROM units GROUP BY region,technology,segment"):
    coverage.append(dict(regionId=r,technology=t,segment=s,records=n,first=first,last=last,active=active))
(out/'detail-coverage.json').write_text(json.dumps(dict(source=archive.name,sourceDate=source_date,audit=dict(audit),coverage=coverage)))
print(json.dumps(dict(audit=audit,storageBuckets=len(rows),regions=len(set(r['regionId'] for r in coverage)))),flush=True)
