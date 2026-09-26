import {attachPreparedStories} from '../../../../lib/story-prepared-server';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {NextResponse} from 'next/server';
import {isAdminSession} from '../../../../lib/admin-guard';
import {loadRankingMonth} from '../../../../lib/story-ranking-month-server';
import {appendRankingMonth} from '../../../../lib/story-ranking-month';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 if(!await isAdminSession())return NextResponse.json({error:'Nicht angemeldet'},{status:401});
 const params=new URL(request.url).searchParams;
 if(params.get('coverage')==='1'){
  try{const root=join(process.cwd(),'scripts/.cache/story-prepared');const summary=JSON.parse(await readFile(join(root,'latest-run.json'),'utf8'));let resume;try{resume=JSON.parse(await readFile(join(root,'resume-state.json'),'utf8'));}catch{}return NextResponse.json({...summary,resumeAt:resume?.completedAt===summary.completedAt?resume?.resumeAt:undefined},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'Noch kein abgeschlossener Vorbereitungslauf.'},{status:404});}
 }
 const id=params.get('city');
 if(id==='all'){
  try{
   const root=join(process.cwd(),'scripts/.cache/story-discovery');
   const index=JSON.parse(await readFile(join(root,'index.json'),'utf8')) as {regionId:string;name:string}[];
   index.sort((a,b)=>a.name.localeCompare(b.name,'de')||a.regionId.localeCompare(b.regionId));
   const offset=Math.max(0,Number.parseInt(params.get('offset')??'0',10)||0);
   const rows=await Promise.all(index.slice(offset,offset+25).map(async city=>attachPreparedStories(JSON.parse(await readFile(join(root,city.regionId+'.json'),'utf8')))));
   return NextResponse.json({reports:rows,total:index.length,next:offset+25<index.length?offset+25:null},{headers:{'Cache-Control':'no-store'}});
  }catch{return NextResponse.json({error:'Ortsübergreifende Auswertung konnte nicht geladen werden.'},{status:500});}
 }

 if(id&&!/^\d{8}$/.test(id))return NextResponse.json({error:'Ungültige Stadt'},{status:400});
 try{const content=await readFile(join(process.cwd(),'scripts/.cache/story-discovery',id?`${id}.json`:'index.json'),'utf8');if(id){const report=await attachPreparedStories(JSON.parse(content));const ranking=await loadRankingMonth(id);if(ranking)appendRankingMonth(report,ranking.current,ranking.previous);return NextResponse.json(report,{headers:{'Cache-Control':'no-store'}});}return new NextResponse(content,{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}
 catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return NextResponse.json({error:'Für diese Stadt liegt noch kein lokaler Auswertungslauf vor.'},{status:404});return NextResponse.json({error:'Auswertung konnte nicht geladen werden.'},{status:500});}
}
