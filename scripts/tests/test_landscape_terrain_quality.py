"""Missing terrain is never assigned a fabricated height."""
import sys
from pathlib import Path
import unittest
import numpy as np
from affine import Affine
sys.path.insert(0,str(Path(__file__).parents[1]))
from landscape_terrain_quality import trim_uncovered_margin, mask_uncovered_outer_surface, assert_measured_points, clip_context_to_measured_surface
from shapely.geometry import box

class TerrainQualityTest(unittest.TestCase):
    def test_empty_corner_trim_preserves_every_retained_height(self):
        values=np.arange(100,dtype=float).reshape(10,10);values[:2,-2:]=-9999
        data,affine,report=trim_uncovered_margin(values,Affine(20,0,0,0,-20,200),-9999,(10,10,190,140))
        np.testing.assert_array_equal(data,values[2:])
        self.assertEqual(affine*(.5,.5),(10,150))
        self.assertEqual(report['missingSamples'],4)

    def test_missing_required_corner_cannot_be_trimmed(self):
        values=np.ones((10,10));values[:2,-2:]=-9999
        with self.assertRaisesRegex(ValueError,'cannot be trimmed'):
            trim_uncovered_margin(values,Affine(20,0,0,0,-20,200),-9999,(10,10,190,190))

    def test_interior_gap_remains_failure(self):
        values=np.ones((10,10));values[5,5]=np.nan
        with self.assertRaises(ValueError):
            trim_uncovered_margin(values,Affine(20,0,0,0,-20,200),-9999,(10,10,190,190))

    def test_complete_raster_unchanged(self):
        values=np.arange(100).reshape(10,10);affine=Affine(20,0,0,0,-20,200)
        data,actual,report=trim_uncovered_margin(values,affine,-9999,(10,10,190,190))
        self.assertIs(data,values);self.assertEqual(actual,affine);self.assertIsNone(report)

    def test_mask_retains_unknown_values_and_all_measured_samples(self):
        values=np.arange(100,dtype=float).reshape(10,10);values[0,0]=-9999
        result,report=mask_uncovered_outer_surface(values,Affine(20,0,0,0,-20,200),-9999,box(40,0,200,160))
        self.assertTrue(np.isnan(result[0,0]));np.testing.assert_array_equal(result[1:],values[1:])
        self.assertEqual(report['missingSamples'],1)
        assert_measured_points(result,Affine(20,0,0,0,-20,200),[(100,100)])
        with self.assertRaisesRegex(ValueError,'missing terrain'):
            assert_measured_points(result,Affine(20,0,0,0,-20,200),[(20,180)])

    def test_gap_inside_district_or_flight_surface_always_fails(self):
        values=np.ones((10,10));values[4,4]=-9999
        with self.assertRaisesRegex(ValueError,'inside district'):
            mask_uncovered_outer_surface(values,Affine(20,0,0,0,-20,200),-9999,box(40,40,160,160))

    def test_water_context_is_clipped_to_measured_district_without_height_fallback(self):
        scene={'origin':[0,0,0],'terrain':{'width':5,'height':5,'groundBounds':[0,0,4,4],'elevations':[10.0]*25},'context':{'streams':[[[0,2],[2,2],[4,2]]],'areas':[]}}
        scene['terrain']['elevations'][0]=None
        context,report=clip_context_to_measured_surface(scene,box(1,-3,3,-1))
        self.assertEqual(context['streams'],[[[1.0,2.0],[2.0,2.0],[3.0,2.0]]])
        self.assertEqual(report['omittedUnmeasuredComponents'],0)
        self.assertIsNone(scene['terrain']['elevations'][0])

if __name__=='__main__':unittest.main()
