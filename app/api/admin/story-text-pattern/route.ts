// Local development only: cache files are not a hosted persistence backend.
import {isLocalStoryDesignEnvironment} from '../../../../lib/story-design-local';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,readdir,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {NextResponse} from 'next/server';
import {isAdminSession} from '../../../../lib/admin-guard';
import {pruefeVorlage} from '../../../../lib/social-vorlage';
const root=()=>join(process.cwd(),'scripts/.cache/story-text-patterns');
export const dynamic='force-dynamic';
export async function GET(){
 if(!isLocalStoryDesignEnvironment())return NextResponse.json({error:'Lokale Entwicklung'},{status:404});
 if(!await isAdminSession())return NextResponse.json({error:'Nicht angemeldet'},{status:401});
 try{const files=await readdir(root());const entries=await Promise.all(files.filter(f=>/^[a-f0-9]{64}\.json$/.test(f)).map(async f=>JSON.parse(await readFile(join(root(),f),'utf8'))));return NextResponse.json(Object.fromEntries(entries.map(e=>[e.family,e.template])));}
 catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return NextResponse.json({});return NextResponse.json({error:'Vorlagen konnten nicht geladen werden'},{status:500});}
}
export async function POST(request:Request){
 if(!isLocalStoryDesignEnvironment())return NextResponse.json({error:'Lokale Entwicklung'},{status:404});
 if(!await isAdminSession())return NextResponse.json({error:'Nicht angemeldet'},{status:401});
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Ungültige Herkunft'},{status:403});
 try{const body=await request.json();if(typeof body.family!=='string'||!body.family||body.family.length>200||typeof body.template!=='string'||body.template.length>10000)throw new Error();
 const check=pruefeVorlage(body.template,{ort:'',titel:'',werte:'',vergleich:'',einordnung:'',quelle:''});
 if(check.unbekannt.length||['vergleich','quelle','einordnung'].some(key=>check.ungenutzt.includes(key)))return NextResponse.json({error:'Vergleich, Einordnung und Quelle müssen erhalten bleiben; nur bekannte Platzhalter verwenden.'},{status:400});
 await mkdir(root(),{recursive:true});const file=createHash('sha256').update(body.family).digest('hex')+'.json';const temp=join(root(),'.'+randomUUID()+'.tmp');await writeFile(temp,JSON.stringify({family:body.family,template:body.template}));await rename(temp,join(root(),file));return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:'Vorlage konnte nicht gespeichert werden'},{status:400});}
}
