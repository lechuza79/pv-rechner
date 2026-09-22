"""Verify and deterministically pack the explicit public-asset manifest."""
from pathlib import Path
import gzip, hashlib, io, json, tarfile
ROOT = Path(__file__).resolve().parents[2]
LOCAL = Path(__file__).resolve().parent
rows = json.loads((LOCAL / 'handoff-assets.json').read_text())
output = LOCAL / 'build' / 'handoff-assets.tar.gz'
output.parent.mkdir(exist_ok=True)
with output.open('wb') as raw, gzip.GzipFile(filename='', fileobj=raw, mode='wb', mtime=0) as zipped, tarfile.open(fileobj=zipped, mode='w') as archive:
    for row in sorted(rows, key=lambda row: row['path']):
        relative = Path(row['path'])
        if relative.is_absolute() or '..' in relative.parts or relative.parts[0] != 'public':
            raise ValueError(f'Invalid public asset path: {relative}')
        path = ROOT / relative
        if path.is_symlink():
            raise ValueError(f'Asset must be a regular file: {relative}')
        content = path.read_bytes()
        if hashlib.sha256(content).hexdigest() != row['sha256']:
            raise ValueError(f'Asset hash mismatch: {relative}')
        info = tarfile.TarInfo(relative.as_posix())
        info.size = len(content)
        info.mode = 0o644
        archive.addfile(info, io.BytesIO(content))
print(f'{len(rows)} verified assets: {output.name} sha256={hashlib.sha256(output.read_bytes()).hexdigest()}')
