"""Missing terrain is never assigned a fabricated height."""
import sys
from pathlib import Path
import unittest
import numpy as np
from affine import Affine
sys.path.insert(0,str(Path(__file__).parents[1]))
from landscape_terrain_quality import trim_uncovered_margin, mask_uncovered_outer_surface, assert_measured_points, clip_context_to_measured_surface, normalise_st_crs
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


ST_URL = 'https://www.lvermgeo.sachsen-anhalt.de/de/mod/4,1970,501/ajax/1/prepare/?items=575899&format=zip'


def st_tile(directory, crs, left=696000, top=5676000, size=400, step=5.0):
    import rasterio
    path = Path(directory)/'st-15084170-dgm-x.tif'
    with rasterio.open(path, 'w', driver='GTiff', width=size, height=size, count=1, dtype='float32',
                       transform=Affine(step, 0, left, 0, -step, top), crs=crs) as tile:
        tile.write(np.full((1, size, size), 100.0, dtype='float32'))
    return path


class SachsenAnhaltReferenceTests(unittest.TestCase):
    def test_tile_without_crs_on_named_grid_gets_utm32_as_metadata_only(self):
        import tempfile, rasterio
        with tempfile.TemporaryDirectory() as directory:
            path = st_tile(directory, None)
            vrt, correction = normalise_st_crs(path, ST_URL, 'dgm5_32_696_5674_2_st.tif')
            with rasterio.open(vrt) as fixed, rasterio.open(path) as original:
                self.assertEqual(fixed.crs.to_epsg(), 25832)
                self.assertEqual(fixed.transform, original.transform)
                self.assertTrue((fixed.read() == original.read()).all())
            self.assertIsNone(correction['originalCRS'])

    def test_tile_with_crs_is_untouched(self):
        import tempfile
        with tempfile.TemporaryDirectory() as directory:
            path = st_tile(directory, 'EPSG:25832')
            self.assertEqual(normalise_st_crs(path, ST_URL, 'dgm5_32_696_5674_2_st.tif'), (path, None))

    def test_name_must_match_the_tile_position(self):
        import tempfile
        with tempfile.TemporaryDirectory() as directory:
            path = st_tile(directory, None)
            with self.assertRaises(ValueError):normalise_st_crs(path, ST_URL, 'dgm5_32_698_5674_2_st.tif')
            with self.assertRaises(ValueError):normalise_st_crs(path, ST_URL, None)

    def test_off_grid_or_foreign_source_fails(self):
        import tempfile
        with tempfile.TemporaryDirectory() as directory:
            path = st_tile(directory, None, left=696500)
            with self.assertRaises(ValueError):normalise_st_crs(path, ST_URL, 'dgm5_32_696_5674_2_st.tif')
        with tempfile.TemporaryDirectory() as directory:
            path = st_tile(directory, None)
            with self.assertRaises(ValueError):normalise_st_crs(path, 'https://example.test/ajax/1/prepare/?items=1', 'dgm5_32_696_5674_2_st.tif')

if __name__=='__main__':unittest.main()
