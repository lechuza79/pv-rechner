// Read-only snapshot of the project's existing widget sources, not a new registry.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const ts = require('typescript');
const root = process.argv[2] || path.resolve(__dirname, '../..');
const out = __dirname;
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} }; cache.set(file, module.exports);
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','module','exports',js)((id) => {
    if (!id.startsWith('.')) throw new Error('Unexpected module: '+id);
    return load(path.resolve(path.dirname(file),id)+'.ts');
  },module,module.exports);
  return module.exports;
}
const registry = load(path.join(root,'lib/widget-registry.ts'));
const catalog = load(path.join(root,'lib/chart-katalog.ts')).CHART_KATALOG;
const gallerySource = fs.readFileSync(path.join(root,'app/(site)/energie-widgets/client.tsx'),'utf8');
const ast = ts.createSourceFile('client.tsx',gallerySource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let initializer;
function visit(n) { if(ts.isVariableDeclaration(n) && n.name.getText(ast)==='SECTIONS') initializer=n.initializer.getText(ast); ts.forEachChild(n,visit); }
visit(ast);
const sections = new Function('return ('+initializer+')')();
const files = cp.execFileSync('rg',['--files','app','components','lib'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(f=>/\.(tsx?|jsx?)$/.test(f)&&!f.includes('__tests__'));
const texts = files.map(f=>[f,fs.readFileSync(path.join(root,f),'utf8')]);
const embedPages = files.filter(f=>f.startsWith('app/(embed)/embed/')&&f.endsWith('/page.tsx'));
const entries = Object.entries(registry.WIDGETS).map(([key,w])=>{
  const sectionsFor = sections.filter(s=>s.id===w.id || s.variants.some(v=>v.src==='/embed/'+w.id));
  const routes = embedPages.filter(f=>f.startsWith('app/(embed)/embed/'+w.id+'/'));
  const uses=texts.filter(([f,t])=>f!=='lib/widget-registry.ts'&&new RegExp('\\bWIDGETS\\.'+key+'\\b').test(t)).map(([f])=>f);
  const variants=sectionsFor.flatMap(s=>s.variants.map(v=>({label:v.label,url:new URL(v.src+'?'+new URLSearchParams({...w.exampleParams,...v.params}), 'https://solar-check.io').href})));
  if(!variants.length && w.embeddable!==false && routes.some(f=>f==='app/(embed)/embed/'+w.id+'/page.tsx')) variants.push({label:'Widget öffnen',url:'https://solar-check.io'+registry.embedExamplePath(w)});
  return {key,id:w.id,title:w.title,kind:w.kind,publishedGallery:sectionsFor.length>0,description:sectionsFor[0]?.intro||w.shareText,sourcePage:w.shareUrl,variants,routes,uses,sources:w.sources.map(s=>s.name),embedDeclared:w.embeddable!==false};
});
const representedRoutes=new Set(entries.flatMap(e=>e.routes));
const extraRoutes=embedPages.filter(f=>!representedRoutes.has(f));
const components=catalog.filter(c=>c.art==='widget').map(c=>({...c,uses:texts.filter(([f,t])=>!f.endsWith('/'+c.datei+'.tsx')&&t.includes(c.datei.split('/').pop())).map(([f])=>f)}));
const snapshot={commit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),generatedAt:new Date().toISOString(),entries,extraRoutes,components,legacySectionCount:sections.length};
fs.writeFileSync(path.join(out,'inventory.json'),JSON.stringify(snapshot,null,2));
console.log(JSON.stringify({widgets:entries.length,legacySections:sections.length,missingFromGallery:entries.filter(e=>!e.publishedGallery).length,extraRoutes,componentCandidates:components.length},null,2));
