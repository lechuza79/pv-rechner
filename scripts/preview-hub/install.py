"""Install the local launcher independently of a temporary git worktree."""
from pathlib import Path
import os, plistlib, shutil, subprocess

ROOT=Path(__file__).resolve().parents[2]
DEST=Path.home()/'Library/Application Support/SolarCheckPreviews'
LOGS=Path.home()/'Library/Logs/SolarCheckPreviews'
AGENT=Path.home()/'Library/LaunchAgents/io.solar-check.preview-hub.plist'
LABEL='io.solar-check.preview-hub'
for directory in (DEST/'scripts/preview-hub', DEST/'lib', LOGS, AGENT.parent): directory.mkdir(parents=True,exist_ok=True)
shutil.copy2(ROOT/'scripts/preview-hub/server.py',DEST/'scripts/preview-hub/server.py')
shutil.copy2(ROOT/'lib/design-previews.json',DEST/'lib/design-previews.json')
shutil.copytree(ROOT/'public/preview-thumbnails',DEST/'public/preview-thumbnails',dirs_exist_ok=True)
# Launch agents cannot access protected Documents folders; preserve a local copy.
product=Path.home()/'Documents/Codex/2026-09-09/solar-check-produktanimation/outputs/solar-check-motion'
if product.is_dir() and not any(f.is_file() and getattr(f.stat(), 'st_flags', 0) & 0x40000000 for f in product.rglob('*')):
    shutil.copytree(product,DEST/'previews/product',dirs_exist_ok=True)
node=shutil.which('node')
if not node:raise SystemExit('Node.js wurde nicht gefunden.')
config={
 'Label':LABEL,
 'ProgramArguments':[shutil.which('python3'),str(DEST/'scripts/preview-hub/server.py')],
 'WorkingDirectory':str(DEST),
 'RunAtLoad':True,'KeepAlive':True,'ThrottleInterval':10,
 'EnvironmentVariables':{'PATH':str(Path(node).parent)+':/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'},
 'StandardOutPath':str(LOGS/'hub.log'),'StandardErrorPath':str(LOGS/'hub.log'),
}
AGENT.write_bytes(plistlib.dumps(config))
domain='gui/'+str(os.getuid())
subprocess.run(['launchctl','bootout',domain+'/'+LABEL],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
subprocess.run(['launchctl','bootstrap',domain,str(AGENT)],check=True)
print('Vorschau-Starter installiert: http://localhost:4299/')
