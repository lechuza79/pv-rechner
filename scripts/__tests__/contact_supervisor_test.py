import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("supervisor", Path(__file__).parents[1] / "contact-supervisor.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class SupervisorTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.target = {"dataset":"kommunen", "organization_id":"test", "website":"https://example.org"}

    def tearDown(self):
        self.temp.cleanup()

    def supervisor(self):
        obj = object.__new__(m.Supervisor)
        obj.directory = self.root
        obj.results = self.root / "results"
        obj.attempts = self.root / "attempts"
        obj.quarantine = self.root / "quarantine"
        for p in (obj.results, obj.attempts, obj.quarantine):
            p.mkdir(exist_ok=True)
        (self.root / "node_modules").mkdir(exist_ok=True)
        (self.root / "node_modules/.package-lock.json").write_text("{}")
        (self.root / "dependency-lock.sha256").write_text(m.hashlib.sha256(b"{}").hexdigest())
        obj.engine = "frozen"
        obj.inventory = {"pageBudget":20}
        obj.runtime = self.root
        obj.node = "unused"
        obj.max_attempts = 3
        obj.timeout = 1
        obj.mutex = m.threading.Lock()
        obj.stopping = m.threading.Event()
        obj.hosts = {}
        obj.active = {}
        return obj

    def result(self, status="found"):
        return dict(self.target, engine="frozen", status=status, pages=[], candidates=[])

    def test_source_unicode_surrogates_survive_checkpointing(self):
        value = {"text": "broken \udc49 source"}
        path = self.root / "unicode.json"
        m.atomic(path, value)
        self.assertEqual(m.read(path), value)

    def test_hard_timeout_terminates_a_busy_process(self):
        request = self.root / "request.json"
        m.atomic(request, {"logPath":str(self.root / "log")})
        code, error = m.execute(request, [sys.executable, "-c", "import sys;sys.stdin.read();exec('while True: pass')"], .15)
        self.assertIsNone(code)
        self.assertEqual(error, "worker-timeout")
        with self.assertRaises(ProcessLookupError):
            os.kill(m.read(request)["pid"], 0)

    def test_successful_checkpoint_is_never_repeated(self):
        obj = self.supervisor()
        path = obj.results / (m.key(self.target) + ".json")
        m.atomic(path, self.result())
        with patch.object(m, "execute", side_effect=AssertionError("Must not run")):
            obj.one(self.target)
        self.assertEqual(m.read(path), self.result())

    def test_crash_retries_and_promotes_success(self):
        obj = self.supervisor()
        calls = []
        def execute(path, command, timeout):
            request = m.read(path)
            calls.append(request["attempt"])
            if len(calls) == 1:
                return 1, "crash"
            m.atomic(request["outputPath"], self.result())
            return 0, None
        with patch.object(m, "execute", side_effect=execute), patch.object(m.time, "sleep"):
            obj.one(self.target)
        self.assertEqual(calls, [1, 2])
        self.assertEqual(m.read(obj.results / (m.key(self.target) + ".json"))["status"], "found")

    def test_retry_budget_survives_restart_and_exhaustion_is_not_success(self):
        obj = self.supervisor()
        with patch.object(m, "execute", return_value=(1,"crash")) as run, patch.object(m.time, "sleep"):
            obj.one(self.target)
            self.assertEqual(run.call_count, 3)
        with patch.object(m, "execute", side_effect=AssertionError("Budget must survive restart")):
            self.supervisor().one(self.target)
        result = m.read(obj.results / (m.key(self.target) + ".json"))
        self.assertEqual(result["status"], "run-failed")
        self.assertTrue(result["supervision"]["attemptsExhausted"])

    def test_completed_worker_result_survives_supervisor_crash(self):
        obj = self.supervisor()
        stem = m.key(self.target) + ".1"
        output = obj.attempts / (stem + ".result.json")
        m.atomic(output, self.result())
        m.atomic(obj.attempts / (stem + ".request.json"), {"outputPath":str(output)})
        with patch.object(m, "execute", side_effect=AssertionError("Do not repeat completed worker")):
            obj.one(self.target)
        self.assertEqual(m.read(obj.results / (m.key(self.target) + ".json"))["status"], "found")

    def test_corrupt_checkpoint_is_retained_then_researched(self):
        obj = self.supervisor()
        path = obj.results / (m.key(self.target) + ".json")
        path.write_text("broken")
        def execute(request, *_):
            m.atomic(m.read(request)["outputPath"], self.result())
            return 0, None
        with patch.object(m, "execute", side_effect=execute):
            obj.one(self.target)
        self.assertEqual(len(list(obj.quarantine.glob("*.json"))), 1)
        self.assertEqual(m.read(path)["status"], "found")

    def test_dependency_drift_does_not_spend_retry_budget(self):
        obj = self.supervisor()
        (self.root / "node_modules/.package-lock.json").write_text("changed")
        with self.assertRaisesRegex(RuntimeError, "dependencies changed"), patch.object(m, "execute") as run:
            obj.one(self.target)
        run.assert_not_called()
        self.assertEqual(list(obj.attempts.glob("*.request.json")), [])

    def test_retryable_evidence_survives_supervisor_restart(self):
        obj = self.supervisor()
        value = self.result("partial")
        value["pages"] = [{"status":"failed", "url":"https://example.org"}]
        for attempt in range(1, 4):
            stem = m.key(self.target) + "." + str(attempt)
            output = obj.attempts / (stem + ".result.json")
            m.atomic(output, value)
            m.atomic(obj.attempts / (stem + ".request.json"), {"outputPath":str(output)})
        with patch.object(m, "execute", side_effect=AssertionError("Budget exhausted")):
            obj.one(self.target)
        self.assertEqual(m.read(obj.results / (m.key(self.target) + ".json"))["pages"], value["pages"])

    def test_pid_reuse_does_not_kill_unrelated_processes(self):
        request = self.root / "specific.request.json"
        rows = "111 111 node unrelated.ts\n222 222 node contact-supervised-worker.ts /different/request.json\n"
        with patch.object(m.subprocess, "check_output", return_value=rows), patch.object(m.os, "killpg") as kill:
            m.stop_owned(request)
            kill.assert_not_called()

    def test_partial_findings_are_not_treated_as_empty_failure(self):
        value = self.result("partial")
        value["pages"] = [{"status":"read"}, {"status":"failed"}]
        self.assertFalse(m.retryable(value))
        value["pages"] = [{"status":"failed"}]
        self.assertTrue(m.retryable(value))


if __name__ == "__main__":
    unittest.main()
