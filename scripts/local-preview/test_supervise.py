"""Exercise actual child exits, hangs, ownership and the narrow reaper exception."""
import json
import io
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

from install import patch_reaper, REAPER_ANCHOR, REAPER_EXCEPTION
from supervise import Supervisor

SERVER = '''
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
import sys, time
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if Path(sys.argv[2]).exists(): time.sleep(float(Path(sys.argv[2]).read_text() or 30))
        self.send_response(200); self.end_headers(); self.wfile.write(b'OK')
    def log_message(self, *args): pass
ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1])), Handler).serve_forever()
'''


class Events:
    def __init__(self):
        self.events = []

    def info(self, message, *args):
        if not args:
            self.events.append(json.loads(message))


class SupervisorTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        with socket.socket() as probe:
            probe.bind(('127.0.0.1', 0))
            self.port = probe.getsockname()[1]
        self.events = Events()
        self.supervisor = Supervisor(dict(
            cwd=str(self.root), port=self.port, health_path='/health',
            command=[sys.executable, '-u', '-c', SERVER, str(self.port), str(self.root/'hang')],
            status=str(self.root/'status.json'), interval=.05, timeout=.1,
            startup_grace=1, failure_limit=2, unresponsive_grace=0, shutdown_timeout=.2, restart_delay=.01,
        ), self.events)
        self.thread = threading.Thread(target=self.supervisor.run)

    def wait_for(self, predicate):
        deadline = time.monotonic()+8
        while time.monotonic() < deadline:
            if predicate():
                return
            time.sleep(.02)
        self.fail('Timed out: '+str(self.events.events))

    def count(self, name):
        return sum(event['event'] == name for event in self.events.events)

    def tearDown(self):
        self.supervisor.stop.set()
        if self.thread.ident:
            self.thread.join(timeout=3)
        self.assertFalse(self.thread.is_alive())
        self.directory.cleanup()

    def test_restarts_exited_child_and_records_signal(self):
        self.thread.start()
        self.wait_for(lambda: self.count('ready') == 1)
        first = self.supervisor.process.pid
        os.kill(first, signal.SIGTERM)
        self.wait_for(lambda: self.count('ready') == 2)
        self.assertNotEqual(first, self.supervisor.process.pid)
        self.assertEqual(next(e['code'] for e in self.events.events if e['event'] == 'exited'), -signal.SIGTERM)

    def test_recovers_unresponsive_child(self):
        self.thread.start()
        self.wait_for(lambda: self.count('ready') == 1)
        first = self.supervisor.process.pid
        (self.root/'hang').touch()
        self.wait_for(lambda: self.count('unresponsive') == 1)
        (self.root/'hang').unlink()
        self.wait_for(lambda: self.count('ready') == 2)
        self.assertNotEqual(first, self.supervisor.process.pid)

    def test_temporary_slow_responses_do_not_restart_a_live_child(self):
        self.supervisor.config['unresponsive_grace'] = .8
        self.thread.start()
        self.wait_for(lambda: self.count('ready') == 1)
        first = self.supervisor.process.pid
        (self.root/'hang').write_text('.2')
        self.wait_for(lambda: self.count('health_failed') >= 2)
        (self.root/'hang').unlink()
        time.sleep(.4)
        self.assertEqual(self.supervisor.process.pid, first)
        self.assertEqual(self.count('unresponsive'), 0)
        self.assertTrue(self.supervisor.healthy())

    def test_failure_window_remains_bounded_for_a_real_hang(self):
        self.supervisor.config['unresponsive_grace'] = 180
        with patch('supervise.time.monotonic', return_value=179):
            self.assertFalse(self.supervisor.recovery_due(8, 0))
        with patch('supervise.time.monotonic', return_value=181):
            self.assertTrue(self.supervisor.recovery_due(8, 0))
            self.assertFalse(self.supervisor.recovery_due(1, 0))

    def test_late_health_success_counts_but_unrelated_routes_do_not(self):
        self.supervisor.drain(io.StringIO(' GET /other 200 in 5000ms\n GET /health 500 in 5000ms\n'))
        self.assertFalse(self.supervisor.recent_health_response())
        self.supervisor.drain(io.StringIO(' GET /health 200 in 7890ms\n'))
        self.assertTrue(self.supervisor.recent_health_response())
        self.supervisor.last_health_response -= 1
        self.assertFalse(self.supervisor.recent_health_response())

    def test_compilation_grace_is_bounded(self):
        self.supervisor.config['compilation_grace'] = .3
        self.thread.start()
        self.wait_for(lambda: self.count('ready') == 1)
        first = self.supervisor.process.pid
        self.supervisor.compiling_since = time.monotonic()
        (self.root/'hang').touch()
        time.sleep(.2)
        self.assertEqual(self.supervisor.process.pid, first)
        self.assertEqual(self.count('unresponsive'), 0)
        self.wait_for(lambda: self.count('unresponsive') == 1)
        (self.root/'hang').unlink()
        self.wait_for(lambda: self.count('ready') == 2)

    def test_delayed_startup_gets_one_bounded_progress_grace(self):
        self.supervisor.config['compilation_grace'] = 180
        with patch('supervise.time.monotonic', return_value=110):
            self.supervisor.drain(io.StringIO(' ✓ Starting...\n'))
        with patch('supervise.time.monotonic', return_value=190):
            self.assertTrue(self.supervisor.compilation_grace_active())
            self.supervisor.drain(io.StringIO(' ✓ Starting...\n ○ Compiling /page ...\n'))
            self.assertEqual(self.supervisor.compiling_since, 110)
        with patch('supervise.time.monotonic', return_value=291):
            self.assertFalse(self.supervisor.compilation_grace_active())

    def test_never_touches_foreign_listener(self):
        with socket.socket() as foreign:
            foreign.bind(('127.0.0.1', self.port))
            foreign.listen()
            self.thread.start()
            self.wait_for(lambda: self.count('port_occupied') == 1)
            self.assertIsNone(self.supervisor.process)
            self.assertEqual(foreign.getsockname()[1], self.port)

    def test_stop_releases_owned_port(self):
        self.thread.start()
        self.wait_for(lambda: self.count('ready') == 1)
        self.supervisor.stop.set()
        self.thread.join(timeout=3)
        self.assertFalse(self.supervisor.port_busy())

    def test_recovers_proven_orphan_from_previous_supervisor(self):
        process = subprocess.Popen(self.supervisor.config['command'], cwd=self.root,
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
        try:
            self.supervisor.process = process
            self.supervisor.remember_owned()
            replacement = Supervisor(self.supervisor.config, self.events)
            replacement.reclaim_owned()
            process.wait(timeout=2)
            self.assertEqual(self.count('recovering_owned_orphan'), 1)
            self.assertFalse(replacement.owner_path.exists())
        finally:
            if process.poll() is None:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait()

    def test_refuses_reused_or_unrelated_pid(self):
        # An unrelated live process must survive an invalid old ownership record.
        process = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(30)'],
                                   cwd=self.root, start_new_session=True)
        try:
            self.supervisor.owner_path.write_text(json.dumps(dict(pid=process.pid, started='wrong generation', cwd=str(self.root))))
            with self.assertRaises(RuntimeError):
                self.supervisor.reclaim_owned()
            self.assertIsNone(process.poll())
        finally:
            process.terminate()
            process.wait()

    def test_reaper_patch_is_narrow_idempotent_and_refuses_unknown_source(self):
        source = 'before\n'+REAPER_ANCHOR+'\nafter'
        patched = patch_reaper(source)
        self.assertEqual(patched, 'before\n'+REAPER_EXCEPTION+REAPER_ANCHOR+'\nafter')
        self.assertEqual(patch_reaper(patched), patched)
        with self.assertRaises(ValueError):
            patch_reaper('unknown script')


if __name__ == '__main__':
    unittest.main()
