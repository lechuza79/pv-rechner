"""Start/stop the installed preview without enabling login autostart."""
import argparse
import json
import os
from pathlib import Path
import plistlib
import subprocess
import time


def stop_service(target):
    subprocess.run(['launchctl', 'bootout', target], capture_output=True)
    for _ in range(100):
        if subprocess.run(['launchctl', 'print', target], capture_output=True).returncode:
            return
        time.sleep(.1)
    raise RuntimeError('Previous service has not finished stopping')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['start', 'stop', 'status', 'uninstall'])
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    agent = root/'service.plist'
    config = json.loads((root/'config.json').read_text())
    label = plistlib.loads(agent.read_bytes())['Label']
    domain = 'gui/'+str(os.getuid())
    target = domain+'/'+label
    if args.action in ('stop', 'uninstall'):
        stop_service(target)
        print('Vorschau gestoppt.')
        if args.action == 'uninstall':
            persistent = Path.home()/'.config/dev-reaper/persistent-cwds'
            if persistent.exists():
                paths = [line for line in persistent.read_text().splitlines() if line != config['cwd']]
                persistent.write_text('\n'.join(paths)+ ('\n' if paths else ''))
            agent.unlink()
            print('Startdienst und Aufräum-Ausnahme entfernt. Quellcode und Protokolle bleiben erhalten.')
        return
    if args.action == 'start':
        loaded = subprocess.run(['launchctl', 'print', target], capture_output=True)
        if loaded.returncode:
            subprocess.run(['launchctl', 'bootstrap', domain, str(agent)], check=True)
        else:
            subprocess.run(['launchctl', 'kickstart', target], check=True)
        print('Vorschau startet: http://127.0.0.1:'+str(config['port'])+'/widget-galerie/layout-referenz')
        return
    status = Path(config['status'])
    if status.exists():
        print(status.read_text())


if __name__ == '__main__':
    main()
