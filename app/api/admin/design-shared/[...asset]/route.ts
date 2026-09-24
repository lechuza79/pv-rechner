import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {isAdminSession} from '../../../../../lib/admin-guard';

// Local prototypes use the same source as the homepage, never a second bundle.
const source=path.join(process.env.HOME??'', '.codex/.chatgpt-projects/g-p-68cb08f24e0c8191aa1050b084bc0b5e/output/solar-hero-handoff/shared-footer');
export const dynamic='force-dynamic';
export async function GET(_:Request,{params}:{params:Promise<{asset:string[]}>}){
 if(process.env.NODE_ENV!=='development'||!await isAdminSession())return new Response('Not found',{status:404});
 const asset=(await params).asset.join('/');
 const images=['house-neon.webp','balcony-modern-neon.webp','heatpump-modern-neon.webp','feed-in-neon.webp','aircon-neon.webp'];
 if(asset.startsWith('illustrations/') && images.includes(asset.slice('illustrations/'.length))){
  const bytes=await readFile(path.join(source,'../shared-nav',asset));
  return new Response(bytes,{headers:{'Content-Type':'image/webp','Cache-Control':'no-store'}});
 }
 if(!['logo-result.svg','nav.js','nav.css','footer.js','footer.css','trust-badges-v7/trust-art.js','trust-badges-v7/trust-badges.js'].includes(asset))return new Response('Not found',{status:404});
 const filename=(asset.startsWith('nav.')||asset==='logo-result.svg')?path.join(source,'../shared-nav',asset):path.join(source,asset);
 let body=await readFile(filename,'utf8');
 if(asset==='footer.js'){
  const signals=JSON.parse(await readFile(path.join(source,'trust-signals.json'),'utf8'));
  body=body.replace("import signals from './trust-signals.json';",'const signals='+JSON.stringify(signals)+';');
 }
 return new Response(body,{headers:{'Content-Type':asset.endsWith('.svg')?'image/svg+xml':asset.endsWith('.css')?'text/css':'text/javascript','Cache-Control':'no-store'}});
}
