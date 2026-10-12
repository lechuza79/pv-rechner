import {describe,it,expect,vi,beforeEach} from 'vitest';
vi.mock('server-only',()=>({}));
const mocks=vi.hoisted(()=>({admin:vi.fn(),save:vi.fn()}));
vi.mock('../admin-guard',()=>({isAdminSession:mocks.admin}));
vi.mock('../widget-dashboard-store.server',()=>({saveWidgetDashboard:mocks.save}));
import {POST} from '../../app/api/admin/widget-dashboards/route';
const body=JSON.stringify({version:1,sections:[{id:'test',title:'Test',root:{id:'widget',label:'Test',widgetId:'stromhandel'}}],sources:{widget:'/embed/stromhandel'}});
const request=(origin='http://localhost:4319',value=body)=>new Request('http://localhost:4319/api/admin/widget-dashboards',{method:'POST',headers:{origin},body:value});
beforeEach(()=>{vi.resetAllMocks();mocks.admin.mockResolvedValue(true);mocks.save.mockResolvedValue('saved-id');});
describe('dashboard write boundary',()=>{
 it('denies anonymous writes before touching storage',async()=>{mocks.admin.mockResolvedValue(false);expect((await POST(request())).status).toBe(401);expect(mocks.save).not.toHaveBeenCalled();});
 it('rejects cross-origin and malformed writes',async()=>{expect((await POST(request('https://example.com'))).status).toBe(403);expect((await POST(request(undefined,'invalid'))).status).toBe(400);expect(mocks.save).not.toHaveBeenCalled();});
 it('saves a validated admin selection and reports storage failure honestly',async()=>{expect((await POST(request())).status).toBe(200);expect(mocks.save).toHaveBeenCalledOnce();mocks.save.mockRejectedValue(new Error('offline'));expect((await POST(request())).status).toBe(503);});
});
