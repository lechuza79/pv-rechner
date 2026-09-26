"""Audit register-backed non-household clusters. No model changes or network access."""
import io,json,re,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
from collections import defaultdict
from story_region_key import current_key
root=Path('scripts/.cache/story-commercial-clusters');root.mkdir(exist_ok=True)
archive=sorted(Path('scripts/.cache/bnetza').glob('Gesamtdatenexport_*.zip'))[-1]
usage={'714':'commerce-unspecified','715':'industry','716':'agriculture','717':'public-building','718':'other-use'}
counts=defaultdict(lambda:dict(units=0,kwp=0,full=0,partial=0,unknownMode=0,siteHints=0))
samples=defaultdict(list)
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
     if '<EinheitBetriebsstatus>35</EinheitBetriebsstatus>' not in part:continue
     e=ET.fromstring(part[part.index('<EinheitSolar>'):]+'</EinheitSolar>')
     get=lambda key:e.findtext(key,'')
     art=get('ArtDerSolaranlage');u=get('Nutzungsbereich')
     if art=='2961' or (u=='713' and art!='852'):continue
     kwp=float(get('Bruttoleistung') or 0)
     if kwp<=0:continue
     cluster='ground-mounted' if art=='852' else usage.get(u,'unknown-use')
     hint=None
     # Site names only provide review suggestions, never proof of consumption.
     title=get('NameStromerzeugungseinheit').lower()
     if cluster=='commerce-unspecified':
      for key,pattern in [('food-retail',r'supermarkt|verbrauchermarkt|lebensmittelmarkt'),('warehouse',r'lagerhalle|logistikzentrum'),('office',r'bürogebäude|verwaltungsgebäude')]:
       if re.search(pattern,title):hint=key;break
     row=counts[cluster];row['units']+=1;row['kwp']+=kwp
     mode=get('Einspeisungsart');row['full' if mode=='688' else 'partial' if mode=='689' else 'unknownMode']+=1
     if hint:
      row['siteHints']+=1;counts['review:'+hint]['units']+=1;counts['review:'+hint]['kwp']+=kwp
      if len(samples[hint])<12:samples[hint].append(dict(unitId=get('EinheitMastrNummer'),regionId=current_key(get('Gemeindeschluessel')),siteName=get('NameStromerzeugungseinheit'),kwp=kwp,mode=mode,status='needs-site-verification'))
  print(f'{i+1}/{len(names)}',flush=True)
result=dict(source=archive.name,clusters=dict(counts),reviewSamples=dict(samples),note='Review hints overlap commerce; no operator-name inference, no measured consumption.')
(root/'audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result['clusters']),flush=True)
