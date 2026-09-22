from story_region_key import current_key
"""Read-only historical monthly solar analysis from one local official export.
Groups by declared installation type, without inferred residential/commercial use.
Requires lxml. Writes only local JSON, never connects to the database.
"""
import json, re, math, zipfile
from collections import defaultdict, Counter
from pathlib import Path
from datetime import date
from lxml import etree

archive = sorted(Path('scripts/.cache/bnetza').glob('Gesamtdatenexport_*.zip'))[-1]
stamp = re.search(r'_(\d{4})(\d{2})(\d{2})_',archive.name).groups()
source_date = '-'.join(stamp)
output_dir = archive.parent / ('story-history-' + source_date)
output_dir.mkdir(exist_ok=True)
buckets = defaultdict(lambda:[0,0.0])
audit = Counter()
with zipfile.ZipFile(archive) as z:
    entries = sorted(n for n in z.namelist() if re.fullmatch(r'EinheitenSolar(?:_\d+)?\.xml',n,re.I))
    assert entries, 'No solar entries'
    for name in entries:
        with z.open(name) as stream:
            for _,elem in etree.iterparse(stream,events=('end',),tag='EinheitSolar',huge_tree=True):
                row = {child.tag:(child.text or '').strip() for child in elem}
                audit['seen'] += 1
                region=current_key(row.get('Gemeindeschluessel',''))
                commissioning=row.get('Inbetriebnahmedatum','')[:10]
                reason=None
                if row.get('EinheitBetriebsstatus') != '35': reason='inactive'
                elif not re.fullmatch(r'\d{8}',region): reason='invalidPlace'
                else:
                    try:
                        d=date.fromisoformat(commissioning)
                        if d.year<1900 or commissioning>source_date: reason='invalidDate'
                    except ValueError: reason='invalidDate'
                try: kwp=float(row.get('Bruttoleistung','').replace(',','.'))
                except ValueError: kwp=0.0
                if reason is None and (not math.isfinite(kwp) or kwp<=0): reason='invalidCapacity'
                if reason: audit[reason]+=1
                else:
                    segment={'2961':'steckersolar','852':'freiflaeche','853':'gebaeude'}.get(row.get('ArtDerSolaranlage'),'sonstige')
                    v=buckets[(region,segment,commissioning[:7])];v[0]+=1;v[1]+=kwp
                    audit['accepted']+=1
                elem.clear()
                while elem.getprevious() is not None: del elem.getparent()[0]
        print(f'{name}: {audit["seen"]:,} read, {audit["accepted"]:,} accepted',flush=True)
rows=[dict(region_id=r,segment=s,month=m,count=v[0],kwp=round(v[1],2)) for (r,s,m),v in buckets.items()]
assert audit['seen']==sum(v for k,v in audit.items() if k!='seen')
output=dict(source=archive.name,sourceDate=source_date,audit=dict(audit),scope='Active units by commissioning date and declared installation type, not historical installed stock.',rows=rows)
(output_dir / 'full.json').write_text(json.dumps(output))
examples=json.loads(Path('lib/story-monatspeak-beispiele.json').read_text())
results=[]
for e in examples:
    selected=sorted((r for r in rows if r['region_id']==e['regionId'] and r['segment']=='steckersolar'),key=lambda r:r['month'])
    results.append(dict(name=e['name'],regionId=e['regionId'],sourceDate=source_date,source=archive.name,firstMonth=selected[0]['month'] if selected else None,lastMonth=selected[-1]['month'] if selected else None,rows=selected))
(output_dir / 'examples.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(json.dumps(dict(source=archive.name,audit=dict(audit),buckets=len(rows)),indent=2),flush=True)
