// Local-only preview adapter. No credentials, authentication changes, or production writes.
import http from 'node:http';
import {entschluesseltOderRoh} from '../../lib/uri-sicher';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
import {NextRequest} from 'next/server';
import {GET as weather} from './reference/app/api/atlas/solar-day/route';
import {prepareStories,prepareBaseStyles} from './stories';
import paths from './paths.cjs';
import {prepareCharts} from './prepare-charts';
async function start(){
const {repoRoot:root,localRoot:local,siteSourceRoot:siteRoot,storySourceRoot}=paths;
await mkdir(path.join(local,'build'),{recursive:true});
await build({entryPoints:[path.join(siteRoot,'lib/site-fuss.ts')],bundle:true,platform:'node',format:'esm',outfile:path.join(local,'build/site-fuss.mjs')});
const {siteFussHtml}=await import(pathToFileURL(path.join(local,'build/site-fuss.mjs')).href);
const footerHtml=siteFussHtml().replaceAll('<a href="/','<a href="https://solar-check.io/').replace('class="sc-footer-brand" href="/"','class="sc-footer-brand" href="https://solar-check.io/"');
await build({entryPoints:[path.join(siteRoot,'app/bundeslaender.svg/route.ts')],bundle:true,platform:'node',format:'esm',outfile:path.join(local,'build/states.mjs')});
const {GET:statesSvg}=await import(pathToFileURL(path.join(local,'build/states.mjs')).href);
prepareBaseStyles(storySourceRoot);
if(process.argv.includes('--prepare')){await prepareStories(storySourceRoot);prepareCharts(storySourceRoot);}
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
   base=path.join(root,'public',/^(?:nav(?:-content)?\.|header(?:-boot)?\.|logo-result\.svg$|illustrations\/)/.test(rel)?'shared-nav':'shared-footer');
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
const port=Number(process.env.PORT??4196);
if(process.argv.includes('--build-only'))return;
server.listen(port,'127.0.0.1',()=>console.log(`Municipality preview: http://localhost:${port}/atlas-design-preview/index.html?displayfont=montserrat-bold`));

}
start().catch(error=>{console.error(error);process.exitCode=1;});
