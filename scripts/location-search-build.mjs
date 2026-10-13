import {build} from 'esbuild';
await build({entryPoints:['scripts/location-search/simulation.jsx'],outdir:'public/location-search',bundle:true,jsx:'automatic',format:'esm',minifyWhitespace:true,minifySyntax:true,minifyIdentifiers:false,define:{'process.env.NODE_ENV':'"production"'}});
