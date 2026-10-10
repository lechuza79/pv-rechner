import {scrollTemplate} from './scroll-template';
import {KOMMUNEN_TITLE} from '../../../lib/kommunen-seite';
/** Local-only preview. Shared shell and tokens come from this checkout. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, context } from 'esbuild';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { tokens, globalStyles } from '../../../lib/theme';
import { siteFussHtml } from '../../../lib/site-fuss';


const base = dirname(fileURLToPath(import.meta.url));
const root = resolve(base, '../../..');
const generated = resolve(base, `.generated-${process.argv[2] || 4382}`);
const widgetRoot=process.env.MUNICIPAL_WIDGET_SOURCE || root;
const widgetOrigin=process.env.MUNICIPAL_WIDGET_ORIGIN || 'http://127.0.0.1:4319';
const landscapeRoot=process.env.MUNICIPAL_LANDSCAPE_SOURCE || resolve(root,'../../wind-preview-recovery/pv-rechner');
async function start() {
process.loadEnvFile("/Users/eule/projects/pv-rechner/.env.local");
// Publish the JS/CSS pair together only after a successful build. Versioned
// requests keep an HTML response on the same pair during subsequent rebuilds.
const landscapeSnapshots=new Map<string,Map<string,Uint8Array>>();
let landscapeVersion='';
const landscapeContext=await context({write:false,entryPoints:[resolve(base,'landscape-client.tsx')],plugins:[{name:'publish-landscape',setup(b){b.onEnd(result=>{
 if(result.errors.length||!result.outputFiles?.length)return;
 const files=new Map(result.outputFiles.map(file=>['/'+file.path.split('/').pop(),file.contents]));
 const hash=createHash('sha256');for(const file of result.outputFiles)hash.update(file.contents);
 const version=hash.digest('hex').slice(0,16);
 landscapeSnapshots.set(version,files);landscapeVersion=version;
 console.log(`Landscape preview ready: ${version}`);
});}},{name:'host-navigation',setup(b){b.onResolve({filter:/shared-nav\/(nav-content\.js|nav\.js|nav\.css)$/},args=>({path:resolve(root,'public/shared-nav',args.path.split('/').pop()!)}));}}],bundle:true,platform:'browser',format:'esm',jsx:'automatic',loader:{'.module.css':'local-css'},alias:{'react':resolve(root,'node_modules/react'),'react-dom':resolve(root,'node_modules/react-dom'),'shared-landscape-hero':resolve(landscapeRoot,'components/landscape/LandscapeHero.tsx'),'shared-landscape-places':resolve(landscapeRoot,'lib/landscape-places.ts'),'shared-landscape-styles':resolve(landscapeRoot,'components/landkreis/wind-map.module.css')},external:['/fonts/*','/design/*'],define:{'process.env':'{}','process.env.NODE_ENV':'"production"'},outfile:resolve(generated,'landscape-client.js')});
await landscapeContext.rebuild();
await landscapeContext.watch();
await build({entryPoints:[resolve(base,'shared.tsx')],bundle:true,platform:'node',format:'cjs',packages:'external',external:['/fonts/*'],jsx:'automatic',loader:{'.css':'local-css'},plugins:[{name:'server-runtime',setup(b){b.onResolve({filter:/^server-only$/},()=>({path:'server-only',namespace:'server-runtime'}));b.onLoad({filter:/.*/,namespace:'server-runtime'},()=>({contents:'',loader:'js'}));}}],outfile:resolve(generated,'shared.cjs')});
await build({entryPoints:[resolve(base,'client.tsx')],bundle:true,platform:'browser',format:'esm',jsx:'automatic',alias:{'react':resolve(root,'node_modules/react'),'react-dom':resolve(root,'node_modules/react-dom')},plugins:[{name:'shared-widget-source',setup(b){b.onResolve({filter:/GemeindeWidgetGroup$/},()=>({path:resolve(widgetRoot,'components/gemeinde/GemeindeWidgetGroup.tsx')}));}}],external:['/design/*','/shared-nav/*','/homepage-study/*','/fonts/*','/brand/*'],define:{'process.env':'{}','process.env.NODE_ENV':'"production"'},outfile:resolve(generated,'municipal-client.js')});
const {ladeGemeindePaket,renderSharedParts, NEON_KOPF_INNEN, NEON_NAV_SKRIPT} = createRequire(import.meta.url)(resolve(generated,'shared.cjs'));
const port = Number(process.argv[2] || 4382);
const types: Record<string, string> = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.png':'image/png', '.webp':'image/webp', '.json':'application/json' };

const server=createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  try {
    // Reuse the reviewed local widget runtime while the shared work is unreleased.
    if(url.pathname.startsWith('/api/windraeder-vorschau/')){const upstream=await fetch(`http://localhost:3087${url.pathname}${url.search}`);res.writeHead(upstream.status,{'Content-Type':upstream.headers.get('content-type')||'application/json'}).end(Buffer.from(await upstream.arrayBuffer()));return;}
    if(url.pathname.startsWith('/geo/')){const asset=resolve(landscapeRoot,'public','.'+url.pathname);if(!asset.startsWith(resolve(landscapeRoot,'public/geo')+sep)){res.writeHead(400).end();return;}res.setHeader('Content-Type',types[extname(asset)]||'application/octet-stream');res.end(await readFile(asset));return;}
    if (url.pathname.startsWith('/embed/') || url.pathname.startsWith('/_next/')) {
      const headers:Record<string,string>={};
      for(const key of ['rsc','next-router-state-tree','next-router-prefetch','next-url','accept']){const value=req.headers[key];if(typeof value==='string')headers[key]=value;}
      const upstream=await fetch(`${widgetOrigin}${url.pathname}${url.search}`,{headers});
      res.writeHead(upstream.status,{'Content-Type':upstream.headers.get('content-type')||'application/octet-stream'}).end(Buffer.from(await upstream.arrayBuffer()));return;
    }
    if(url.pathname === '/landscape-client.css'||url.pathname === '/landscape-client.js'){
      const snapshot=landscapeSnapshots.get(url.searchParams.get('v')||landscapeVersion);
      const content=snapshot?.get(url.pathname);
      if(!content){res.writeHead(404).end('Preview build unavailable');return;}
      res.setHeader('Content-Type',types[extname(url.pathname)]);
      res.end(url.pathname.endsWith('.css')?'@scope (#municipal-landscape-hero) to (.site-header, .municipal-hero-place){'+Buffer.from(content).toString('utf8')+'}':content);return;
    }
    if (['/municipal-client.js','/municipal-client.css','/landscape-client.js','/landscape-client.css'].includes(url.pathname)) {res.setHeader('Content-Type',types[extname(url.pathname)]);res.end(await readFile(resolve(generated,url.pathname.slice(1))));return;}
    if (url.pathname === '/shared-components.css') {res.setHeader('Content-Type',types['.css']);res.end(await readFile(resolve(generated,'shared.css')));return;}
    // Authorized local read; credentials stay in this server process.
    if (url.pathname === '/api/kommunen/vorschau') {
      const ags=url.searchParams.get('ags')||'';
      if(!/^\d{8}$/.test(ags)){res.writeHead(400).end();return;}
      const p=await ladeGemeindePaket(ags);
      res.setHeader('Content-Type',types['.json']);
      res.writeHead(p?200:404).end(JSON.stringify(p?{ags:p.ags,name:p.name,stories:p.stories,widgetPlace:{ags:p.ags,name:p.name,districtId:p.kreis.ags,districtName:p.kreis.name,stateId:p.ags.slice(0,2),stateName:''}}:null));return;
    }
    // Contact styling must not override unrelated controls such as the place picker.
    if(url.pathname === '/shared-person/person-box.css'){
      const css=await readFile(resolve(root,'public/shared-person/person-box.css'),'utf8');
      res.setHeader('Content-Type',types['.css']);res.end('@scope (.homepage-study:has(> .hs-person-section)){'+css+'}');return;
    }
    if(url.pathname === '/landscape-shell.css'){
      const files=['gemeinde/basis.css','hero-system/hero.css'];
      const css=await Promise.all(files.map(file=>readFile(resolve(landscapeRoot,'public',file),'utf8')));
      res.setHeader('Content-Type',types['.css']);res.end('@scope (#municipal-landscape-hero) to (.site-header, .municipal-hero-place){'+css.join('\n')+'}');return;
    }
    if (url.pathname === '/theme.css') {
      res.setHeader('Content-Type', types['.css']);
      res.end(':root{' + Object.entries(tokens).map(([k,v]) => `${k}:${v};`).join('') + '}' + globalStyles); return;
    }
    if (['/kommunen.html','/kommunen-scroll.html','/fuer-organisationen/kommunen'].includes(url.pathname)) {
      let template = await readFile(resolve(base, 'kommunen.html'), 'utf8');
      if(url.pathname !== '/kommunen.html') template=scrollTemplate(template);
      const html = renderSharedParts(template).replace(/<title>[\s\S]*?<\/title>/,`<title>${KOMMUNEN_TITLE.replaceAll('&','&amp;')}</title>`)
        .replace('<!-- SHARED_HEADER -->', `<header class="site-header">${NEON_KOPF_INNEN}</header>`)
        .replace('<!-- SHARED_FOOTER -->', siteFussHtml())
        .replace('<!-- SHARED_NAV -->', `<script type="module">${NEON_NAV_SKRIPT}</script>`);
      res.setHeader('Content-Type', types['.html']); res.end(html.replace(/(landscape-client\.(?:js|css))(?=["'])/g,`$1?v=${landscapeVersion}`)); return;
    }
    // The public search remains real; no local submit endpoint or fake results.
    if (['/api/suche', '/api/suche/orte', '/api/atlas/search'].includes(url.pathname)) {
      const upstream = await fetch(`https://solar-check.io${url.pathname}${url.search}`);
      res.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') || 'application/json' });
      res.end(Buffer.from(await upstream.arrayBuffer())); return;
    }
    // Widget data requests use the same development runtime as their documents.
    if(url.pathname.startsWith('/api/')){
      const upstream=await fetch(`${widgetOrigin}${url.pathname}${url.search}`);
      res.writeHead(upstream.status,{'Content-Type':upstream.headers.get('content-type')||'application/json'}).end(Buffer.from(await upstream.arrayBuffer()));return;
    }
    const publicRoot = resolve(root, 'public');
    const asset = url.pathname === '/kommunen.css' ? resolve(base, 'kommunen.css') : resolve(publicRoot, '.' + decodeURIComponent(url.pathname));
    if (asset === resolve(base, 'kommunen.css') || asset.startsWith(publicRoot + sep)) {
      if (await stat(asset).then(s => s.isFile()).catch(() => false)) {
        res.setHeader('Content-Type', types[extname(asset)] || 'application/octet-stream');
        res.end(await readFile(asset)); return;
      }
    }
    // Shared navigation goes to the existing public pages; never a dummy page.
    if (!extname(url.pathname) || url.pathname === '/bundeslaender.svg') {
      res.writeHead(302, { Location: `https://solar-check.io${url.pathname}${url.search}` }).end(); return;
    }
    res.writeHead(404).end('Not found');
  } catch (error) { console.error(error); res.writeHead(500).end('Preview error'); }
}).listen(port, '127.0.0.1', () => console.log(`Municipal preview: http://127.0.0.1:${port}/kommunen.html`));

const stop=async()=>{server.close();server.closeAllConnections();await landscapeContext.dispose();};
process.once('SIGINT',stop);process.once('SIGTERM',stop);
}
start().catch(error => {console.error(error);process.exitCode=1;});
