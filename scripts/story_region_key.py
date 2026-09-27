"""Resolve official municipality successors consistently with the production import."""
import json
from pathlib import Path
TABLE = json.loads((Path(__file__).resolve().parent.parent / 'lib/ags-nachfolger-daten.json').read_text())['nachfolger']
def current_key(key):
    seen = set()
    while key in TABLE and key not in seen:
        seen.add(key)
        key = TABLE[key]['neu']
    return key
