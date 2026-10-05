"""Tiny geometry fixtures only; no raw landscape processing or remote calls."""
import copy
import importlib.util
from pathlib import Path
import unittest
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from pyproj import Transformer
from shapely.geometry import box, mapping
from shapely.ops import transform

spec=importlib.util.spec_from_file_location('enrich',Path(__file__).resolve().parents[1]/'landscape-showcase-enrich.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)


class ShowcaseTests(unittest.TestCase):
 def setUp(self):
  east,north=Transformer.from_crs(4326,25832,always_xy=True).transform(7,49)
  self.scene={'origin':[east,north,200],'terrain':{'width':3,'height':3,'groundBounds':[-10000,-10000,10000,10000],'elevations':[200.1230010986328]*9},'solar':[],'stops':[],'turbines':[{'id':'wind-1','model':None}],'buildings':[{'surfaces':[{'points':[[0,1.234,0]]}]}]}
  self.register={'turbines':[{'mastr_nr':'wind-1','typ':None,'lat':49}]}
  self.cache={'units':[{'id':'solar-1','capacityKw':123.4,'lon':7,'lat':49}]}
  self.feature={'type':'Feature','geometry':{'type':'MultiPolygon','coordinates':[[[[6.999,48.999],[7.001,48.999],[7.001,49.001],[6.999,49.001],[6.999,48.999]]],[[[7.002,48.999],[7.004,48.999],[7.004,49.001],[7.002,49.001],[7.002,48.999]]]]},'properties':{'id':'relation/123','osmUrl':'https://www.openstreetmap.org/relation/123','power':'generator','registerUnits':[{'unitId':'solar-1','capacityKw':123.4,'lon':7,'lat':49,'outlineKind':'generator'}]}}
  self.evidence={'features':[self.feature]}
  self.boundary=box(6,48,8,50)
 def run_enrich(self,scene=None,feature=None,wind=None):
  return m.enrich(scene or self.scene,self.register,{'features':[feature or self.feature]},self.cache,self.boundary,wind or {'entries':[]})
 def test_multipolygon_single_power_and_idempotent(self):
  scene,register,report=self.run_enrich()
  self.assertEqual(len(scene['solar']),2);self.assertEqual(len(scene['stops']),1)
  self.assertEqual(scene['stops'][0]['capacityKw'],123.4)
  self.assertEqual(scene['stops'][0]['outlineKind'],'generator')
  self.assertEqual(scene['solar'][0]['sourceGeometry'],self.feature['geometry'])
  again,_,second=self.run_enrich(scene=scene)
  self.assertEqual(again,scene);self.assertEqual(second['linkedUnits'],1)
  self.assertEqual(report['terrainSampleCount'],9)
  self.assertLessEqual(report['terrainQuantizationMaxErrorMetres'],.0005)
  self.assertEqual(scene['buildings'],self.scene['buildings'])
 def test_hole_skips_whole_outline_with_source_geometry(self):
  feature=copy.deepcopy(self.feature)
  feature['geometry']['coordinates'][0].append([[6.9995,48.9995],[6.9997,48.9995],[6.9997,48.9997],[6.9995,48.9995]])
  scene,_,report=self.run_enrich(feature=feature)
  self.assertEqual(scene['solar'],[]);self.assertEqual(scene['stops'],[])
  self.assertIn('unsupported-interior-holes',report['skippedOutlines'][0]['reason'])
  self.assertEqual(report['skippedOutlines'][0]['geometry'],feature['geometry'])
 def test_source_cache_conflict_is_not_capacity_guess(self):
  feature=copy.deepcopy(self.feature);feature['properties']['registerUnits'][0]['capacityKw']=9999
  scene,_,report=self.run_enrich(feature=feature)
  self.assertEqual(scene['stops'],[])
  self.assertEqual(report['skippedOutlines'][0]['reason'],'register-cache-evidence-conflict')
 def test_existing_wind_evidence_applied_without_changing_source_expectations(self):
  wind={'entries':[{'unitId':'wind-1','field':'typ','value':'Documented model','expected':{'lat':49},'status':'verified','sourceUrl':'https://example.org/document'}]}
  scene,register,report=self.run_enrich(wind=wind)
  self.assertEqual(scene['turbines'][0]['model'],'Documented model')
  self.assertEqual(register['turbines'][0]['typ'],'Documented model')
  self.assertEqual(len(report['windEnrichments']),1)
 def test_existing_unrelated_footprint_retained(self):
  scene=copy.deepcopy(self.scene);scene['solar']=[{'id':'osm-way-999','ring':[]}]
  refreshed,_,_=self.run_enrich(scene=scene)
  self.assertIn('osm-way-999',[s['id'] for s in refreshed['solar']])

 def test_explicit_mask_survives_full_enrichment_without_zero_heights(self):
  scene=copy.deepcopy(self.scene);scene['terrain'].update(width=5,height=5,elevations=[200.1230010986328]*25,coverage='explicit-outer-mask');scene['terrain']['elevations'][0]=None;scene['turbines'][0].update(x=0,z=0)
  boundary=box(6.99,48.99,7.01,49.01);metric=Transformer.from_crs(4326,25832,always_xy=True).transform
  result,_,report=m.enrich(scene,self.register,self.evidence,self.cache,boundary,{'entries':[]},transform(metric,boundary))
  self.assertIsNone(result['terrain']['elevations'][0]);self.assertEqual(report['linkedUnits'],1)
  self.assertEqual(result['stops'][0]['capacityKw'],123.4)
  scene['terrain']['elevations'][12]=None
  with self.assertRaisesRegex(ValueError,'inside district'):
   m.enrich(scene,self.register,self.evidence,self.cache,boundary,{'entries':[]},transform(metric,boundary))

if __name__=='__main__':unittest.main()
