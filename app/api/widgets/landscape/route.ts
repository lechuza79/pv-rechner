import {landscapeResourcePath} from '../../../../lib/landscape-resource';
import {loadLandscapeAsset} from '../../../../lib/landscape-data.server';
/** One public asset boundary for product heroes, standalone embeds and dashboards. */
export async function GET(request:Request){
 const query=new URL(request.url).searchParams;
 const asset=query.get('path')??'';
 if(query.size!==1||!landscapeResourcePath(asset))return Response.json({error:'Unbekannte Landschaft.'},{status:400});
 try{
  const data=await loadLandscapeAsset(asset);
  return Response.json(data,{headers:{'Cache-Control':'public, max-age=3600, stale-while-revalidate=86400'}});
 }catch{return Response.json({error:'Die Landschaftsdaten sind gerade nicht verfügbar.'},{status:503});}
}
