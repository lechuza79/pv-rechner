"""Missing turbine dimensions are estimated from comparable turbines, never invented or overwritten."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('dims', Path(__file__).resolve().parents[1]/'landscape_wind_dimensions.py')
dims = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dims)


def turbine(id, model=None, kw=1000, hub=None, rotor=None):
    return dict(id=id, model=model, ratedKw=kw, hub=hub, rotor=rotor, rotorMetres=rotor)


class WindDimensions(unittest.TestCase):
    pool = [turbine('a', 'NM60/1000', hub=70, rotor=60), turbine('b', 'NM 60/1000', hub=72, rotor=60),
            turbine('c', 'E-58', hub=70, rotor=58), turbine('d', None, 1050, 65, 54)]

    def test_same_model_wins_and_register_value_stays(self):
        scene = dict(turbines=[turbine('x', 'NM60-1000', hub=None, rotor=62)])
        filled = dims.apply(scene, self.pool)
        t = scene['turbines'][0]
        self.assertEqual((t['hub'], t['rotorMetres']), (71.0, 62))
        self.assertEqual(filled[0]['estimates'], {'hub': {'method': 'same-model-median', 'peers': 2}})

    def test_capacity_needs_three_peers(self):
        scene = dict(turbines=[turbine('x', None, 1000)])
        dims.apply(scene, self.pool)
        self.assertEqual(scene['turbines'][0]['dimensionEstimates']['hub']['method'], 'same-capacity-median')
        lonely = dict(turbines=[turbine('y', None, 3000)])
        self.assertEqual(dims.apply(lonely, self.pool), [])
        self.assertIsNone(lonely['turbines'][0]['hub'])

    def test_gap_stays_listed_with_estimate(self):
        gaps = {'gaps': [dict(kind='wind-field', unitId='x', field='nabenhoehe_m', status='research-required')]}
        dims.mark_gaps(gaps, [dict(unitId='x', hub=71.0, estimates={'hub': {'method': 'same-model-median', 'peers': 2}})])
        self.assertEqual(gaps['gaps'][0]['status'], 'estimated-from-comparable-turbines')
        self.assertEqual(len(gaps['gaps']), 1)


    def test_lod2_tower_beside_turbine_is_removed_but_sheds_stay(self):
        def box(id, x, z, size, height):
            h = size / 2
            ring = [[x-h, 0, z-h], [x+h, 0, z-h], [x+h, height, z+h], [x-h, height, z+h]]
            return dict(id=id, surfaces=[dict(points=ring)])
        scene = dict(turbines=[turbine('t', hub=70, rotor=60) | dict(x=0, z=0)],
                     buildings=[box('tower', 1, 0, 4, 68), box('station', 6, 0, 3, 2.5),
                                box('far-tower', 200, 0, 4, 68), box('barn', 5, 0, 30, 12)])
        removed = dims.remove_towers(scene)
        self.assertEqual([r['buildingId'] for r in removed], ['tower'])
        self.assertEqual([b['id'] for b in scene['buildings']], ['station', 'far-tower', 'barn'])


if __name__ == '__main__':
    unittest.main()
