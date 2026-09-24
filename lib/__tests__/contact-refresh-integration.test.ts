import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { observedFields } from "../contact-evidence";
import * as suppliers from "../versorger-erhebung";
import * as widgets from "../versorger-werkzeuge";
import * as municipalities from "../kommunen-profil";
import * as search from "../funding-url-suche";
import { entschluesseltOderRoh } from "../uri-sicher";

// Execute the actual script orchestration against an in-memory database; no copied implementation.
function scriptFunction(name: string, dependencies: Record<string, unknown>, file = "scripts/presse-refresh.ts") {
  const source = ts.createSourceFile('presse.ts', readFileSync(file,'utf8'), ts.ScriptTarget.Latest, true);
  const node = source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name)!;
  const js = ts.transpileModule(node.getText(source), {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  return new Function(...Object.keys(dependencies), `${js}; return ${name};`)(...Object.values(dependencies));
}

describe('real press refresh write paths',()=>{
  async function scenario(failed: boolean, partial = false) {
    const media = new Map<string, Record<string, unknown>>([['ort.de',{domain:'ort.de',profil_at:'old',notiz:'human note'}]]);
    const contacts = new Map<string, Record<string, unknown>>([['name:anna',{schluessel:'name:anna',mail:'anna@ort.de',stand:'vorgemerkt',notiz:'keep'}]]);
    const db = {from:()=>({delete:()=>{throw Error('Deletion forbidden');}})};
    const profil = scriptFunction('profil', {
      makeClient:async()=>db, alleZeilen:async()=>[{domain:'ort.de',paket:1,profil_at:null}],
      observedFields, log:()=>{}, pool:async(items:unknown[],_n:number,fn:(x:unknown)=>Promise<void>)=>Promise.all(items.map(fn)),
      holeMedium:async()=>failed?{fehler:'HTTP 503'}:Object.assign([],{incomplete:partial}),
      werteAus:()=>({domain:'ort.de',ist_medium:'medium',kontakte:[{domain:'ort.de',schluessel:'name:anna',name:'Anna',mail:null}],belege:[]}),
      upsert:async(_db:unknown,table:string,rows:Record<string,unknown>[])=>{
        const target=table==='presse_medien'?media:table==='presse_kontakte'?contacts:null;
        for(const row of rows){const key=String(table==='presse_medien'?row.domain:row.schluessel);target?.set(key,{...target.get(key),...row});}
      },
    });
    await profil(null,10,true);
    return {media:media.get('ort.de')!,contact:contacts.get('name:anna')!};
  }
  it('preserves contacts and workflow when all pages fail',async()=>{
    const r=await scenario(true);expect(r.contact).toMatchObject({mail:'anna@ort.de',stand:'vorgemerkt',notiz:'keep'});
    expect(r.media).toMatchObject({profil_at:'old',notiz:'human note',fehler:'HTTP 503'});
  });
  it('preserves a previously found address when the same person is found without one',async()=>{
    expect((await scenario(false)).contact).toMatchObject({mail:'anna@ort.de',stand:'vorgemerkt',notiz:'keep'});
  });
  it('does not refresh the verification date after a partial read',async()=>{
    const r=await scenario(false,true);expect(r.media.profil_at).toBe('old');expect(r.media.fehler).toContain('Teilabruf');
  });
  it('seed import cannot delete discoveries or replace human media notes',async()=>{
    const rows=new Map([['ort.de',{domain:'ort.de',notiz:'human'}],['discovered.de',{domain:'discovered.de',notiz:'new source'}]]);
    const saat=scriptFunction('saat',{doppelteInDerSaat:()=>[],SAAT:[{domain:'ort.de',name:'Ort'}],log:()=>{},makeClient:async()=>({from:()=>({upsert:async(data:{domain:string;notiz:string}[],options:{ignoreDuplicates:boolean})=>{for(const row of data){if(!rows.has(row.domain)||!options.ignoreDuplicates)rows.set(row.domain,row);}return {error:null};},delete:()=>{throw Error('Deletion forbidden');}})})});
    await saat();expect(rows.size).toBe(2);expect(rows.get('ort.de')?.notiz).toBe('human');
  });
});


describe('supplier failed search fallback',()=>{
  it('preserves prior facts after an internal search fails',async()=>{
    const url = 'https://stadtwerk.de/';
    const crawl = scriptFunction('erhebe',{
      ...suppliers,...widgets,...municipalities,...search, entschluesseltOderRoh,
      sitemapAdressen:async()=>[],
      holeSeite:async(target:string)=>target===url?{html:'<title>Stadtwerk</title><form action="/suche"><input name="q" type="search"></form>'}:{fehler:'HTTP 503'},
    },'scripts/versorger-erhebung.ts');
    const result = await crawl({website:url},new Date('2026-09-12'));
    expect(result.abruf).toBe('teilweise');expect(result.fehler).toContain('503');
    let stored={erhebung_geprueft_am:'old',kontaktformular:true,erhebung_fehler:null};
    const save=scriptFunction('schreibeBefund',{observedFields},'scripts/versorger-erhebung.ts');
    await save({from:()=>({update:(row:object)=>({eq:async()=>{stored={...stored,...row};return {error:null};}})})},{id:'one'},result,'new');
    expect(stored).toMatchObject({erhebung_geprueft_am:'old',kontaktformular:true});
  });
});
