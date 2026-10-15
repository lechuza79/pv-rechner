"""Supervise one loopback preview, including a live but unresponsive process.

launchd owns this supervisor; only the process group created here may be stopped.
No production process, remote URL, or unrelated listener is managed.
"""
import fcntl
import json
import logging
from logging.handlers import RotatingFileHandler
import os
import re
from pathlib import Path
import signal
import socket
import subprocess
import sys
import threading
import time
from urllib.request import build_opener, ProxyHandler


def kill_group(pid, sig):
    try:
        os.killpg(pid, sig)
    except ProcessLookupError:
        pass
    except PermissionError:
        # macOS may report EPERM for a group containing only an unreaped zombie.
        groups = subprocess.run(['/bin/ps', '-axo', 'pgid=,stat='], capture_output=True, text=True, check=True)
        live = any(parts[0] == str(pid) and not parts[1].startswith('Z')
                   for line in groups.stdout.splitlines() if len(parts := line.split()) == 2)
        if live:
            raise


class Supervisor:
    def __init__(self, config, logger):
        self.config = config
        self.logger = logger
        self.stop = threading.Event()
        self.process = None
        self.compiling_since = None
        self.last_health_response = None
        self.probe_details = {}
        self.status_path = Path(config['status'])
        self.owner_path = self.status_path.with_name('owner.json')
        self.opener = build_opener(ProxyHandler({}))

    def process_identity(self, pid):
        result = subprocess.run(['/bin/ps', '-p', str(pid), '-o', 'lstart='], capture_output=True, text=True)
        return result.stdout.strip() if result.returncode == 0 else ''

    def remember_owned(self):
        started = self.process_identity(self.process.pid)
        if started:
            temporary = self.owner_path.with_suffix('.tmp')
            temporary.write_text(json.dumps(dict(pid=self.process.pid, started=started, cwd=self.config['cwd'])))
            temporary.replace(self.owner_path)

    def reclaim_owned(self):
        """Recover after a supervisor crash without adopting an unrelated listener."""
        if not self.owner_path.exists():
            return
        owner = json.loads(self.owner_path.read_text())
        pid = owner['pid']
        identity = self.process_identity(pid)
        if not identity:
            self.owner_path.unlink()
            return
        cwd = subprocess.run(['/usr/sbin/lsof', '-a', '-p', str(pid), '-d', 'cwd', '-Fn'], capture_output=True, text=True)
        paths = [line[1:] for line in cwd.stdout.splitlines() if line.startswith('n')]
        if (identity != owner['started'] or owner['cwd'] != self.config['cwd']
                or not any(Path(path).resolve() == Path(self.config['cwd']).resolve() for path in paths)
                or os.getpgid(pid) != pid):
            self.record('ownership_mismatch')
            raise RuntimeError('Previous process identity changed; refusing to terminate it')
        self.record('recovering_owned_orphan', previous_child=pid)
        kill_group(pid, signal.SIGTERM)
        until = time.monotonic() + self.config.get('shutdown_timeout', 8)
        while self.process_identity(pid) and time.monotonic() < until:
            time.sleep(.1)
        kill_group(pid, signal.SIGKILL)
        self.owner_path.unlink()

    def record(self, event, **details):
        state = dict(event=event, at=time.time(), supervisor=os.getpid(),
                     child=self.process.pid if self.process else None, **details)
        self.logger.info(json.dumps(state))
        temporary = self.status_path.with_suffix('.tmp')
        temporary.write_text(json.dumps(state))
        temporary.replace(self.status_path)

    def port_busy(self):
        with socket.socket() as probe:
            return probe.connect_ex(('127.0.0.1', self.config['port'])) == 0

    def healthy(self):
        started = time.monotonic()
        try:
            url = 'http://127.0.0.1:%s%s' % (self.config['port'], self.config['health_path'])
            with self.opener.open(url, timeout=self.config.get('timeout', 5)) as response:
                self.probe_details = dict(status=response.status, seconds=round(time.monotonic()-started, 3))
                return response.status == 200
        except (OSError, TimeoutError) as error:
            self.probe_details = dict(error=type(error).__name__, seconds=round(time.monotonic()-started, 3))
            return False

    def drain(self, stream):
        for line in stream:
            # Loading Next may consume most of the initial startup allowance.
            # Its observed startup phase gets one bounded compilation grace;
            # repeated progress lines must not hide an indefinitely hung child.
            if ('Compiling ' in line or 'Starting...' in line) and self.compiling_since is None:
                self.compiling_since = time.monotonic()
            if re.search(r' GET '+re.escape(self.config['health_path'])+r' 200(?: |$)', line):
                self.last_health_response = time.monotonic()
            self.logger.info('server %s', line.rstrip())
        stream.close()

    def recent_health_response(self):
        # A delayed successful response is evidence of life, not a hung process.
        window = self.config.get('interval', 20) + self.config.get('timeout', 5)
        return self.last_health_response is not None and time.monotonic() - self.last_health_response < window

    def compilation_grace_active(self):
        return (self.compiling_since is not None and
                time.monotonic() - self.compiling_since < self.config.get('compilation_grace', 180))

    def recovery_due(self, failures, failed_since):
        # Failed short probes alone cannot distinguish a busy dev compiler from
        # a deadlock. Require a continuous failure window as well as probe count.
        return (failures >= self.config.get("failure_limit", 3) and
                time.monotonic() - failed_since >= self.config.get("unresponsive_grace", 180))

    def terminate_owned(self):
        if self.process is None:
            return
        # The group remains ours even if its launcher exited before its child.
        kill_group(self.process.pid, signal.SIGTERM)
        try:
            self.process.wait(timeout=self.config.get('shutdown_timeout', 8))
        except subprocess.TimeoutExpired:
            pass
        kill_group(self.process.pid, signal.SIGKILL)
        self.process.wait()
        self.owner_path.unlink(missing_ok=True)

    def run(self):
        interval = self.config.get('interval', 20)
        grace = self.config.get('startup_grace', 120)
        attempts = 0
        try:
            self.reclaim_owned()
            while not self.stop.is_set():
                if self.port_busy():
                    # Never adopt or kill an unowned server, including another checkout.
                    self.record('port_occupied')
                    self.stop.wait(30)
                    continue
                self.process = subprocess.Popen(
                    self.config['command'], cwd=self.config['cwd'],
                    env={**os.environ, **self.config.get('environment', {})},
                    stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT, text=True, errors='replace',
                    start_new_session=True,
                )
                self.compiling_since = None
                self.last_health_response = None
                output = threading.Thread(target=self.drain, args=(self.process.stdout,), daemon=True)
                output.start()
                self.remember_owned()
                started = time.monotonic()
                failures = 0
                failed_since = None
                ready = False
                self.record('started')
                while not self.stop.wait(interval):
                    code = self.process.poll()
                    if code is not None:
                        self.record('exited', code=code)
                        break
                    if self.healthy():
                        self.compiling_since = None
                        failures = 0
                        failed_since = None
                        if not ready:
                            self.record('ready')
                            ready = True
                    elif self.compilation_grace_active() or self.recent_health_response():
                        failures = 0
                        failed_since = None
                    elif ready or time.monotonic() - started >= grace:
                        failures += 1
                        if failed_since is None:
                            failed_since = time.monotonic()
                        self.record('health_failed', failures=failures, probe=self.probe_details,
                                    failing_seconds=round(time.monotonic()-failed_since, 3))
                        if self.recovery_due(failures, failed_since):
                            self.record('unresponsive')
                            break
                self.terminate_owned()
                output.join(timeout=2)
                if self.stop.is_set():
                    break
                attempts = 0 if time.monotonic() - started > 180 else min(attempts + 1, 5)
                self.record('restarting')
                self.stop.wait(min(60, self.config.get('restart_delay', 2) * 2 ** attempts))
        finally:
            self.terminate_owned()
            self.record('stopped')


def main():
    config = json.loads(Path(sys.argv[1]).read_text())
    if not config['health_path'].startswith('/') or config['health_path'].startswith('//'):
        raise ValueError('Health path must be local')
    status = Path(config['status'])
    status.parent.mkdir(parents=True, exist_ok=True)
    # Prevent duplicate supervisors, even when somebody starts this manually.
    with status.with_suffix('.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        logger = logging.getLogger('local-preview')
        logger.setLevel(logging.INFO)
        handler = RotatingFileHandler(config['log'], maxBytes=5_000_000, backupCount=2)
        handler.setFormatter(logging.Formatter('%(asctime)s %(message)s'))
        logger.addHandler(handler)
        supervisor = Supervisor(config, logger)
        for sig in (signal.SIGTERM, signal.SIGINT):
            signal.signal(sig, lambda *_: supervisor.stop.set())
        supervisor.run()


if __name__ == '__main__':
    main()
