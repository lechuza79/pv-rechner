import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const upstream=JSON.parse(await readFile(new URL('./upstream.json',import.meta.url),'utf8')).source;
const require=createRequire(upstream+'/package.json');const {build}=require('esbuild');
const tree=path.join(upstream,'node_modules/@dgreenheck/ez-tree/src/lib');
await build({entryPoints:['public/hero-system/source/scene-state.js','public/hero-system/source/municipality.js','public/hero-system/source/hero-stage.js','public/hero-system/source/instances.js'],bundle:true,minify:true,format:'esm',splitting:true,outdir:'public/hero-system/dist',nodePaths:[upstream+'/node_modules'],plugins:[
 {name:'upstream-tree-package',setup(b){b.onResolve({filter:/^\.\/node_modules\//},args=>({path:path.join(upstream,args.path)}));}},
 {name:'minimal-tree-textures',setup(b){b.onResolve({filter:/^\.\/textures$/},()=>({path:'minimal',namespace:'slim'}));b.onLoad({filter:/.*/,namespace:'slim'},async()=>({contents:`import * as THREE from 'three';const leaf=new THREE.TextureLoader().load('data:image/png;base64,${(await readFile(tree+'/assets/leaves/ash_color.png')).toString('base64')}');leaf.colorSpace=THREE.SRGBColorSpace;export const getLeafTexture=()=>leaf;export const getBarkTexture=()=>null;`,resolveDir:upstream}));}},
]});

await import("./link-homepage.mjs");
