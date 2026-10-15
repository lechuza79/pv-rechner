import {landscapePlaces} from '../../../../lib/landscape-places';
import {loadLandscapeStops} from '../../../../lib/landscape-data.server';
export async function GET(request:Request){
 const query=new URL(request.url).searchParams,id=query.get('ags')??'';
 if(query.size!==1||!Object.hasOwn(landscapePlaces,id))return Response.json({error:'Unbekannter Ort.'},{status:400});
 try{return Response.json(await loadLandscapeStops(id),{headers:{'Cache-Control':'public, max-age=3600, stale-while-revalidate=86400'}});}
 catch{return Response.json({error:'Standorte sind gerade nicht verfügbar.'},{status:503});}
}
