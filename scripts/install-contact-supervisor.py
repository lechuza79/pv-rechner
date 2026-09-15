#!/usr/bin/env python3
"""Prepare an immutable runtime and optionally register its user launch agent."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys


def prepare(directory, repo, node):
    directory, repo = Path(directory).resolve(), Path(repo).resolve()
    runtime = directory / "supervisor-runtime"
    if runtime.exists():
        raise RuntimeError("Runtime already exists; inspect it rather than overwriting running code")
    runtime.mkdir(mode=0o700)
    # Preserve the legacy engine unchanged: existing valid results stay reusable.
    for name in ["lib", "scripts/lib"]:
        shutil.copytree(repo / name, runtime / name, ignore=shutil.ignore_patterns("__tests__", "__pycache__"))
    for name in ["package.json", "package-lock.json", "tsconfig.json", "scripts/contact-full-research.ts", "scripts/contact-supervised-worker.ts", "scripts/contact-supervisor.py"]:
        shutil.copyfile(repo / name, runtime / name)
    (runtime / "node_modules").symlink_to((repo / "node_modules").resolve(), target_is_directory=True)
    dependency_lock = runtime / "node_modules/.package-lock.json"
    dependency_digest = hashlib.sha256(dependency_lock.read_bytes()).hexdigest()
    (runtime / "dependency-lock.sha256").write_text(dependency_digest)
    label = "io.solar-check.contact-" + hashlib.sha256(str(directory).encode()).hexdigest()[:12]
    plist = {"Label":label, "ProgramArguments":[sys.executable, str(runtime / "scripts/contact-supervisor.py"),
        "--directory", str(directory), "--runtime", str(runtime), "--node", str(Path(node).resolve()),
        "--concurrency", "4" if json.loads((directory / "inventory.json").read_text()).get("mode") == "municipal-source-audit" else "8", "--timeout", "1800" if json.loads((directory / "inventory.json").read_text()).get("mode") == "municipal-source-audit" else "360", "--attempts", "3"],
        "WorkingDirectory":str(runtime), "RunAtLoad":True,
        "KeepAlive":{"SuccessfulExit":False}, "ThrottleInterval":30,
        "ProcessType":"Standard" if json.loads((directory / "inventory.json").read_text()).get("mode") == "municipal-source-audit" else "Background", "EnvironmentVariables":{"PYTHONUNBUFFERED":"1"},
        "StandardOutPath":str(directory / "supervisor.log"),
        "StandardErrorPath":str(directory / "supervisor-error.log")}
    path = directory / "supervisor.plist"
    path.write_bytes(plistlib.dumps(plist))
    os.chmod(path, 0o600)
    return label, path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", required=True)
    parser.add_argument("--repo", default=str(Path(__file__).resolve().parents[1]))
    parser.add_argument("--node", default=shutil.which("node"))
    parser.add_argument("--install", action="store_true")
    args = parser.parse_args()
    directory = Path(args.directory).resolve()
    prepared = directory / "supervisor.plist"
    if prepared.exists():
        label = plistlib.loads(prepared.read_bytes())["Label"]
    else:
        label, prepared = prepare(directory, args.repo, args.node)
    if args.install:
        destination = Path.home() / "Library/LaunchAgents" / (label + ".plist")
        if destination.exists() and destination.read_bytes() != prepared.read_bytes():
            raise RuntimeError("A different launch agent already uses this label")
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(prepared, destination)
        os.chmod(destination, 0o600)
        subprocess.run(["/bin/launchctl", "bootstrap", "gui/" + str(os.getuid()), str(destination)], check=True)
    print(json.dumps({"label":label, "preparedPlist":str(prepared), "installed":args.install}))


if __name__ == "__main__":
    main()
