"""Adding a municipality cannot silently delete previously released weather stops."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
spec=importlib.util.spec_from_file_location('metadata',Path(__file__).resolve().parents[1]/'landscape-stop-metadata.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class MetadataTests(unittest.TestCase):
    def test_preserves_released_district_without_local_register(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);out=root/'public/geo/landscape-tours/03458';out.mkdir(parents=True)
            (out/'scene.json').write_text(json.dumps({'stops':[{'id':'wind-1','kind':'wind'}]}))
            target=root/'public/geo/landscape-wind-stops.json'
            old={'03458':{'wind-1':{'name':'Existing park','latitude':53,'longitude':8}}}
            target.write_text(json.dumps(old));self.assertEqual(m.generate(root),old)

    def test_missing_evidence_fails_without_replacing_previous_file(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);out=root/'public/geo/landscape-tours/03458';out.mkdir(parents=True)
            (out/'scene.json').write_text(json.dumps({'stops':[{'id':'new','kind':'wind'}]}))
            target=root/'public/geo/landscape-wind-stops.json';target.write_text('{}')
            with self.assertRaises(ValueError):m.generate(root)
            self.assertEqual(target.read_text(),'{}')

    def test_missing_location_is_not_removed(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);(root/'public/geo/landscape-tours').mkdir(parents=True)
            target=root/'public/geo/landscape-wind-stops.json';target.write_text('{"03458":{}}')
            with self.assertRaisesRegex(ValueError,'disappear'):m.generate(root)
            self.assertEqual(target.read_text(),'{"03458":{}}')

if __name__=='__main__':unittest.main()
