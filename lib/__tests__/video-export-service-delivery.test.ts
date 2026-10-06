import {beforeEach,expect,it,vi} from 'vitest';
const db=vi.hoisted(()=>({callVideoFn:vi.fn(),videoBackend:vi.fn(()=> 'supabase')}));
const wake=vi.hoisted(()=>({wakeVideoWorker:vi.fn()}));
vi.mock('../video-export-db',()=>db);
vi.mock('../video-export-wakeup',()=>wake);
vi.mock('../regional-race-server',()=>({loadRegionalRace:async()=>({region:{name:'Wetteraukreis'},stand:'test',rows:[],history:[]})}));
import {operatorCreate,confirmVideo} from '../video-export-service';
beforeEach(()=>{vi.resetAllMocks();db.videoBackend.mockReturnValue('supabase');vi.stubEnv('VIDEO_EXPORT_ENABLED','1');vi.stubEnv('VIDEO_EXPORT_SECRET','unit-test-only-secret');});
it('stores verified delivery with the same job before waking the worker',async()=>{
 db.callVideoFn.mockResolvedValue({result:'queued',job_id:'job'});
 await operatorCreate({widget:'regional-race',ags:'06440',period:'current'},'owner@example.org');
 expect(db.callVideoFn).toHaveBeenCalledWith('video_operator_create',expect.objectContaining({email:'owner@example.org',email_hash:expect.any(String),token_hash:expect.any(String)}));
 expect(wake.wakeVideoWorker).toHaveBeenCalledOnce();
});
it('does not wake a worker for rejected capacity',async()=>{
 db.callVideoFn.mockResolvedValue({result:'capacity_queue'});
 expect((await operatorCreate({widget:'regional-race',ags:'06440',period:'current'},'owner@example.org')).http).toBe(503);
 expect(wake.wakeVideoWorker).not.toHaveBeenCalled();
});
it('uses the same wakeup after public confirmation, never before confirmation',async()=>{
 db.callVideoFn.mockResolvedValue({result:'queued'});
 expect(await confirmVideo('a'.repeat(43))).toBe('queued');
 expect(wake.wakeVideoWorker).toHaveBeenCalledOnce();
});
