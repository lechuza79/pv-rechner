import {NextRequest} from 'next/server';
import {afterEach,expect,it,vi} from 'vitest';
vi.mock('../atlas',()=>({getRegionById:vi.fn(async()=>null),atlasPathForRegionId:vi.fn(async()=>'/solar-atlas/rheinland-pfalz/landkreis-kaiserslautern')}));
vi.mock('../verband-reference-server',()=>({readAssociationReference:vi.fn(async(slug:string)=>slug==='weilerbach'?{id:'073355009',name:'Verbandsgemeinde Weilerbach',slug,districtId:'07335'}:null)}));
vi.mock('../gemeinde-abo',()=>({
 normalisiereEmail:(email:string)=>email.trim().toLowerCase(),siehtNachEmailAus:()=>true,
 aboAnlegen:vi.fn(async()=>({art:'angelegt',abo:{id:'test-subscription'}})),versandBelegSetzen:vi.fn(),
}));
vi.mock('../abo-token',()=>({bestaetigungsToken:()=> 'test-token',einstellungenLink:()=> 'http://localhost/abo/einstellungen'}));
vi.mock('../abo-versand',()=>({sendeAboMail:vi.fn(async()=>({ok:true}))}));
import {aboRegion,aboRegionPath} from '../abo-region';
import {aboAnlegen} from '../gemeinde-abo';
import {sendeAboMail} from '../abo-versand';
import {POST} from '../../app/api/abo/anmelden/route';
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
it('collects the association identity through the existing confirmation flow without scheduling updates',async()=>{
 vi.stubEnv('NEXT_PUBLIC_BASE_URL','http://localhost');
 const response=await POST(new NextRequest('http://localhost/api/abo/anmelden',{method:'POST',headers:{'x-real-ip':'association-test'},body:JSON.stringify({ags:'073355009',email:'test@example.org'})}));
 expect(response.status).toBe(200);
 expect(aboAnlegen).toHaveBeenCalledWith(expect.objectContaining({regionId:'073355009',email:'test@example.org'}));
 expect(sendeAboMail).toHaveBeenCalledWith(expect.objectContaining({subject:expect.stringContaining('Verbandsgemeinde Weilerbach'),art:'bestaetigung'}));
 expect(await aboRegionPath('073355009')).toBe('/solar-atlas/rheinland-pfalz/landkreis-kaiserslautern/verbandsgemeinden/weilerbach');
});
it('rejects an invented association before saving or sending',async()=>{
 vi.stubEnv('NEXT_PUBLIC_BASE_URL','http://localhost');
 expect(await aboRegion('073359999')).toBeNull();
 const response=await POST(new NextRequest('http://localhost/api/abo/anmelden',{method:'POST',headers:{'x-real-ip':'unknown-association-test'},body:JSON.stringify({ags:'073359999',email:'test@example.org'})}));
 expect(response.status).toBe(400);
 expect(aboAnlegen).not.toHaveBeenCalled();
 expect(sendeAboMail).not.toHaveBeenCalled();
});
