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


if __name__ == '__main__':
    unittest.main()
