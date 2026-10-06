"""Offline checks for the state tile adapters; no downloads."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('states', Path(__file__).resolve().parents[1]/'landscape_state_sources.py')
states = importlib.util.module_from_spec(spec)
spec.loader.exec_module(states)


class Response:
    def __init__(self, text):
        self.text = text
        self.content = text.encode()


class StateSourceTests(unittest.TestCase):
    def test_adapter_by_state_prefix_only_for_municipalities(self):
        self.assertEqual(states.adapter_for('12061244')['key'], 'brandenburg')
        self.assertEqual(states.adapter_for('05166012')['native'], 25832)
        self.assertIsNone(states.adapter_for('07312000'))
        self.assertIsNone(states.adapter_for('12061'))

    def test_gml_conversion_moves_horizontal_only_and_relabels(self):
        text = ('<gml:Envelope srsName="urn:adv:crs:ETRS89_UTM33*DE_DHHN2016_NH"><gml:lowerCorner>411000 5754000 50</gml:lowerCorner>'
                '<gml:upperCorner>412000 5755000 70</gml:upperCorner></gml:Envelope>'
                '<gml:posList srsDimension="3">411015.261 5754469.398 57.334 411020 5754465 59.345</gml:posList>')
        out = states.convert_gml(text)
        self.assertNotIn('UTM33', out)
        numbers = [float(v) for v in out.split('<gml:posList srsDimension="3">')[1].split('<')[0].split()]
        back = states.Transformer.from_crs(25832, 25833, always_xy=True)
        x, y = back.transform(numbers[0], numbers[1])
        self.assertAlmostEqual(x, 411015.261, places=2)
        self.assertAlmostEqual(y, 5754469.398, places=2)
        self.assertEqual(numbers[2], 57.334)
        with self.assertRaises(ValueError):
            states.convert_gml(out)

    def test_brandenburg_terrain_is_one_wcs_request_covering_the_box(self):
        area = states.box(805000, 5760000, 805500, 5760500)
        jobs = states.bb_tiles(area, area, lambda url: Response(''))
        self.assertEqual([k for k, _ in jobs], ['dgm'])
        url = jobs[0][1]
        self.assertTrue(url.startswith(states.BB_WCS+'?'))
        native = states.Transformer.from_crs(25832, 25833, always_xy=True)
        x0, y0 = native.transform(805000, 5760000)
        import re
        xs = [int(v) for v in re.search(r'x\((\d+),(\d+)\)', url).groups()]
        ys = [int(v) for v in re.search(r'y\((\d+),(\d+)\)', url).groups()]
        self.assertTrue(xs[0] < x0 < xs[1] and ys[0] < y0 < ys[1])

    def test_nrw_takes_newest_terrain_year(self):
        area = states.box(330100, 5700100, 330200, 5700200)
        index = ('<opengeodata><file name="dgm1_32_330_5700_1_nw_2019.tif"/><file name="dgm1_32_330_5700_1_nw_2023.tif"/>'
                 '<file name="LoD2_32_330_5700_1_NW.gml"/></opengeodata>')
        jobs = states.nrw_tiles(area, area, lambda url: Response(index))
        self.assertIn(('dgm', states.NRW_DGM+'dgm1_32_330_5700_1_nw_2023.tif'), jobs)
        self.assertIn(('lod', states.NRW_LOD+'LoD2_32_330_5700_1_NW.gml'), jobs)

    def test_sachsen_anhalt_tiles_come_from_the_page_index_by_2km_label(self):
        page = ("x new gc.mod.MapDownloadSelector(\n 'mapdownloader_content',\n "
                "'{\"type\": \"FeatureCollection\",\"features\": [{\"type\": \"Feature\",\"properties\": {\"id\": \"689732\",\"label\": \"327245648\"}}]}',\n"
                " 'EPSG:4647', 'https://www.lvermgeo.sachsen-anhalt.de/de/mod/4,1965,501/ajax/1/prepare/?'")
        area = states.box(724100, 5648100, 724200, 5648200)
        jobs = states.st_tiles(area, area, lambda url: Response(page))
        self.assertEqual(jobs, [(kind, 'https://www.lvermgeo.sachsen-anhalt.de/de/mod/4,1965,501/ajax/1/prepare/?items=689732&format=zip')
                                for kind in ('dgm', 'lod')])
        outside = states.box(800100, 5648100, 800200, 5648200)
        self.assertEqual(states.st_tiles(outside, outside, lambda url: Response(page)), [])

    def test_sachsen_anhalt_archive_must_hold_one_utm32_citygml(self):
        def archive(files):
            buffer = states.io.BytesIO()
            with states.zipfile.ZipFile(buffer, 'w') as z:
                for name, data in files.items(): z.writestr(name, data)
            return buffer.getvalue()
        good = archive({'LoD2_32_724_5648_2_ST.gml': '<x srsName="urn:adv:crs:ETRS89_UTM32*DE_DHHN2016_NH"/>', 'terms.pdf': 'x'})
        self.assertEqual(states.st_member(good, 'lod')[0], 'LoD2_32_724_5648_2_ST.gml')
        with self.assertRaises(ValueError):
            states.st_member(archive({'a.gml': '<x srsName="EPSG:25833"/>'}), 'lod')
        with self.assertRaises(ValueError):
            states.st_member(archive({'a.tif': 'x', 'b.tif': 'y'}), 'dgm')


if __name__ == '__main__':
    unittest.main()
