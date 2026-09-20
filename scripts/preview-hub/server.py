"""Loopback-only launcher for explicitly registered Solar Check previews."""
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import urlopen
from urllib.error import HTTPError
import json, os, subprocess, threading, time, shutil, html

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / 'lib/design-previews.json'
HOME = Path.home()
OUTPUT = HOME / '.codex/.chatgpt-projects/g-p-68cb08f24e0c8191aa1050b084bc0b5e/output'
REPO = HOME / 'projects/pv-rechner'
LOGS = HOME / 'Library/Logs/SolarCheckPreviews'
PORT = int(os.environ.get('SOLAR_PREVIEW_PORT', '4299'))
PYTHON = shutil.which('python3') or '/usr/bin/python3'
NODE = shutil.which('node')
LOCKS = {}

def service(port, cwd, command, dependencies=()):
    return dict(port=port, cwd=Path(cwd), command=command, dependencies=dependencies)

def next_service(port, cwd):
    return service(port, cwd, [NODE, str(Path(cwd)/'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', str(port)])

def static_service(port, cwd):
    return service(port, cwd, [PYTHON, '-m', 'http.server', str(port), '--bind', '127.0.0.1', '--directory', str(cwd)])

SERVICES = {
    'charts': next_service(3063, REPO),
    'homepage': service(4180, OUTPUT/'solar-hero-handoff', [PYTHON, str(OUTPUT/'solar-hero-handoff/dynamic-hero/serve.py')], ['charts']),
    'atlas-v2': service(4187, OUTPUT/'atlas-entwurf-v2', [PYTHON, str(OUTPUT/'atlas-entwurf-v2/dynamic-hero/serve.py')]),
    'atlas-v3': service(4188, OUTPUT/'atlas-entwurf-v3', [PYTHON, str(OUTPUT/'atlas-entwurf-v3/dynamic-hero/serve.py')]),
    'live-replay': service(4186, OUTPUT/'solar-check-live-archive-2026-09-09/interactive', [NODE, str(OUTPUT/'solar-check-live-archive-2026-09-09/interactive/server.cjs')]),
    'atlas': next_service(4190, REPO/'.worktrees/codex-kommunen-templates'),
    'heatpump': next_service(4304, REPO/'.worktrees/codex-wp-ergebnis-design'),
    'registration': next_service(4294, REPO/'.worktrees/codex-balkon-anmelde-assistent'),
    'archive': static_service(4295, OUTPUT),
    'product': static_service(4296, HOME/'Library/Application Support/SolarCheckPreviews/previews/product'),
    'confetti': static_service(4293, HOME/'.codex/visualizations/2026/09/16/01a0a905-6022-7540-822e-f5f3be352f8f/confetti'),
}

def entries():
    return json.loads(CATALOG.read_text())

def owners(port):
    result = subprocess.run(['/usr/sbin/lsof', '-nP', '-t', '-iTCP:'+str(port), '-sTCP:LISTEN'], capture_output=True, text=True, timeout=10)
    return result.stdout.split()

def check_owner(spec):
    pids = owners(spec['port'])
    if not pids: return False
    for pid in pids:
        result = subprocess.run(['/bin/ps', '-p', pid, '-o', 'command='], capture_output=True, text=True, timeout=10)
        cwd = subprocess.run(['/usr/sbin/lsof', '-a', '-p', pid, '-d', 'cwd', '-Fn'], capture_output=True, text=True, timeout=10)
        paths = [line[1:] for line in cwd.stdout.splitlines() if line.startswith('n')]
        if str(spec['cwd']) in result.stdout or any(Path(p).resolve() == spec['cwd'].resolve() for p in paths):
            return True
    raise RuntimeError('Der benötigte Port ist von einem anderen Arbeitsstand belegt. Er wurde nicht verändert.')

def ready(spec, path='/'):
    try:
        with urlopen('http://127.0.0.1:'+str(spec['port'])+path, timeout=3) as response:
            return response.status < 500
    except HTTPError as e:
        return e.code in (401,403)
    except Exception: return False

def ensure(name, path='/'):
    if name not in SERVICES: raise ValueError('Unbekannte Vorschau')
    with LOCKS.setdefault(name, threading.Lock()):
        spec=SERVICES[name]
        if not spec['cwd'].is_dir(): raise RuntimeError('Die Vorschau-Dateien wurden an diesem Ort nicht gefunden.')
        if name in ('product', 'confetti') and not (spec['cwd']/'index.html').is_file():
            raise RuntimeError('Die Vorschau-Dateien fehlen noch lokal. Bitte zuerst aus iCloud herunterladen und den Vorschau-Starter erneut installieren.')
        for dependency in spec['dependencies']: ensure(dependency)
        if check_owner(spec):
            if ready(spec,path): return
            raise RuntimeError('Der Server läuft bereits, aber die Vorschau antwortet noch nicht. Bitte erneut öffnen.')
        if any(arg is None for arg in spec['command']): raise RuntimeError('Die benötigte Laufzeit fehlt.')
        LOGS.mkdir(parents=True, exist_ok=True)
        with (LOGS/(name+'.log')).open('ab') as log:
            process = subprocess.Popen(spec['command'], cwd=spec['cwd'], stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
        until=time.monotonic()+90
        while time.monotonic()<until:
            if process.poll() is not None: raise RuntimeError('Der Vorschau-Server konnte nicht starten. Die Dateien oder die benötigte Laufzeit sind nicht zugänglich.')
            if ready(spec,path): return
            time.sleep(.5)
        raise RuntimeError('Der Start dauert länger als erwartet. Bitte in einem Moment erneut öffnen.')

class Handler(BaseHTTPRequestHandler):
    def reply(self, status, body, content_type='text/html; charset=utf-8'):
        data=body if isinstance(body,bytes) else body.encode();self.send_response(status)
        self.send_header('Content-Type',content_type);self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff')
        self.end_headers();self.wfile.write(data)
    def allowed(self):
        return self.headers.get('Host') in ('localhost:'+str(PORT),'127.0.0.1:'+str(PORT))
    def do_GET(self):
        if not self.allowed(): self.reply(403,'Unzulässiger Host');return
        path=urlsplit(self.path).path
        if path.startswith('/preview-thumbnails/'):
            entry=next((e for e in entries() if e.get('thumbnail')==path),None)
            image=ROOT/'public'/path.lstrip('/')
            if not entry or not image.is_file():self.reply(404,'Nicht gefunden');return
            self.reply(200,image.read_bytes(),'image/webp');return
        if path=='/health': self.reply(200,'{"ok":true}','application/json');return
        if path=='/api/previews': self.reply(200,json.dumps(entries(),ensure_ascii=False),'application/json');return
        if path.startswith('/open/'):
            entry=next((e for e in entries() if e['id']==path[6:]),None)
            if not entry:self.reply(404,'Vorschau nicht gefunden');return
            title=html.escape(entry['title'])
            self.reply(200, '<!doctype html><meta charset="utf-8"><title>'+title+'</title><style>body{font:18px system-ui;background:#08191c;color:#e8eee9;padding:12vh 10vw}a{color:#d4ff24}</style><h1>'+title+'</h1><p id="state">Vorschau wird gestartet …</p><a href="/">Zur Übersicht</a><script>fetch("/start/'+entry['id']+'",{method:"POST"}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);location.replace(d.url)}).catch(e=>document.getElementById("state").textContent=e.message)</script>');return
        if path in ('/','/admin/vorschauen'):
            cards=''.join(('<article data-search="'+html.escape((e['title']+' '+e['group']).lower())+'">'+('<a class="thumbnail" href="/open/'+e['id']+'"><img loading="lazy" width="800" height="450" src="'+html.escape(e['thumbnail'])+'" alt="'+html.escape(e['title'])+'"></a>' if e.get('thumbnail') else '<div class="thumbnail missing">'+html.escape(e.get('thumbnailNote','Vorschaubild fehlt'))+'</div>')+'<small>'+html.escape(e['group'])+' · '+html.escape(e['status'])+'</small><h2>'+html.escape(e['title'])+'</h2><p>'+html.escape(e['description'])+'</p><a href="/open/'+e['id']+'" target="_blank" rel="noopener">Öffnen ↗</a></article>') for e in entries())
            self.reply(200,'<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vorschauen · Solar Check</title><style>*{box-sizing:border-box}body{margin:0;background:#08191c;color:#e8eee9;font:15px system-ui}main{max-width:1280px;margin:auto;padding:40px 24px}header{border-bottom:1px solid #a7bcbb33;padding:18px 24px;color:#d4ff24}h1{font-size:40px;margin-bottom:10px}h2{font-size:21px}p{color:#a7bcbb;line-height:1.6}input{width:100%;padding:15px;border-radius:12px;background:#163338;border:1px solid #a7bcbb55;color:white;font:inherit;margin:20px 0 30px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:16px}article{border:1px solid #a7bcbb40;border-radius:16px;padding:23px;display:flex;flex-direction:column;background:#10282c}small{color:#a7bcbb}a{color:#d4ff24;margin-top:auto;padding-top:15px;font-weight:600}article[hidden]{display:none}.thumbnail{display:block;aspect-ratio:16/9;margin:-23px -23px 20px;padding:0;overflow:hidden;border-radius:15px 15px 0 0;background:#163338}.thumbnail img{width:100%;height:100%;object-fit:cover;display:block}.missing{display:grid;place-content:center;color:#a7bcbb;text-align:center}</style><header>solarcheck. / ADMIN · LOKALE VORSCHAUEN</header><main><h1>Alle Entwürfe an einem Ort.</h1><p>'+str(len(entries()))+' Vorschauen aus den Solar-Check-Sessions. Beim Öffnen startet der passende lokale Server automatisch.</p><input aria-label="Vorschauen suchen" placeholder="Nach Titel oder Bereich suchen …"><section class="grid">'+cards+'</section></main><script>document.querySelector("input").oninput=e=>document.querySelectorAll("article").forEach(a=>a.hidden=!a.dataset.search.includes(e.target.value.toLowerCase()))</script></html>');return
        self.reply(404,'Nicht gefunden')
    def do_POST(self):
        if not self.allowed() or self.headers.get('Origin') not in ('http://localhost:'+str(PORT),'http://127.0.0.1:'+str(PORT)):
            self.reply(403,'{"error":"Unzulässiger Ursprung"}','application/json');return
        path=urlsplit(self.path).path
        entry=next((e for e in entries() if path=='/start/'+e['id']),None)
        if not entry:self.reply(404,'{"error":"Unbekannte Vorschau"}','application/json');return
        try:
            ensure(entry['service'],entry['path'])
            self.reply(200,json.dumps({'url':'http://localhost:'+str(SERVICES[entry['service']]['port'])+entry['path']}),'application/json')
        except Exception as e:self.reply(503,json.dumps({'error':str(e)}),'application/json')

if __name__=='__main__':
    ThreadingHTTPServer(('127.0.0.1',PORT),Handler).serve_forever()
