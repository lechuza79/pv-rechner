import {NextRequest} from 'next/server';
import {afterEach,expect,it,vi} from 'vitest';
vi.mock('../atlas',()=>({getRegionById:vi.fn(async()=>null)}));
import {getRegionById} from '../atlas';
afterEach(()=>vi.unstubAllEnvs());
import {POST} from '../../app/api/abo/anmelden/route';

it.each(['15','de','09679','09679170'])('validates region %s against the register before any subscription is created',async(ags)=>{
  vi.stubEnv('NEXT_PUBLIC_BASE_URL','http://localhost');
  const response=await POST(new NextRequest('http://localhost/api/abo/anmelden',{
    method:'POST',headers:{'content-type':'application/json','x-real-ip':`test-${ags}`},
    body:JSON.stringify({ags,email:'test@example.org'}),
  }));
  expect(getRegionById).toHaveBeenCalledWith(ags);
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({error:'Diesen Ort kennen wir nicht.'});
});
