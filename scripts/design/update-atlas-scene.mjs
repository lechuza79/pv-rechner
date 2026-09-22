// Adapt the reviewed homepage scene without changing the homepage source.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
const source='/Users/eule/.codex/.chatgpt-projects/g-p-68cb08f24e0c8191aa1050b084bc0b5e/output/solar-hero-handoff/dynamic-hero';
const require=createRequire(source+'/package.json');
const {build}=require('esbuild');
const out=path.resolve('public/atlas-design-preview/dynamic-hero');
let entry=await readFile(source+'/test.js','utf8');
entry=entry.replace(/^import .*mountGlobalNav.*\n/m,'').replace(/^import .*mountHomepage.*\n/m,'');
entry=entry.split('\n').filter(line=>!line.trim().startsWith('mountGlobalNav(')&&!line.includes("has('homepage'))mountHomepage")).join('\n');
entry=entry.replace("value=\"79098\"",'value="97204"').replace("name:'Freiburg',plz:'79098',lat:47.9959,lon:7.85222", "name:'Höchberg',plz:'97204',lat:49.7867,lon:9.8819");
entry=entry.replace("const response=await fetch('/scene-data?plz='+plz,{signal:controller.signal});if(!response.ok)throw new Error('Postleitzahl oder Datenquelle nicht verfügbar');const data=await response.json();", "const data=plz==='97204'?await window.atlasWeather.load():await fetch('/api/atlas/solar-day?plz='+plz,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('Weather unavailable');return r.json();});");
const tree=path.join(source,'node_modules/@dgreenheck/ez-tree/src/lib');
await build({stdin:{contents:entry,resolveDir:source,sourcefile:'atlas-scene.js'},bundle:true,minify:true,format:'esm',splitting:true,outdir:out+'/dist',entryNames:'scene',chunkNames:'[name]-[hash]',plugins:[{name:'tree-textures',setup(b){b.onResolve({filter:/^\.\/textures$/},()=>({path:'minimal',namespace:'slim'}));b.onLoad({filter:/.*/,namespace:'slim'},async()=>({contents:`import * as THREE from 'three';const leaf=new THREE.TextureLoader().load('data:image/png;base64,${(await readFile(tree+'/assets/leaves/ash_color.png')).toString('base64')}');leaf.colorSpace=THREE.SRGBColorSpace;export const getLeafTexture=()=>leaf;export const getBarkTexture=()=>null;`,resolveDir:source}));}}, {name:'atlas-paths',setup(b){b.onLoad({filter:/textured-moon\.js$/},async({path:file})=>({contents:(await readFile(file,'utf8')).replaceAll('/dynamic-hero/','/atlas-design-preview/dynamic-hero/'),loader:'js'}));}}]});
// The already reviewed server-rendered shell is static markup, never rehydrated.
const shell=require(source+'/dist/render-shell.cjs').html;
let markup=shell.slice(shell.indexOf('<div')).replace(/<h1 id="hero-title">[\s\S]*?<\/h1>/,'<h1 id="hero-title">Höchberg.<br/><span>Energie von hier.</span></h1>').replace(/<p class="hero-description">[\s\S]*?<\/p>/,'<p class="hero-description">929 Solaranlagen machen hier aus Sonne Strom.<br/>Entdecke die Zahlen und Geschichten dahinter.</p>').replaceAll('/dynamic-hero/','/atlas-design-preview/dynamic-hero/');
let html=await readFile('public/atlas-design-preview/index.html','utf8');
if(html.includes('<div id="root"></div>')) html=html.replace('<div id="root"></div>','<div id="root">'+markup+'</div>').replace(/<script>(?:\(\(\)=>|\(function\(\))\{[\s\S]*?<\/script>/,'');
const fonts=[...new Set(html.match(/data:font\/woff2;base64,[A-Za-z0-9+/=]+/g)||[])];
for(let i=0;i<fonts.length;i++){const name=`atlas-shell-${i}.woff2`;await writeFile(out+'/'+name,Buffer.from(fonts[i].split(',')[1],'base64'));html=html.split(fonts[i]).join('/atlas-design-preview/dynamic-hero/'+name);}
html=html.replace('<script src="/atlas-design-preview/dynamic-hero/test.bundle.js"></script>','<script type="module" src="/atlas-design-preview/dynamic-hero/dist/scene.js"></script>');
html=html.replace('</head>','<script src="/atlas-design-preview/weather-data.js"></script></head>');
await writeFile('public/atlas-design-preview/index.html',html);
for(const name of ['panel-fallback-0.webp','panel-fallback-mobile.webp'])await copyFile(source+'/'+name,out+'/'+name);
console.log('Atlas scene adapted with split renderer and static first view');
