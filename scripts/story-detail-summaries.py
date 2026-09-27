"""Derive all municipal detail summaries and day/week series from the local catalogue."""
import json,sqlite3
from pathlib import Path
from collections import defaultdict
from datetime import date
root=sorted(Path('scripts/.cache/bnetza').glob('story-history-*'))[-1]
connection=sqlite3.connect(root/'units.sqlite')
out=root/'cities';out.mkdir(exist_ok=True)
summary=defaultdict(lambda:dict(sizes=[],daily=[],weekly=[]))
for region,segment,n,total,minimum,maximum in connection.execute("SELECT region,segment,count(*),sum(power),min(power),max(power) FROM units WHERE technology='solar' AND status='35' AND power>0 GROUP BY region,segment"):
 summary[region]['sizes'].append(dict(segment=segment,count=n,kwp=total,minimum=minimum,maximum=maximum,mean=total/n))
totals=dict(cities=0,days=0,weeks=0)
current=None;daily=[];weekly={}
def flush(region):
    if region is None:return
    weeks=[dict(segment=s,week=w,count=v[0],kwp=round(v[1],4)) for (s,w),v in sorted(weekly.items())]
    (out/(region+'.json')).write_text(json.dumps(dict(sizes=summary[region]['sizes'],daily=daily,weekly=weeks)))
    totals['cities']+=1;totals['days']+=len(daily);totals['weeks']+=len(weeks)
for region,segment,day,n,total in connection.execute("SELECT region,segment,day,count(*),sum(power) FROM units WHERE technology='solar' AND status='35' AND power>0 GROUP BY region,segment,day ORDER BY region,segment,day"):
    if region!=current:
        flush(current);current=region;daily=[];weekly={}
    daily.append(dict(segment=segment,day=day,count=n,kwp=round(total,4)))
    iso=date.fromisoformat(day).isocalendar();key=(segment,f'{iso.year}-W{iso.week:02d}')
    bucket=weekly.setdefault(key,[0,0.0]);bucket[0]+=n;bucket[1]+=total
flush(current)
(root/'sizes.json').write_text(json.dumps({r:d['sizes'] for r,d in summary.items()}))
print(json.dumps(totals))
