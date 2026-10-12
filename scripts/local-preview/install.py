"""Install an explicitly started local preview; run from its worktree.

Does not stop an existing listener. Stop the verified previous server first.
The reaper exception applies only to this exact checkout, never all dev servers.
"""
import argparse
import os
from pathlib import Path
import plistlib
import shutil
import socket
import subprocess
import json
from control import stop_service

REAPER_MARKER = '# Explicitly persistent previews are owned by their launch agent.'
REAPER_ANCHOR = '      SEEN_DEV="$SEEN_DEV$pid "'
REAPER_EXCEPTION = '''      # Explicitly persistent previews are owned by their launch agent.
      persistent="$HOME/.config/dev-reaper/persistent-cwds"
      if [[ -f $persistent ]] && grep -Fxq -- "$(cwd_of "$pid")" "$persistent"; then
        continue
      fi
'''


def patch_reaper(source):
    if REAPER_EXCEPTION in source:
        return source
    if REAPER_MARKER in source or source.count(REAPER_ANCHOR) != 1:
        raise ValueError('Reaper changed; inspect it before installing the scoped exception')
    return source.replace(REAPER_ANCHOR, REAPER_EXCEPTION + REAPER_ANCHOR)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4319)
    parser.add_argument('--label', default='io.solar-check.widget-preview')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    node = shutil.which('node')
    if not node or not (root/'node_modules/next/dist/bin/next').is_file():
        raise SystemExit('Missing local Node/Next installation')
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1', args.port)) == 0:
            raise SystemExit('Port is occupied. Verify and stop its owner first.')
    home = Path.home()
    reaper = home/'.local/bin/dev-reaper.sh'
    patched = patch_reaper(reaper.read_text()) if reaper.exists() else None
    destination = home/'Library/Application Support/SolarCheckPreviews/managed'/args.label
    logs = home/'Library/Logs/SolarCheckPreviews'
    # Outside LaunchAgents: bootstrap explicitly, never start on every login.
    agent = destination/'service.plist'
    for directory in (destination, logs, agent.parent):
        directory.mkdir(parents=True, exist_ok=True)
    shutil.copy2(Path(__file__).with_name('supervise.py'), destination/'supervise.py')
    shutil.copy2(Path(__file__).with_name('control.py'), destination/'control.py')
    config = dict(
        cwd=str(root), port=args.port,
        command=[node, str(root/'node_modules/next/dist/bin/next'), 'dev',
                 '--disable-source-maps', '--hostname', '127.0.0.1', '--port', str(args.port)],
        health_path='/icon.svg',
        environment={'NODE_OPTIONS': '--max-old-space-size=8192'},
        status=str(destination/'status.json'), log=str(logs/f'{args.label}.log'),
    )
    (destination/'config.json').write_text(json.dumps(config, indent=2)+'\n')
    if patched is not None:
        if patched != reaper.read_text():
            shutil.copy2(reaper, destination/'dev-reaper.before.sh')
            reaper.write_text(patched)
        persistent = home/'.config/dev-reaper/persistent-cwds'
        persistent.parent.mkdir(parents=True, exist_ok=True)
        paths = persistent.read_text().splitlines() if persistent.exists() else []
        if str(root) not in paths:
            persistent.write_text('\n'.join([*paths, str(root)])+'\n')
    agent.write_bytes(plistlib.dumps(dict(
        Label=args.label, RunAtLoad=True, KeepAlive=True, ThrottleInterval=10,
        ProgramArguments=['/usr/bin/python3', str(destination/'supervise.py'), str(destination/'config.json')],
        WorkingDirectory=str(destination),
        EnvironmentVariables={'PATH':str(Path(node).parent)+':/usr/bin:/bin:/usr/sbin:/sbin'},
        StandardOutPath=str(logs/f'{args.label}.launcher.log'),
        StandardErrorPath=str(logs/f'{args.label}.launcher.log'),
    )))
    domain = 'gui/'+str(os.getuid())
    # bootout returns before process cleanup and label removal have completed.
    stop_service(domain+'/'+args.label)
    legacy = home/'Library/LaunchAgents'/f'{args.label}.plist'
    if legacy.exists():
        previous = plistlib.loads(legacy.read_bytes())
        if previous.get('Label') != args.label or str(destination/'supervise.py') not in previous.get('ProgramArguments', []):
            raise SystemExit('Unrecognized login agent; not removed')
        legacy.unlink()
    subprocess.run(['launchctl', 'bootstrap', domain, str(agent)], check=True)
    print('Installed', args.label, 'for', root, 'on', args.port)


if __name__ == '__main__':
    main()
