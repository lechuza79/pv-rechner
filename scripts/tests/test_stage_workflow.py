"""Offline workflow gates: no downloads, model calls, or publication."""
import importlib.util
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('workflow', Path(__file__).resolve().parents[1]/'stage-workflow.py')
w = importlib.util.module_from_spec(spec)
spec.loader.exec_module(w)


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.place = '03458003'

    def inputs(self, place=None, kinds=('wind',)):
        place = place or self.place
        for name in ('inputs/national-register/wind.json','inputs/national-register/solar.json','inputs/DE_VG250.gpkg'):
            path = self.root/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text('{}')
        w.write(self.root/'prepared-inventory'/place/'inventory.json',dict(municipality=place,name='Test',units=[dict(kind=k) for k in kinds],gaps=[]))

    def scene(self):
        out = self.root/'scene';out.mkdir()
        w.write(out/'scene.json', dict(municipality=self.place, crs='ETRS89_UTM32',heightReference='DHHN2016_NH',
            terrain=dict(width=2,height=2,elevations=[1,2,3,4],groundBounds=[0,0,100,100]),
            buildings=[{'id':'building'}],turbines=[dict(id='unit',hub=80,rotor=60,ratedKw=2000)],
            stops=[dict(id='town',kind='town',x=10,z=10),dict(id='wind',kind='wind',x=50,z=50,unitIds=['unit'],capacityKw=2000)]))
        w.write(out/'register.json',dict(feature=dict(properties=dict(id=self.place)),turbines=[dict(mastr_nr='unit',nabenhoehe_m=80,rotor_m=60,brutto_kw=2000)]))
        w.write(out/'provenance.json',dict(buildingLicense='test',terrainLicense='test',sources=[{'url':'https://example.test'}]))
        w.write(out/'data-gaps.json',dict(gaps=[]))
        return out

    def change_scene(self, out, change):
        scene=w.read(out/'scene.json');change(scene);w.write(out/'scene.json',scene)

    def test_plan_supported_new_place_is_not_release(self):
        self.inputs();result=w.plan(self.root,self.place)
        self.assertTrue(result['preparationPossible']);self.assertFalse(result['stageReady'])
        self.assertEqual(result['adapter'],'niedersachsen-municipality')

    def test_unsupported_region_does_not_reuse_pilot(self):
        self.inputs('10041100');result=w.plan(self.root,'10041100')
        self.assertIsNone(result['adapter']);self.assertFalse(result['preparationPossible'])

    def test_missing_inventory_is_explicit_and_no_wind_is_a_gap_not_a_block(self):
        self.assertFalse(w.plan(self.root,self.place)['preparationPossible'])
        self.inputs(kinds=('solar',));self.assertTrue(w.plan(self.root,self.place)['preparationPossible'])

    def test_brandenburg_and_nrw_have_adapters_districts_do_not(self):
        for place,adapter in (('12061244','brandenburg-municipality'),('05166012','nordrhein-westfalen-municipality')):
            self.inputs(place);self.assertEqual(w.plan(self.root,place)['adapter'],adapter)
        self.inputs('12061');self.assertIsNone(w.plan(self.root,'12061')['adapter'])

    def test_wrong_inventory_is_not_silently_used(self):
        self.inputs();path=self.root/'prepared-inventory'/self.place/'inventory.json'
        data=w.read(path);data['municipality']='03458013';w.write(path,data)
        with self.assertRaises(ValueError):w.plan(self.root,self.place)

    def test_invalid_identifiers_cannot_escape_directories(self):
        for value in ('../03458','03458003;id','-0345803','1234','abcde'):
            with self.assertRaises(Exception):w.place_id(value)

    def test_checked_scene_never_claims_browser_or_release_acceptance(self):
        result=w.check(self.scene(),self.place)
        self.assertTrue(result['technicalChecksPassed']);self.assertFalse(result['stageReady'])
        self.assertIn('desktop-and-mobile-browser-review',result['pending'])
        self.assertTrue(result['gaps'])

    def test_turbine_dimension_and_duplicate_must_fail(self):
        out=self.scene();self.change_scene(out,lambda s:s['turbines'][0].update(hub=100))
        self.assertFalse(w.check(out,self.place)['technicalChecksPassed'])
        self.change_scene(out,lambda s:s['turbines'].append(dict(s['turbines'][0])))
        self.assertTrue(any('differ' in e for e in w.check(out,self.place)['errors']))

    def test_wind_capacity_must_equal_linked_register_units(self):
        out=self.scene();self.change_scene(out,lambda s:s['stops'][1].update(capacityKw=4000))
        self.assertTrue(any('capacity differs' in e for e in w.check(out,self.place)['errors']))

    def test_unknown_solar_power_is_gap_not_zero(self):
        out=self.scene();self.change_scene(out,lambda s:s['stops'].append(dict(id='solar',kind='solar',x=20,z=20,capacityKw=None)))
        result=w.check(out,self.place)
        self.assertTrue(result['technicalChecksPassed']);self.assertIn('Missing registered capacity: solar; no fabricated kW',result['gaps'])

    def test_missing_terrain_at_stop_even_with_outer_mask_fails(self):
        out=self.scene();self.change_scene(out,lambda s:s['terrain'].update(elevations=[None,2,3,4],coverage='explicit-outer-mask'))
        self.assertTrue(any('terrain at destination' in e for e in w.check(out,self.place)['errors']))

    def test_missing_sources_and_wrong_municipality_fail(self):
        out=self.scene();w.write(out/'provenance.json',{})
        self.change_scene(out,lambda s:s.update(municipality='03458013'))
        self.assertFalse(w.check(out,self.place)['technicalChecksPassed'])

    def test_existing_output_protected_before_worker_start(self):
        self.inputs();(self.root/'logs').mkdir();osm=self.root/'cached.pbf';osm.write_bytes(b'test')
        out=self.root/'candidates'/self.place/'public/geo/landscape-tours'/self.place
        out.mkdir(parents=True);(out/'scene.json').write_text('keep')
        with patch.object(w.subprocess,'run',side_effect=AssertionError('must not run')):
            with self.assertRaisesRegex(ValueError,'Existing candidate'):w.run(self.root,self.place,osm)
        self.assertEqual((out/'scene.json').read_text(),'keep')

    def test_worker_failure_is_recorded_and_retry_does_not_publish(self):
        self.inputs();(self.root/'logs').mkdir();osm=self.root/'cached.pbf';osm.write_bytes(b'test')
        with patch.object(w.subprocess,'run',side_effect=ValueError('download failed')):
            with self.assertRaises(ValueError):w.run(self.root,self.place,osm)
        result=w.read(self.root/'jobs/stages'/(self.place+'.json'))
        self.assertEqual(result['status'],'failed');self.assertFalse(result['stageReady'])
        self.assertFalse((self.root/'public').exists())


    def test_live_check_requires_exact_scene_and_real_current_profiles(self):
        out=self.scene();scene=w.read(out/'scene.json');now=datetime.now(timezone.utc)
        points=[dict(time=(now+timedelta(hours=h)).isoformat(),value=0) for h in (-1,1)]
        data=dict(solarPerKw=points,windPerKw=points,modelRun=now.isoformat(),windModelRun=now.isoformat(),conditions={'speedMs':0})
        urls=[]
        def fetch(url):
            urls.append(url)
            return scene if '/geo/' in url else {'data':data}
        result=w.verify_live(out,self.place,'https://example.test',fetch)
        self.assertTrue(result['liveDataChecksPassed']);self.assertFalse(result['stageReady'])
        self.assertTrue(any('tour=03458003&stop=wind' in url for url in urls))
        data['solarPerKw']=None
        self.assertFalse(w.verify_live(out,self.place,'https://example.test',fetch)['liveDataChecksPassed'])
        data['solarPerKw']=points;scene['name']='different deployed scene'
        self.assertFalse(w.verify_live(out,self.place,'https://example.test',fetch)['liveDataChecksPassed'])

    def test_live_check_rejects_stale_weather(self):
        out=self.scene();now=datetime.now(timezone.utc);points=[dict(time=(now+timedelta(hours=h)).isoformat(),value=1) for h in (-1,1)]
        data=dict(solarPerKw=points,windPerKw=points,modelRun=(now-timedelta(hours=13)).isoformat(),windModelRun=(now-timedelta(hours=13)).isoformat(),conditions={'speedMs':1})
        result=w.verify_live(out,self.place,'https://example.test',lambda url:w.read(out/'scene.json') if '/geo/' in url else {'data':data})
        self.assertFalse(result['liveDataChecksPassed'])
        self.assertTrue(all('stale' in error for error in result['errors']))


    def test_killed_or_reused_worker_is_not_reported_running(self):
        path=self.root/'jobs/stages'/(self.place+'.json')
        w.write(path,dict(status='running',pid=1234,processBirth='old',stageReady=False))
        with patch.object(w.os,'kill',side_effect=ProcessLookupError()):
            self.assertEqual(w.job_status(self.root,self.place)['status'],'interrupted')
        with patch.object(w.os,'kill'),patch.object(w,'process_birth',return_value='different'):
            self.assertEqual(w.job_status(self.root,self.place)['status'],'interrupted')
        with patch.object(w.os,'kill'),patch.object(w,'process_birth',return_value='old'):
            self.assertEqual(w.job_status(self.root,self.place)['status'],'running')


if __name__=='__main__':unittest.main()
