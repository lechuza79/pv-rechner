"""Recover the bounded pilot inputs from their recorded official source manifests."""
import argparse, hashlib, json
from pathlib import Path
import requests

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('directory', type=Path)
parser.add_argument('municipalities', nargs='*', default=['09679147', '07312000', '06632009'])
args = parser.parse_args()
args.directory.mkdir(parents=True, exist_ok=True)
root = Path(__file__).resolve().parents[1] / 'public/geo/landscape-tours'
manifest = []
for municipality in args.municipalities:
    provenance = json.loads((root / municipality / 'provenance.json').read_text())
    for entry in provenance['sources']:
        if Path(entry['file']).name != entry['file']:
            raise ValueError('Source file must be a basename')
        destination = args.directory / entry['file']
        if not destination.exists():
            temporary = destination.with_suffix(destination.suffix + '.part')
            with requests.get(entry['url'], stream=True, timeout=(15, 60)) as response:
                response.raise_for_status()
                with temporary.open('wb') as output:
                    for chunk in response.iter_content(1024 * 1024):
                        output.write(chunk)
            temporary.replace(destination)
        if hashlib.sha256(destination.read_bytes()).hexdigest() != entry['sha256']:
            raise ValueError('Source changed; review before preparing: ' + entry['file'])
        manifest.append(entry)
        print(entry['file'], flush=True)
(args.directory / 'sources.json').write_text(json.dumps(manifest, indent=2))
