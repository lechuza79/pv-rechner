import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {NextResponse} from 'next/server';
import {isAdminSession} from '../../../../lib/admin-guard';
import {attachPreparedStories} from '../../../../lib/story-prepared-server';
import {municipalChartsFromReport} from '../../../../lib/municipal-chart-catalog';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 if(!await isAdminSession())return NextResponse.json({error:'Nicht angemeldet'},{status:401});
 const city=new URL(request.url).searchParams.get('city');
 if(!city||!/^\d{8}$/.test(city))return NextResponse.json({error:'Bitte einen Ort wählen.'},{status:400});
 try{
  const report=await attachPreparedStories(JSON.parse(await readFile(join(process.cwd(),'scripts/.cache/story-discovery',city+'.json'),'utf8')));
  return NextResponse.json(municipalChartsFromReport(report),{headers:{'Cache-Control':'no-store'}});
 }catch(error){return NextResponse.json({error:'Die örtlichen Chartdaten sind derzeit nicht verfügbar.'},{status:(error as NodeJS.ErrnoException).code==='ENOENT'?404:500});}
}
