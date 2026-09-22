"""Local-only preview server with bounded, allowlisted upstream data requests."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs, urlencode
from urllib.request import urlopen
from concurrent.futures import ThreadPoolExecutor
import json,time,threading
ROOT=Path(__file__).resolve().parent.parent
cache={};lock=threading.Lock()
COORDS=json.loads((Path(__file__).resolve().parent/'plz-coordinates.json').read_text())
NAMES={'79098':'Freiburg','10115':'Berlin','20095':'Hamburg','97204':'Höchberg'}
def load(url,ttl):
 with lock:
  stored=cache.get(url)
  if stored and time.time()-stored[0]<ttl:return stored[1]
 with urlopen(url,timeout=12) as response:data=json.load(response)
 with lock:cache[url]=(time.time(),data)
 return data
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def do_GET(self):
  parsed=urlparse(self.path)
  if parsed.path=='/ranking-data':
   p=parse_qs(parsed.query,keep_blank_values=True)
   params={k:p.get(k,[default])[0] for k,default in [('gebiet','09'),('owner','alle'),('klasse','gemeinden-und-kleinstaedte')]}
   if params['gebiet'] not in ['09',''] or params['owner'] not in ['alle','privat','gewerbe'] or params['klasse'] not in ['doerfer','kleine-gemeinden','gemeinden-und-kleinstaedte','mittelgrosse-staedte','grossstaedte']:
    self.send_error(400,'Invalid ranking selection');return
   params.update(region='09679147',voll='1')
   try:
    result=load('https://solar-check.io/api/atlas/nachbarn?'+urlencode(params),600)
    body=json.dumps(result).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(body)
   except Exception:self.send_error(502,'Ranking source unavailable')
   return
  if parsed.path=='/scene-data':
   plz=parse_qs(parsed.query).get('plz',['97204'])[0]
   if plz not in COORDS:self.send_error(400,'Unknown postcode');return
   lat,lon=COORDS[plz];name=NAMES.get(plz,'PLZ '+plz)
   weather='https://api.open-meteo.com/v1/forecast?'+urlencode({'latitude':lat,'longitude':lon,'current':'temperature_2m,cloud_cover,rain,showers,weather_code,wind_speed_10m,wind_direction_10m','wind_speed_unit':'ms','timeformat':'unixtime','timezone':'UTC','forecast_days':1})
   result={'location':{'name':name,'lat':lat,'lon':lon,'plz':plz},'fetchedAt':time.time()*1000}
   def fetch(name,url,ttl):
    try:return name,load(url,ttl)
    except Exception:return name+'Error','Quelle derzeit nicht erreichbar'
   with ThreadPoolExecutor(max_workers=2) as pool:
    jobs=[pool.submit(fetch,'weather',weather,600),pool.submit(fetch,'power','https://solar-check.io/api/solar-now?plz='+plz,300)]
    for job in jobs:key,value=job.result();result[key]=value
   data=json.dumps(result).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(data);return
  if parsed.path=='/':self.path='/index.html'
  super().do_GET()
 def end_headers(self):self.send_header('Cache-Control','no-store');super().end_headers()
print('Dynamic hero: http://localhost:4188/',flush=True)
ThreadingHTTPServer(('127.0.0.1',4188),Handler).serve_forever()
