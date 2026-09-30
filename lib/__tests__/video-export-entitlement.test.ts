import {beforeEach,describe,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
const auth=vi.hoisted(()=>({isAdminSession:vi.fn()}));
const session=vi.hoisted(()=>({getUser:vi.fn()}));
vi.mock('../supabase-server-component',()=>({createClient:async()=>({auth:session})}));
const jobs=vi.hoisted(()=>({operatorCreate:vi.fn(),jobStatus:vi.fn()}));
vi.mock('../admin-guard',()=>auth);
vi.mock('../video-export-service',()=>jobs);
import {videoDirectAccess} from '../video-export-entitlement';
import {POST} from '../../app/api/video-export/betreiber/route';

beforeEach(()=>{vi.resetAllMocks();session.getUser.mockResolvedValue({data:{user:{email:'owner@example.org',email_confirmed_at:'2026-01-01'}}});});
describe('shared video permission',()=>{
  it('fails closed when the session cannot be verified',async()=>{
    auth.isAdminSession.mockRejectedValue(new Error('unavailable'));
    expect(await videoDirectAccess()).toBe(false);
  });
  it('never accepts an unverified delivery address',async()=>{
    auth.isAdminSession.mockResolvedValue(true);
    session.getUser.mockResolvedValue({data:{user:{email:'owner@example.org',email_confirmed_at:null}}});
    const response=await POST(new NextRequest('http://localhost/api/video-export/betreiber',{method:'POST',body:JSON.stringify({widget:'regional-race',ags:'06440',period:'current',email:'attacker@example.org'})}));
    expect(response.status).toBe(403);
    expect(jobs.operatorCreate).not.toHaveBeenCalled();
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
      const response=await POST(new NextRequest('http://localhost/api/video-export/betreiber',{method:'POST',body:JSON.stringify({...body,email:'attacker@example.org'})}));
      expect(response.status).toBe(202);
      expect(jobs.operatorCreate).toHaveBeenCalledWith(body, 'owner@example.org');
    });
  }
});
