"""Reconcile independent monthly extraction with unit-derived days and weeks."""
import json,math
from pathlib import Path
from collections import defaultdict
root=sorted(Path('scripts/.cache/bnetza').glob('story-history-*'))[-1]
source=json.load(open(root/'full.json'));expected=defaultdict(lambda:[0,0.0])
for row in source['rows']:
    v=expected[(row['region_id'],row['segment'])];v[0]+=row['count'];v[1]+=row['kwp']
checked=set();days=weeks=0;total=0
for path in (root/'cities').glob('*.json'):
    data=json.load(open(path));daily=defaultdict(lambda:[0,0.0]);weekly=defaultdict(lambda:[0,0.0])
    for key,target in [('daily',daily),('weekly',weekly)]:
        for row in data[key]:
            v=target[row['segment']];v[0]+=row['count'];v[1]+=row['kwp']
    for segment,value in daily.items():
        exp=expected[(path.stem,segment)];week=weekly[segment]
        assert value[0]==exp[0]==week[0],(path.stem,segment,'count')
        # The independent monthly file rounds each monthly sum to two decimals.
        assert math.isclose(value[1],week[1],abs_tol=.1),(path.stem,segment,'weekly power')
        assert math.isclose(value[1],exp[1],abs_tol=10),(path.stem,segment,'monthly power')
        checked.add((path.stem,segment));total+=value[0]
    days+=len(data['daily']);weeks+=len(data['weekly'])
assert checked==set(expected),'Lost municipality or segment'
result=dict(segments=len(checked),activeSolarUnits=total,dailyBuckets=days,weeklyBuckets=weeks)
(root/'reconciliation.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
