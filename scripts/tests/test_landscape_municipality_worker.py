"""Pure helper regression checks; no source downloads or scene preparation."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('ni_worker', Path(__file__).resolve().parents[1]/'landscape-municipality-worker.py')
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


def node(identifier, name):
    return dict(type='node', id=identifier, lon=8.3, lat=53, tags=dict(name=name, place='village'))


class WorkerTests(unittest.TestCase):
    def test_exact_town_beats_other_place(self):
        self.assertEqual(worker.choose_town([node(1,'Dötlingen'),node(2,'Other')],'Dötlingen')['id'],1)

    def test_ambiguous_exact_name_fails_even_with_admin_centre(self):
        with self.assertRaises(ValueError):worker.choose_town([node(1,'A'),node(2,'A')],'A',{1})

    def test_only_sourced_admin_centre_can_fallback(self):
        self.assertEqual(worker.choose_town([node(1,'Centre')],'Municipality',{1})['id'],1)
        with self.assertRaises(ValueError):worker.choose_town([node(1,'Centre')],'Municipality')

    def test_newest_tile_is_independent_of_page_order(self):
        geometry = dict(type='Polygon',coordinates=[[[8,53],[8.01,53],[8.01,53.01],[8,53.01],[8,53]]])
        def tile(stamp, identifier):
            return dict(id=identifier,geometry=geometry,properties=dict(datetime=stamp),assets={'data':{'href':identifier}})
        old,new = tile('2020-01-01','old'),tile('2025-01-01','new')
        area = worker.transform(worker.metric.transform,worker.shape(geometry))
        for values in ([old,new],[new,old]):
            self.assertEqual(worker.selected_tiles([{'features':values}],area,'data'),['new'])

    def test_missing_acquisition_date_fails(self):
        geometry = dict(type='Polygon',coordinates=[[[8,53],[8.01,53],[8.01,53.01],[8,53.01],[8,53]]])
        item = dict(id='x',geometry=geometry,properties={},assets={'data':{'href':'x'}})
        area = worker.transform(worker.metric.transform,worker.shape(geometry))
        with self.assertRaises(ValueError):worker.selected_tiles([{'features':[item]}],area,'data')

    def test_verified_cache_is_reused_without_network(self):
        with tempfile.TemporaryDirectory() as directory:
            inputs = Path(directory);cached = inputs/'old.gml';cached.write_bytes(b'checked')
            url = 'https://example.test/tile.gml'
            reuse = {url:[dict(file=cached.name,url=url,sha256=worker.shared.digest(cached))]}
            with patch.object(worker.requests,'get',side_effect=AssertionError('network forbidden')):
                result = worker.download(inputs,'new','lod',url,reuse)
            self.assertEqual((inputs/result['file']).read_bytes(),b'checked')
            self.assertEqual((inputs/result['file']).stat().st_ino,cached.stat().st_ino)

    def test_solar_extends_flight_rectangle(self):
        rows = [dict(lon=8,lat=53)]
        town = node(1,'A')
        polygon = dict(type='Polygon',coordinates=[[[8.4,53],[8.41,53],[8.41,53.01],[8.4,53.01],[8.4,53]]])
        boundary = worker.box(7,52,9,54)
        terrain,_ = worker.coverage(rows,town,[{'geometry':polygon}],boundary)
        for point in polygon['coordinates'][0]:
            self.assertTrue(terrain.covers(worker.Point(*worker.metric.transform(*point))))


if __name__=='__main__':unittest.main()
