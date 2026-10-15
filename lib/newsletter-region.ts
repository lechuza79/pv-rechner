import 'server-only';
import {aboRegion,aboRegionPath} from './abo-region';
import {ladeGemeindePaket} from './gemeinde-paket-server';
import {loadDistrictContent,loadRegionContent} from './district-monitor-server';
import {loadAssociationReference} from './verband-reference-server';
import {getRegionById,getChildren} from './atlas';
import {getMastrDataAsOf} from './mastr-data';
import {isDistrictMember} from './district-package';
import {regionDisplayName} from './atlas-format';
import {ortPhrase} from './atlas-orte';
import type {MonitorObservation} from './gemeinde-paket';
import type {SolarMonth} from './story-monthly-solar';

export type NewsletterRegion={regionId:string;name:string;kind:'gemeinde'|'landkreis'|'verband'|'bundesland'|'deutschland';month:string;sourceDate:string;pageUrl:string;videoUrl:string;stock:number;added:number;addedKwp:number;segments:{label:string;count:number}[];solar:SolarMonth};
export type NewsletterRegionResult={ready:true;data:NewsletterRegion}|{ready:false;reason:string};
type Source={sourceDate:string;observations:MonitorObservation[];solar?:SolarMonth};
const labels:Record<string,string>={gebaeude:'Gebäudeanlagen',steckersolar:'Balkonkraftwerke',freiflaeche:'Freiflächenanlagen',sonstige:'Sonstige Solaranlagen'};
/** Extract a closed month from one published edition. Never mix live totals into historic curves. */
export function newsletterMonth(source:Source,month:string){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Invalid month');
 const [year,m]=month.split('-').map(Number);
 const end=new Date(Date.UTC(year,m,0)).toISOString().slice(0,10),previous=new Date(Date.UTC(year,m-1,0)).toISOString().slice(0,10);
 const sep=source.observations.find(r=>r.end===end),aug=source.observations.find(r=>r.end===previous),solar=source.solar;
 if(source.sourceDate<=end||!sep||!aug||!solar||solar.sourceDate!==source.sourceDate||solar.month!==month)throw Error('Missing month or mismatched edition');
 const days=new Date(Date.UTC(year,m,0)).getUTCDate();
 if(solar.days.length!==days||solar.days.some((d,i)=>d.date!==`${month}-${String(i+1).padStart(2,'0')}`||d.mw.length!==24||d.mw.some(v=>!Number.isFinite(v)||v<0)||!Number.isFinite(d.mwh)||d.mwh<0))throw Error('Incomplete solar month');
 const energy=solar.days.reduce((sum,d)=>sum+d.mwh,0);
 if(!Number.isFinite(solar.totalMwh)||Math.abs(energy-solar.totalMwh)>Math.max(.0001,energy*1e-8)||!solar.days.some(d=>d.date===solar.peakDay))throw Error('Invalid solar total');
 const added=sep.solarCount-aug.solarCount,addedKwp=sep.solarKwp-aug.solarKwp;
 if(!Number.isInteger(added)||added<0||!Number.isFinite(addedKwp)||addedKwp<0||!Number.isInteger(sep.solarCount)||sep.solarCount<added)throw Error('Invalid monthly additions');
 const segments=Object.entries(labels).map(([key,label])=>({label,count:(sep.solarCounts[key]??0)-(aug.solarCounts[key]??0)}));
 if(segments.some(s=>!Number.isInteger(s.count)||s.count<0)||segments.reduce((n,s)=>n+s.count,0)!==added)throw Error('Incomplete segment counts');
 return {stock:sep.solarCount,added,addedKwp,segments:segments.filter(s=>s.count>0),solar};
}
/** All subscriber scopes use the same public package readers as their website. */
export async function loadNewsletterRegion(regionId:string,month:string):Promise<NewsletterRegionResult>{
 try {
  if(!/^(de|\d{2}|\d{5}|\d{8}|\d{9})$/.test(regionId))throw Error('Unsupported subscription scope');
  const [identity,p]=await Promise.all([aboRegion(regionId),aboRegionPath(regionId)]);
  if(!identity||!p)throw Error('Region is not published');
  let source:Source;let kind:NewsletterRegion['kind'];
  if(regionId.length===8){
   kind='gemeinde';const pkg=await ladeGemeindePaket(regionId);
   if(!pkg?.monitorHistory||!pkg.monitorPeriods)throw Error('Municipal month package unavailable');
   source={sourceDate:pkg.registerStand,observations:pkg.monitorHistory.observations,solar:pkg.monitorPeriods.monthly.find(m=>m.month===month)?.solar};
  }else{
   kind=regionId==='de'?'deutschland':regionId.length===2?'bundesland':regionId.length===9?'verband':'landkreis';
   let content;
   if(kind==='verband'){
    if(!identity.slug||!identity.districtId)throw Error('Association identity unavailable');
    const reference=await loadAssociationReference(identity.slug,identity.districtId);
    if(!reference||reference.overviewOnly)throw Error('Association energy package not published');
    content=await reference.content;
   }else{
    const region=await getRegionById(regionId);if(!region)throw Error('District identity unavailable');
    const [children,stand]=await Promise.all([getChildren(region),getMastrDataAsOf()]);
    if(!stand)throw Error('Register edition unavailable');
    content=kind==='landkreis'
      ? await loadDistrictContent(regionId,children.filter(c=>isDistrictMember(c,regionId)).map(c=>c.region_id),stand)
      : await loadRegionContent(regionId,children.map(c=>c.region_id),stand);
   }
   const monitor=content.monitor;
   if(content.prepared.state==='unavailable'||monitor.status!=='ready'||!monitor.energy)throw Error('Regional month package unavailable');
   if(content.prepared.editions.some(e=>e!==monitor.registerStand))throw Error('Mixed regional editions');
   source={sourceDate:monitor.registerStand,observations:monitor.history.observations,solar:monitor.energy.monthly.find(m=>m.month===month)?.solar};
  }
  const values=newsletterMonth(source,month),name=regionDisplayName(identity.name),pageUrl='https://solar-check.io'+p;
  const video=new URL(pageUrl);video.searchParams.set('chart',`solar-check-radial-${regionId}-Solarerzeugung im Tagesverlauf ${ortPhrase({name})}`);video.searchParams.set('period',month);video.searchParams.set('autoplay','on');
  return {ready:true,data:{regionId,name,kind,month,sourceDate:source.sourceDate,pageUrl,videoUrl:video.toString(),...values}};
 }catch(error){return {ready:false,reason:error instanceof Error?error.message:String(error)}}
}
