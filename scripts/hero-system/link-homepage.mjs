// Keep the accepted host/navigation bundle, but use the same scene entry points
// as municipal pages. AST boundaries avoid rewriting unrelated minified code.
import ts from 'typescript';
import {readFileSync,writeFileSync} from 'node:fs';
const path='public/dynamic-hero/dist/test.js';
let source=readFileSync(path,'utf8');
const definitions=[
 ['mountHeroStage','/hero-system/dist/hero-stage.js','Hero requires containers'],
 ['sceneState','/hero-system/dist/scene-state.js','solarElevation:'],
 ['validateWeather','/hero-system/dist/scene-state.js','cloud_cover'],
];
if(!source.includes('// shared-scene-entrypoints')){
 const ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const changes=definitions.map(([name,url,marker])=>{
  const matches=ast.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.getText(ast).includes(marker));
  if(matches.length!==1)throw Error(`Expected one ${name} function, found ${matches.length}`);
  const node=matches[0];
  return {start:node.getStart(ast),end:node.end,text:`import {${name} as ${node.name.text}} from '${url}';`};
 });
 for(const change of changes.sort((a,b)=>b.start-a.start))source=source.slice(0,change.start)+change.text+source.slice(change.end);
 writeFileSync(path,'// shared-scene-entrypoints\n'+source);
}
