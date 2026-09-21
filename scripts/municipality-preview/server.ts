// Local-only preview adapter. No credentials, authentication changes, or production writes.
import http from 'node:http';
import {entschluesseltOderRoh} from '../../lib/uri-sicher';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
import {NextRequest} from 'next/server';
import {GET as weather} from './reference/app/api/atlas/solar-day/route';
import {prepareStories} from './stories';
import {prepareCharts} from './prepare-charts';
async function start(){
const root=process.cwd(), local=path.join(root,'scripts/municipality-preview');
const sharedRoot=process.env.SOLAR_SHARED_ROOT ?? '/Users/eule/.codex/.chatgpt-projects/g-p-68cb08f24e0c8191aa1050b084bc0b5e/output/solar-hero-handoff';
// Use the integrated site chrome, not the frozen design handoff.
const siteRoot=process.env.SOLAR_SITE_ROOT ?? '/Users/eule/projects/pv-rechner';
await build({entryPoints:[path.join(siteRoot,'lib/site-fuss.ts')],bundle:true,platform:'node',format:'esm',outfile:path.join(local,'build/site-fuss.mjs')});
const {siteFussHtml}=await import(pathToFileURL(path.join(local,'build/site-fuss.mjs')).href);
const footerHtml=siteFussHtml().replaceAll('<a href="/','<a href="https://solar-check.io/').replace('class="sc-footer-brand" href="/"','class="sc-footer-brand" href="https://solar-check.io/"');
await build({entryPoints:[path.join(siteRoot,'app/bundeslaender.svg/route.ts')],bundle:true,platform:'node',format:'esm',outfile:path.join(local,'build/states.mjs')});
const {GET:statesSvg}=await import(pathToFileURL(path.join(local,'build/states.mjs')).href);
const storySourceRoot=process.env.STORY_SOURCE_ROOT ?? '/Users/eule/projects/pv-rechner/.worktrees/codex-kommunen-templates';
// Copy artwork from the same source as the story components before serving them.
const storyArtwork=['feed-in-v4-back.svg','feed-in-v4-coins-cropped.svg','feed-in-v4-splashes.svg','pv-modules-mono-contained.svg','rank-balcony-modern.webp','rank-battery.webp','rank-house.webp'];
await mkdir(path.join(root,'public/brand'),{recursive:true});
await Promise.all(storyArtwork.map(name=>copyFile(path.join(storySourceRoot,'public/brand',name),path.join(root,'public/brand',name))));
await prepareStories(storySourceRoot);
prepareCharts(storySourceRoot);
const storyBuild=await build({alias:{'@solar-check/municipal-story-preview':path.join(local,'StorySwipePreview.tsx'),'@solar-check/story-source':storySourceRoot},metafile:true,entryPoints:[path.join(local,'client.tsx')],bundle:true,outfile:path.join(local,'build/client.js'),jsx:'automatic',external:['/fonts/*'],define:{'process.env.NODE_ENV':'"development"'}});
await writeFile(path.join(local,'build/story-sources.json'),JSON.stringify(storyBuild.metafile,null,2));
const mime:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{
 try{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  const url=new URL(req.url!,'http://127.0.0.1');
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(url.pathname==='/bundeslaender.svg'){const result=statesSvg();res.setHeader('Content-Type','image/svg+xml');res.end(await result.text());return;}
  if(url.pathname==='/api/atlas/solar-day'){
   const result=await weather(new NextRequest(url));res.writeHead(result.status,{'Content-Type':'application/json'});res.end(await result.text());return;
  }
  if(url.pathname==='/embed/story-preview'){
   res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Geschichten aus Höchberg</title><link rel="stylesheet" href="/preview-build/base.css"><link rel="stylesheet" href="/preview-build/client.css"><style>body{margin:0;background:transparent}*{box-sizing:border-box}</style><div id="root"></div><script src="/preview-build/client.js"></script></html>');return;
  }
  let base=path.join(root,'public'),rel=entschluesseltOderRoh(url.pathname).replace(/^\/+/, '');
  if(url.pathname.startsWith('/api/admin/design-shared/')){
   rel=url.pathname.slice('/api/admin/design-shared/'.length);
   base=path.join(siteRoot,'public',/^(?:nav(?:-content)?\.|header(?:-boot)?\.|logo-result\.svg$|illustrations\/)/.test(rel)?'shared-nav':'shared-footer');
  }else if(/^\/(shared-nav|shared-footer|dynamic-hero|homepage-study|geo)\//.test(url.pathname)){
   base=path.join(siteRoot,'public');
  }else if(url.pathname.startsWith('/atlas-design-preview/shared-person/') && !url.pathname.endsWith('/mount-atlas.js')){
   base=path.join(sharedRoot,'shared-person');rel=url.pathname.slice('/atlas-design-preview/shared-person/'.length);
  }else if(/^\/(illustrations-motion|illustrations-neon)\//.test(url.pathname)){
   const folder=url.pathname.split('/')[1];base=path.join(sharedRoot,folder);rel=url.pathname.slice(folder.length+2);
  }else if(url.pathname.startsWith('/preview-build/')){base=path.join(local,'build');rel=url.pathname.slice('/preview-build/'.length);}
  if(!rel){res.writeHead(302,{Location:'/atlas-design-preview/index.html?displayfont=montserrat-bold'});res.end();return;}
  const file=path.resolve(base,rel);if(!file.startsWith(base+path.sep))throw Error('Invalid path');
  let bytes=await readFile(file);
  if(url.pathname==='/atlas-design-preview/index.html'){
   bytes=Buffer.from(bytes.toString().replace('</body>',footerHtml+'</body>'));
  }
  res.setHeader('Content-Type',mime[path.extname(file)]??'application/octet-stream');res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(4196,'127.0.0.1',()=>console.log('Municipality preview: http://localhost:4196/atlas-design-preview/index.html?displayfont=montserrat-bold'));

}
start().catch(console.error);
