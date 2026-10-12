import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe,it,expect,vi} from 'vitest';

const source=readFileSync('public/hero-system/funding-host.js','utf8').replace(/^import .*;\n/gm,'');
describe('funding hero initial location',()=>{
  it.each(['','67685'])('starts the shared stage with postcode %s',async plz=>{
    const scene={},stage={querySelector:()=>scene},root={dataset:{},querySelector:()=>stage};
    const mount=vi.fn(()=>({dispose:vi.fn(),update:vi.fn()}));
    const fetch=vi.fn(async()=>({ok:true,json:async()=>({location:{name:'Freiburg'},weather:{}})}));
    const postMessage=vi.fn();
    const listeners = new Map<string, (event: unknown) => void>();
    const context={window:{frameElement:null},document:{querySelector:()=>root,hidden:false},location:{href:`https://example.test/embed/funding-hero${plz?'?plz='+plz:''}`,origin:'https://example.test'},URL,AbortSignal,Date,fetch,parent:{postMessage},mountHeroStage:mount,sceneState:()=>({}),validateWeather:(v:unknown)=>v,heroInstances:{homepage:{}},setInterval:vi.fn(),clearInterval:vi.fn(),addEventListener:(name:string, listener:(event:unknown)=>void)=>listeners.set(name,listener)};
    await runInNewContext(source.replace('refresh();\nconst onVisibility','const initial = refresh();\nconst onVisibility')+'\ninitial;',context);
    expect(fetch).toHaveBeenCalledWith(plz?'/scene-data?plz=67685':'/scene-data',expect.any(Object));
    expect(mount).toHaveBeenCalledTimes(1);
    postMessage.mockClear();
    listeners.get('message')?.({origin:context.location.origin,source:context.parent,data:{type:'funding-scene-request'}});
    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({plz,status:plz?'loaded':'example'}),'https://example.test');
    const send=(value:string)=>listeners.get('message')?.({origin:context.location.origin,source:context.parent,data:{type:'funding-scene-request',plz:value}});
    send('97204');
    await new Promise(resolve=>setTimeout(resolve,0));
    expect(mount).toHaveBeenCalledTimes(1);
    expect(mount.mock.results[0].value.update).toHaveBeenCalledTimes(1);
    const requests=fetch.mock.calls.length;
    send('');
    send('97204');
    expect(fetch).toHaveBeenCalledTimes(requests);
    expect(mount.mock.results[0].value.dispose).not.toHaveBeenCalled();
  });
});
