"""Repair cached register keys, preserving totals and backing up affected derived data."""
import json, sqlite3, shutil
from pathlib import Path
from collections import defaultdict
from story_region_key import current_key
root=sorted(Path('scripts/.cache/bnetza').glob('story-history-*'))[-1]
backup=Path('scripts/.cache/story-key-repair-2026-09-18')
if (backup/'full.json').exists():raise RuntimeError('Correction backup already exists; do not overwrite original evidence')
backup.mkdir(exist_ok=True)
con=sqlite3.connect(root/'units.sqlite')
regions=[r[0] for r in con.execute('SELECT DISTINCT region FROM units')]
mapping={r:current_key(r) for r in regions if r!=current_key(r)}
affected=sorted(set(mapping.values()))
(backup/'affected.json').write_text(json.dumps(affected))
before=con.execute('SELECT count(*),sum(power),sum(capacity) FROM units').fetchone()
for old,new in mapping.items():con.execute('UPDATE units SET region=? WHERE region=?',(new,old))
con.commit()
after=con.execute('SELECT count(*),sum(power),sum(capacity) FROM units').fetchone()
assert before==after, (before,after)
for filename in ['full.json','storage.json']:
 p=root/filename;shutil.copy2(p,backup/filename);data=json.loads(p.read_text());groups={}
 for row in data['rows']:
  row['region_id']=current_key(row['region_id']);key=(row['region_id'],row['segment'],row['month'])
  if key not in groups:groups[key]=row.copy()
  else:
   for field in ['count','kwp','kwh','capacityCount']:
    if field in row:groups[key][field]+=row[field]
 data['rows']=list(groups.values());data['municipalityKeysCorrectedAt']='2026-09-18';p.write_text(json.dumps(data))
p=root/'detail-coverage.json';data=json.loads(p.read_text());data['coverage']=[dict(regionId=r,technology=t,segment=s,records=n,first=f,last=l,active=a) for r,t,s,n,f,l,a in con.execute("SELECT region,technology,segment,count(*),min(day),max(day),sum(status='35') FROM units GROUP BY region,technology,segment")];p.write_text(json.dumps(data))
for region in affected:
 for folder in Path('scripts/.cache/story-prepared').glob('????-??-??'):
  p=folder/(region+'.json')
  if p.exists():
   target=backup/'prepared'/folder.name;target.mkdir(parents=True,exist_ok=True);shutil.move(p,target/p.name)
print(json.dumps(dict(oldKeys=len(mapping),affected=len(affected),totalsBefore=before,totalsAfter=after,hanau=con.execute("SELECT count(*) FROM units WHERE region='06415000' AND technology='solar' AND status='35' AND power>0").fetchone()[0])))
