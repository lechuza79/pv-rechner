#!/usr/bin/env python3
"""Resumable, bounded contact crawling. No SMTP or database writes."""
import argparse
import concurrent.futures
import fcntl
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import threading
import time
from urllib.parse import urlparse
import uuid

ENGINE_FILES = ["lib/contact-evidence.ts", "lib/contact-discovery.ts", "lib/contact-quality.ts", "lib/contact-quality-evidence.ts", "scripts/lib/contact-fetch.ts", "scripts/lib/contact-crawl.ts", "scripts/lib/contact-render.ts", "scripts/lib/contact-batch.ts", "scripts/contact-full-research.ts", "scripts/lib/contact-deadline.ts", "lib/uri-sicher.ts", "lib/personen-fund.ts", "package-lock.json", "lib/municipal-contact-verification.ts", "scripts/lib/municipal-contact-audit.ts", "scripts/contact-supervised-worker.ts"]


def now():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def atomic(path, value):
    path = Path(path)
    temporary = path.with_name(path.name + "." + uuid.uuid4().hex + ".tmp")
    with open(temporary, "x", encoding="utf8") as stream:
        os.chmod(temporary, 0o600)
        json.dump(value, stream, ensure_ascii=True, indent=2)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, path)


def key(target):
    return hashlib.sha256((target["dataset"] + ":" + target["organization_id"]).encode()).hexdigest()


def read(path):
    return json.loads(Path(path).read_text())


def valid_result(value, target, engine):
    return (isinstance(value, dict) and value.get("dataset") == target["dataset"]
            and value.get("organization_id") == target["organization_id"]
            and value.get("engine") == engine and isinstance(value.get("status"), str)
            and isinstance(value.get("pages"), list) and isinstance(value.get("candidates"), list))


def retryable(value):
    if value.get("verificationMode") == "municipal-source-audit":
        return value.get("retryRequired") is True
    if value["status"] == "run-failed":
        return True
    pages = value.get("pages", [])
    return bool(pages) and not any(p.get("status") == "read" for p in pages) and any(p.get("status") == "failed" for p in pages)


def owned_processes(request_path):
    # Never kill by a stored PID alone: PIDs can have been reused since a crash.
    text = subprocess.check_output(["/bin/ps", "-axo", "pid=,pgid=,command="], text=True)
    found = []
    for line in text.splitlines():
        parts = line.strip().split(None, 2)
        if len(parts) == 3 and "contact-supervised-worker.ts" in parts[2] and str(request_path) in parts[2]:
            pid, group = int(parts[0]), int(parts[1])
            if pid == group:
                found.append(pid)
    return found


def stop_owned(request_path):
    for pid in owned_processes(request_path):
        try:
            os.killpg(pid, signal.SIGKILL)
        except ProcessLookupError:
            pass


def execute(request_path, command, timeout):
    """Hard deadline lives outside the JavaScript event loop and kills its group."""
    request_path = Path(request_path)
    request = read(request_path)
    with open(request["logPath"], "ab", buffering=0) as log:
        os.chmod(request["logPath"], 0o600)
        child = subprocess.Popen(command + [str(request_path)], stdin=subprocess.PIPE,
                                 stdout=log, stderr=log, start_new_session=True)
        try:
            request["pid"] = child.pid
            atomic(request_path, request)
            child.stdin.write(b"go\n")
            child.stdin.close()
            return child.wait(timeout=timeout), None
        except BrokenPipeError:
            return child.wait(timeout=timeout), "worker-handshake-failed"
        except subprocess.TimeoutExpired:
            os.killpg(child.pid, signal.SIGKILL)
            child.wait()
            return None, "worker-timeout"
        finally:
            if child.poll() is None:
                os.killpg(child.pid, signal.SIGKILL)
                child.wait()


class Supervisor:
    def __init__(self, directory, runtime, node, concurrency=8, timeout=360, attempts=3):
        self.directory = Path(directory).resolve()
        self.runtime = Path(runtime).resolve()
        self.node = node
        self.concurrency, self.timeout, self.max_attempts = concurrency, timeout, attempts
        self.inventory = read(self.directory / "inventory.json")
        self.engine = self.inventory["engine"]
        self.targets = self.inventory["targets"]
        if len({key(t) for t in self.targets}) != len(self.targets):
            raise ValueError("Duplicate inventory identity")
        digest = hashlib.sha256("\n".join((self.runtime / f).read_text() for f in ENGINE_FILES).encode()).hexdigest()
        if digest != self.engine:
            raise ValueError("Frozen runtime does not match inventory engine")
        dependency_digest = hashlib.sha256((self.runtime / "node_modules/.package-lock.json").read_bytes()).hexdigest()
        if dependency_digest != (self.runtime / "dependency-lock.sha256").read_text():
            raise ValueError("Runtime dependencies changed; refusing silent engine drift")
        self.results = self.directory / "results"
        self.attempts = self.directory / "supervised-attempts"
        self.quarantine = self.directory / "quarantine"
        for path in (self.results, self.attempts, self.quarantine):
            path.mkdir(mode=0o700, exist_ok=True)
        self.mutex = threading.Lock()
        self.hosts = {}
        self.completed = 0
        self.active = {}
        self.started_at = now()
        self.stopping = threading.Event()

    def state(self, status="running"):
        atomic(self.directory / "supervisor-state.json", {"status":status, "pid":os.getpid(),
            "startedAt":self.started_at, "heartbeatAt":now(), "expected":len(self.targets),
            "completed":self.completed, "active":self.active, "engine":self.engine})

    def recover(self):
        for path in self.attempts.glob("*.request.json"):
            outcome = Path(str(path).replace(".request.json", ".outcome.json"))
            if not outcome.exists():
                stop_owned(path)
                atomic(outcome, {"status":"interrupted", "at":now()})
        # Legacy empty locks may survive abrupt termination. Refuse takeover if
        # ANY legacy runner for this directory is still present.
        processes = subprocess.check_output(["/bin/ps", "-axo", "command="], text=True)
        if any("contact-full-research.ts" in line and str(self.directory) in line for line in processes.splitlines()):
            raise RuntimeError("Legacy crawl still active; refusing duplicate execution")
        atomic(self.directory / "running.lock", {"owner":"contact-supervisor", "pid":os.getpid()})

    def one(self, target):
        identity = key(target)
        result_path = self.results / (identity + ".json")
        if result_path.exists():
            try:
                existing = read(result_path)
                # The legacy batch omitted engine on exceptions; preserve and retry it.
                if isinstance(existing, dict) and existing.get("status") == "run-failed" and existing.get("dataset") == target["dataset"] and existing.get("organization_id") == target["organization_id"]:
                    existing = dict(existing, engine=self.engine)
                if not valid_result(existing, target, self.engine):
                    raise ValueError("Invalid checkpoint identity or schema")
            except (ValueError, KeyError, TypeError):
                os.replace(result_path, self.quarantine / (identity + "." + uuid.uuid4().hex + ".json"))
                existing = None
            if existing and not retryable(existing):
                return
        else:
            existing = None
        site = target.get("website") or ""
        host = urlparse(site if "://" in site else "https://" + site).hostname or identity
        with self.mutex:
            lock = self.hosts.setdefault(host, threading.Lock())
        with lock:
            previous = sorted(self.attempts.glob(identity + ".*.request.json"))
            # Recover a committed worker result if the supervisor died before
            # promoting it to the final checkpoint.
            for prior in previous:
                try:
                    recovered = read(read(prior)["outputPath"])
                    if valid_result(recovered, target, self.engine) and not retryable(recovered):
                        atomic(result_path, recovered)
                        return
                    if valid_result(recovered, target, self.engine) and (not existing or len(recovered["pages"]) > len(existing.get("pages", []))):
                        existing = recovered
                except (OSError, ValueError, KeyError, TypeError):
                    pass
            last_attempt = max((int(p.name.split(".")[1]) for p in previous), default=0)
            audit = target.get("audit")
            # Large municipalities can span many process deadlines. Durable new
            # source checkpoints extend work, but repeated no-progress failures stop.
            audit_sources = len(read(audit["inputPath"])["urls"]) if audit else 0
            attempt_limit = self.max_attempts + audit_sources
            no_progress = 0
            for attempt in range(last_attempt + 1, attempt_limit + 1):
                prior_checkpoints = len(list(Path(audit["directory"]).glob("*.json"))) if audit else 0
                if self.stopping.is_set():
                    raise RuntimeError("Supervisor stopping after infrastructure error")
                dependency_digest = hashlib.sha256((self.runtime / "node_modules/.package-lock.json").read_bytes()).hexdigest()
                if dependency_digest != (self.runtime / "dependency-lock.sha256").read_text():
                    raise RuntimeError("Runtime dependencies changed; crawl paused")
                stem = identity + "." + str(attempt)
                request_path = self.attempts / (stem + ".request.json")
                output_path = self.attempts / (stem + ".result.json")
                request = {"target":target, "engine":self.engine, "pageBudget":self.inventory["pageBudget"],
                    "attempt":attempt, "timeoutSeconds":self.timeout, "createdAt":now(),
                    "outputPath":str(output_path), "pagesPath":str(self.attempts / (stem + ".pages.jsonl")),
                    "logPath":str(self.attempts / (stem + ".log"))}
                atomic(request_path, request)
                with self.mutex:
                    self.active[identity] = {"target":target, "attempt":attempt, "startedAt":now()}
                code, error = execute(request_path, [self.node, "--import", "tsx", str(self.runtime / "scripts/contact-supervised-worker.ts")], self.timeout)
                candidate = None
                try:
                    candidate = read(output_path)
                    if not valid_result(candidate, target, self.engine):
                        raise ValueError("Worker produced invalid result")
                except (OSError, ValueError, KeyError, TypeError):
                    error = error or ("invalid-worker-result" if code == 0 else "worker-exit-" + str(code))
                    candidate = None
                atomic(self.attempts / (stem + ".outcome.json"), {"at":now(), "exitCode":code, "error":error, "status":candidate["status"] if candidate else "run-failed"})
                if candidate and code == 0:
                    if not retryable(candidate):
                        atomic(result_path, candidate)
                        return
                    # Preserve all attempts; do not replace richer page evidence
                    # with a later transport failure.
                    if not existing or len(candidate["pages"]) > len(existing.get("pages", [])):
                        existing = candidate
                if audit:
                    new_checkpoints = len(list(Path(audit["directory"]).glob("*.json")))
                    no_progress = 0 if new_checkpoints > prior_checkpoints else no_progress + 1
                    if no_progress >= self.max_attempts:
                        break
                if attempt < attempt_limit:
                    time.sleep(min(30, 2 ** min(attempt, 5)))
            if existing:
                existing["supervision"] = {"attemptsExhausted":True, "attempts":attempt if last_attempt < attempt_limit else last_attempt}
                atomic(result_path, existing)
            else:
                atomic(result_path, {"dataset":target["dataset"], "organization_id":target["organization_id"],
                    "source":target, "engine":self.engine, "observed_at":now(), "status":"run-failed",
                    "pages":[], "candidates":[], "pending_urls":[],
                    "error":"Retries exhausted; per-attempt evidence retained", "supervision":{"attemptsExhausted":True,"attempts":attempt if last_attempt < attempt_limit else last_attempt}})

    def run(self):
        lock = open(self.directory / "supervisor.lock", "a")
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            lock.close()
            return
        self.recover()
        self.state()
        def job(target):
            try:
                self.one(target)
            finally:
                with self.mutex:
                    self.active.pop(key(target), None)
            with self.mutex:
                self.completed += 1
        pool = concurrent.futures.ThreadPoolExecutor(max_workers=self.concurrency)
        remaining = iter(self.targets)
        pending = set()
        for _ in range(self.concurrency):
            target = next(remaining, None)
            if target is not None:
                pending.add(pool.submit(job, target))
        try:
            while pending:
                done, pending = concurrent.futures.wait(pending, timeout=10, return_when=concurrent.futures.FIRST_COMPLETED)
                for future in done:
                    future.result()
                    target = next(remaining, None)
                    if target is not None:
                        pending.add(pool.submit(job, target))
                with self.mutex:
                    self.state()
        except BaseException:
            self.stopping.set()
            for future in pending:
                future.cancel()
            for path in self.attempts.glob("*.request.json"):
                if not Path(str(path).replace(".request.json", ".outcome.json")).exists():
                    stop_owned(path)
            raise
        finally:
            pool.shutdown(wait=True, cancel_futures=True)
        outcomes = {}
        for target in self.targets:
            value = read(self.results / (key(target) + ".json"))
            if not valid_result(value, target, self.engine):
                raise ValueError("Final coverage validation failed")
            outcomes[value["status"]] = outcomes.get(value["status"], 0) + 1
        atomic(self.directory / "summary.json", {"startedAt":self.started_at, "finishedAt":now(),
            "engine":self.engine, "expected":len(self.targets), "recorded":len(self.targets),
            "outcomes":outcomes, "supervised":True,
            "completeness":"Every inventory row has a result; failed and partial rows are NOT complete contact discovery"})
        self.state("complete")
        (self.directory / "running.lock").unlink(missing_ok=True)
        lock.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", required=True)
    parser.add_argument("--runtime", required=True)
    parser.add_argument("--node", required=True)
    parser.add_argument("--concurrency", type=int, default=8, choices=range(1, 9))
    parser.add_argument("--timeout", type=int, default=360)
    parser.add_argument("--attempts", type=int, default=3, choices=range(1, 4))
    args = parser.parse_args()
    if args.timeout < 1:
        parser.error("timeout must be positive")
    Supervisor(args.directory, args.runtime, args.node, args.concurrency, args.timeout, args.attempts).run()


if __name__ == "__main__":
    main()
