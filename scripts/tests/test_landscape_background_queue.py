import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace
import json
s=importlib.util.spec_from_file_location('queue_worker',Path(__file__).resolve().parents[1]/'landscape-background-queue.py')
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)

class QueueTests(unittest.TestCase):
 def test_coordinate_ownership_and_boundary_ambiguity(self):
  from shapely.geometry import box
  from shapely.strtree import STRtree
  gs=[box(0,0,1,1),box(1,0,2,1)];ids=['11111111','22222222'];tree=STRtree(gs)
  self.assertEqual(m.classify({'lon':.5,'lat':.5,'municipalityCode':'22222222'},tree,gs,ids,lambda x,y:(x,y))[0],'11111111')
  self.assertEqual(m.classify({'lon':1,'lat':.5},tree,gs,ids,lambda x,y:(x,y))[1],'ambiguous-boundary')
  self.assertEqual(m.classify({'lon':None,'lat':.5},tree,gs,ids,lambda x,y:(x,y))[1],'missing-or-invalid-coordinate')
 def payload(self):return {'municipality':'11111111','name':'Test','units':[],'registerLeads':[]}
 def job(self,db,state='pending'):
  db.execute('INSERT INTO jobs(id,payload,status,updated_at) VALUES(?,?,?,?)',('11111111',json.dumps(self.payload()),state,m.now()));db.commit()
 def test_interrupted_job_resumes_without_claiming_scene_ready(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);db=m.connect(root);self.job(db,'processing');m.run_batch(root,db,1)
   self.assertEqual(db.execute('select status from jobs').fetchone()[0],'needs-geometry')
   out=json.loads((root/'prepared-inventory/11111111/inventory.json').read_text());self.assertFalse(out['stageReady'])
 def test_failures_stop_after_three_attempts_and_preserve_previous_file(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);db=m.connect(root);self.job(db);out=root/'prepared-inventory/11111111/inventory.json';m.atomic_json(out,{'previous':True})
   with patch.object(m,'prepare',side_effect=ValueError('invalid input')):
    for _ in range(4):m.run_batch(root,db,1)
   self.assertEqual(db.execute('select status,attempts from jobs').fetchone(),('failed',3));self.assertTrue(json.loads(out.read_text())['previous'])
 def test_low_disk_does_not_consume_job(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);db=m.connect(root);self.job(db)
   with patch.object(m.shutil,'disk_usage',return_value=SimpleNamespace(free=0)):
    with self.assertRaises(RuntimeError):m.run_batch(root,db,1)
   self.assertEqual(db.execute('select status,attempts from jobs').fetchone(),('pending',0))
if __name__=='__main__':unittest.main()
