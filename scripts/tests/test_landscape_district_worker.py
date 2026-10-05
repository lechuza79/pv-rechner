"""Bounded geometry and technical-data tests; no network or preparation run."""
import importlib.util
from pathlib import Path
import unittest

from shapely.geometry import MultiPolygon, Polygon, box, mapping

spec=importlib.util.spec_from_file_location('district_worker',Path(__file__).parents[1]/'landscape-district-worker.py')
worker=importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


def unit(identifier='SEE000000000001',kind='wind',**values):
    return dict(id=identifier,kind=kind,status='active',lon=1,lat=1,capacityKw=1500,
                municipalityCode='registered-other-code',**values)


def member(identifier,geometry):
    return dict(type='Feature',geometry=mapping(geometry),properties=dict(id=identifier,name='Municipality'))


class DistrictWorkerTest(unittest.TestCase):
    def test_coordinate_membership_preserves_registry_identity_and_unknown_dimensions(self):
        stock=dict(kind='wind',status='complete',units=[unit(),dict(unit('outside'),lon=8)])
        rows=worker.district_units(stock,box(0,0,4,4),[member('03458014',box(0,0,2,2))])
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]['coordinateMunicipality'],'03458014')
        self.assertEqual(rows[0]['region_id'],'registered-other-code')
        self.assertIsNone(rows[0]['rotor_m'])
        self.assertIsNone(rows[0]['windpark'])

    def test_multiple_municipalities_are_not_guessed(self):
        stock=dict(kind='wind',status='complete',units=[unit()])
        with self.assertRaisesRegex(ValueError,'exactly one municipality'):
            worker.district_units(stock,box(0,0,4,4),[member('a',box(0,0,2,2)),member('b',box(0,0,3,3))])

    def test_inactive_unit_and_duplicate_snapshot_are_rejected(self):
        record=unit();record['status']='inactive'
        with self.assertRaisesRegex(ValueError,'active wind'):
            worker.district_units(dict(kind='wind',status='complete',units=[record]),box(0,0,4,4),[member('a',box(0,0,3,3))])
        with self.assertRaisesRegex(ValueError,'duplicate'):
            worker.district_units(dict(kind='wind',status='complete',units=[unit(),unit()]),box(0,0,4,4),[member('a',box(0,0,3,3))])

    def test_plant_preferred_to_generator_without_capacity_duplication(self):
        candidates=[dict(id='relation/1',geometry=box(0,0,3,3),tags={'power':'plant','plant:source':'solar'}),
                    dict(id='way/2',geometry=box(.5,.5,1.5,1.5),tags={'power':'generator','generator:source':'solar'})]
        features,leads=worker.solar_evidence(candidates,[unit(kind='solar')],box(-1,-1,5,5))
        self.assertFalse(leads)
        self.assertEqual(len(features),1)
        self.assertEqual(features[0]['properties']['id'],'relation/1')
        self.assertEqual(features[0]['properties']['registerUnits'][0]['capacityKw'],1500)

    def test_multipolygon_holes_retained_for_explicit_downstream_exclusion(self):
        geometry=MultiPolygon([Polygon([(0,0),(3,0),(3,3),(0,3)],holes=[[(2,2),(2.5,2),(2.5,2.5),(2,2.5)]]),box(4,0,5,1)])
        features,_=worker.solar_evidence([dict(id='relation/1',geometry=geometry,tags={'power':'plant'})],[unit(kind='solar')],box(-1,-1,6,6))
        self.assertEqual(features[0]['geometry']['type'],'MultiPolygon')
        self.assertEqual(len(features[0]['geometry']['coordinates'][0]),2)

    def test_ambiguous_plant_and_inactive_solar(self):
        candidates=[dict(id='way/'+str(i),geometry=box(0,0,2,2),tags={'power':'plant'}) for i in (1,2)]
        features,leads=worker.solar_evidence(candidates,[unit(kind='solar')],box(-1,-1,3,3))
        self.assertFalse(features)
        self.assertEqual(leads[0]['status'],'ambiguous')
        self.assertFalse(leads[0]['automaticAssignment'])
        record=unit(kind='solar');record['status']='inactive'
        with self.assertRaisesRegex(ValueError,'active solar'):
            worker.solar_evidence(candidates,[record],box(-1,-1,3,3))

    def test_building_windows_follow_shared_wind_stop_clusters(self):
        windows=worker.wind_destination_windows([(0,0),(1100,0),(2200,0),(6000,0)])
        self.assertCountEqual(windows,[(1100,0,350),(6000,0,350)])

    def test_official_bw_fallback_uses_bounded_metric_coverage(self):
        from urllib.parse import parse_qs,urlparse
        url=worker.bw_dgm_url(553,5502);query=parse_qs(urlparse(url).query)
        self.assertEqual(query['SUBSET'],['E(553000,554000)','N(5502000,5503000)'])
        self.assertEqual(query['COVERAGEID'],['EL.ElevationGridCoverage'])
        self.assertEqual(urlparse(url).netloc,'owsproxy.lgl-bw.de')

    def test_bavarian_one_km_terrain_two_km_buildings(self):
        jobs=worker.bavarian_tiles((560000,5512000,562000,5514000),[(561000,5513000,350)])
        terrain=[url for kind,url in jobs if kind=='dgm']
        buildings=[url for kind,url in jobs if kind=='lod']
        self.assertEqual(len(terrain),4)
        self.assertEqual(buildings,['https://download1.bayernwolke.de/a/lod2/citygml/560_5512.gml'])
        self.assertIn('https://download1.bayernwolke.de/a/dgm/dgm1/561_5513.tif',terrain)
        self.assertFalse([url for kind,url in worker.bavarian_tiles((560000,5512000,564000,5516000),[(561000,5513000,100)]) if kind=='lod' and url.endswith('562_5514.gml')])


if __name__=='__main__':unittest.main()
