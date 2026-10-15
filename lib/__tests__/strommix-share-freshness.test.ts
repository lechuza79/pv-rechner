import {afterEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({handler:vi.fn(),stored:vi.fn(),record:vi.fn()}));
vi.mock('next/headers',()=>({headers:async()=>new Headers({'x-forwarded-for':'192.0.2.1'})}));
vi.mock('../../app/api/energy/generation/route',()=>({GET:mocks.handler}));
vi.mock('../energy-letzter-stand',()=>({ladeLetztenStandMitAbruf:mocks.stored}));
vi.mock('../page-content-state',()=>({recordPageContent:mocks.record}));
import {loadStrommixPage} from '../../app/(site)/strommix-deutschland/snapshot';
const observation=(ts:string)=>({country:'de',source:'Energy-Charts',license:'CC BY 4.0',data:[{ts,solar:40000,wind_onshore:10000,gas:50000}]});
afterEach(()=>vi.resetAllMocks());
describe('new share previews use the live generation reader',()=>{
 it('takes a newer observation and changes the image address when the data changes',async()=>{
  mocks.handler.mockResolvedValueOnce(Response.json(observation('2026-10-13T15:00:00Z')))
   .mockResolvedValueOnce(Response.json(observation('2026-10-13T15:15:00Z')));
  const first=await loadStrommixPage(true),second=await loadStrommixPage(true);
  expect(first.initialData?.data[0].ts).toBe('2026-10-13T15:00:00Z');
  expect(second.initialData?.data[0].ts).toBe('2026-10-13T15:15:00Z');
  const firstImage=first.jsonLd.primaryImageOfPage.url,secondImage=second.jsonLd.primaryImageOfPage.url;
  expect(secondImage).not.toBe(firstImage);
  expect(new URL(secondImage).searchParams.get('ts')).toBe(second.initialData?.data[0].ts);
  expect(mocks.stored).not.toHaveBeenCalled();
  expect(mocks.handler.mock.calls[0][0].headers.get('x-forwarded-for')).toBe('192.0.2.1');
 });
 it('marks the saved observation when the protected reader is unavailable',async()=>{
  mocks.handler.mockResolvedValue(new Response('',{status:503}));
  mocks.stored.mockResolvedValue({payload:observation('2026-10-12T15:00:00Z'),retrievedAt:'2026-10-12T16:00:00Z'});
  const page=await loadStrommixPage();
  expect(page.initialData?.stale).toBe(true);
  expect(new URL(page.jsonLd.primaryImageOfPage.url).searchParams.get('ts')).toBe('2026-10-12T15:00:00Z');
  expect(mocks.record).not.toHaveBeenCalled();
 });
});
