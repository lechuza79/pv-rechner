import {describe,it,expect,vi,beforeEach} from 'vitest';
import {NextRequest} from 'next/server';
vi.mock('../abo-lauf',()=>({aboLauf:vi.fn()}));
vi.mock('../gemeinde-abo',()=>({empfaengerFuerOrt:vi.fn(),orteMitAbos:vi.fn()}));
vi.mock('../newsletter-region',()=>({loadNewsletterRegion:vi.fn()}));
import {empfaengerFuerOrt} from '../gemeinde-abo';
import {loadNewsletterRegion} from '../newsletter-region';
import {POST} from '../../app/api/abo/versenden/route';
const body={aktion:'vorbereiten',id:'confirmed',regionId:'03151017',month:'2026-09'};
const request=(auth=true)=>new NextRequest('https://solar-check.io/api/abo/versenden',{method:'POST',headers:{'content-type':'application/json',...(auth?{authorization:'Bearer operator-test'}:{})},body:JSON.stringify(body)});
beforeEach(()=>{vi.resetAllMocks();process.env.CRON_SECRET='operator-test';process.env.ABO_HMAC_SECRET='test-secret-at-least-sixteen';process.env.NEXT_PUBLIC_BASE_URL='https://solar-check.io';vi.mocked(empfaengerFuerOrt).mockResolvedValue([{id:'confirmed',quelle:'gemeinde'}] as any);vi.mocked(loadNewsletterRegion).mockResolvedValue({ready:true,data:{regionId:'03151017',month:'2026-09'} as any});});
describe('newsletter preparation route',()=>{
 it('rejects unauthenticated callers before looking up subscriptions',async()=>{expect((await POST(request(false))).status).toBe(401);expect(empfaengerFuerOrt).not.toHaveBeenCalled();});
 it('only creates signed links for a confirmed subscription',async()=>{vi.mocked(empfaengerFuerOrt).mockResolvedValue([]);expect((await POST(request())).status).toBe(404);});
 it('holds missing regional data without exposing the signing key',async()=>{vi.mocked(loadNewsletterRegion).mockResolvedValue({ready:false,reason:'Missing month'});expect((await POST(request())).status).toBe(422);});
 it('returns matching data and signed links without cache or secrets',async()=>{const r=await POST(request()),data=await r.json();expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('no-store');expect(data.region.month).toBe(body.month);expect(data.abmeldeUrl).toContain('confirmed.unsub.');expect(data.einstellungenUrl).toContain('confirmed.prefs.');expect(JSON.stringify(data)).not.toContain(process.env.ABO_HMAC_SECRET);});
});
