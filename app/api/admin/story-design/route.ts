import {NextResponse} from 'next/server';
import {isAdminSession} from '../../../../lib/admin-guard';
import {readStoryDesignSnapshot,writeStoryDesignSnapshot,type StoryDesignSnapshot} from '../../../../lib/story-design-store';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 if(!await isAdminSession())return NextResponse.json({error:'Nicht angemeldet'},{status:401});
 const id=new URL(request.url).searchParams.get('id');
 if(!id||! /^[a-f0-9]{64}$/.test(id))return NextResponse.json({error:'Ungültiger Entwurf'},{status:400});
 try{const snapshot=await readStoryDesignSnapshot(id);return snapshot?NextResponse.json(snapshot):NextResponse.json({error:'Entwurf nicht gefunden'},{status:404});}
 catch{return NextResponse.json({error:'Entwurf konnte nicht gelesen werden'},{status:500});}
}
export async function POST(request:Request){
 if(process.env.NODE_ENV==='production')return NextResponse.json({error:'Lokale Entwurfsablage'},{status:404});
 if(!await isAdminSession())return NextResponse.json({error:'Nicht angemeldet'},{status:401});
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Ungültige Herkunft'},{status:403});
 try{
  const text=await request.text();if(text.length>100000)return NextResponse.json({error:'Entwurf zu groß'},{status:413});
  const snapshot=JSON.parse(text) as StoryDesignSnapshot;
  const result=await writeStoryDesignSnapshot(snapshot);
  return NextResponse.json({id:result.id});
 }catch{return NextResponse.json({error:'Entwurf konnte nicht gesichert werden'},{status:400});}
}
