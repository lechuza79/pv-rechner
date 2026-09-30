import {beforeEach,describe,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
const auth=vi.hoisted(()=>({isAdminSession:vi.fn()}));
const jobs=vi.hoisted(()=>({operatorCreate:vi.fn(),jobStatus:vi.fn()}));
vi.mock('../admin-guard',()=>auth);
vi.mock('../video-export-service',()=>jobs);
import {videoDirectAccess} from '../video-export-entitlement';
import {POST} from '../../app/api/video-export/betreiber/route';

beforeEach(()=>vi.resetAllMocks());
describe('shared video permission',()=>{
  it('fails closed when the session cannot be verified',async()=>{
    auth.isAdminSession.mockRejectedValue(new Error('unavailable'));
    expect(await videoDirectAccess()).toBe(false);
  });
  for(const widget of ['gemeinde-solar-monat','regional-race']) {
    const body={widget,ags:widget==='regional-race'?'06440':'06440016',period:widget==='regional-race'?'current':'2026-08'};
    it(`rejects direct ${widget} requests without entitlement`,async()=>{
      auth.isAdminSession.mockResolvedValue(false);
      const response=await POST(new NextRequest('http://localhost/api/video-export/betreiber',{method:'POST',body:JSON.stringify(body)}));
      expect(response.status).toBe(403);
      expect(jobs.operatorCreate).not.toHaveBeenCalled();
    });
    it(`starts ${widget} on the same queue for the entitled operator`,async()=>{
      auth.isAdminSession.mockResolvedValue(true);
      jobs.operatorCreate.mockResolvedValue({http:202,jobId:'test-job',status:'queued'});
      const response=await POST(new NextRequest('http://localhost/api/video-export/betreiber',{method:'POST',body:JSON.stringify(body)}));
      expect(response.status).toBe(202);
      expect(jobs.operatorCreate).toHaveBeenCalledWith(body);
    });
  }
});
