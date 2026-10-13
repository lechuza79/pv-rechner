import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {expect,it,vi} from 'vitest';

const source=readFileSync('public/gemeinde/konfetti.js','utf8');
function harness(reducedMotion=false) {
  const listeners=new Map<string,((event:unknown)=>void)[]>();
  const addEventListener=(name:string,callback:(event:unknown)=>void)=>listeners.set(name,[...(listeners.get(name)??[]),callback]);
  const window:Record<string,unknown>={addEventListener};
  const canvas={style:{},setAttribute:vi.fn(),remove:vi.fn(),getContext:()=>({scale:vi.fn()})};
  const target={dataset:{} as Record<string,string>,getBoundingClientRect:()=>({left:30,top:100,width:80,height:160})};
  const context={window,document:{currentScript:{dataset:{rankingOnly:'true'}},hidden:false,addEventListener,querySelector:()=>null,createElement:()=>canvas,body:{append:vi.fn()}},
    matchMedia:()=>({matches:reducedMotion,addEventListener:vi.fn()}),addEventListener,setTimeout:vi.fn(),
    requestAnimationFrame:vi.fn(()=>1),cancelAnimationFrame:vi.fn(),devicePixelRatio:1,innerWidth:1200,innerHeight:800,performance:{now:()=>0}};
  return {context,target,listeners};
}
it('celebrates the supplied podium without polling for an absent municipality hero',()=>{
  const {context,target,listeners}=harness();
  runInNewContext(source,context);
  listeners.get('atlas-ranking-celebrate')![0]({detail:{target}});
  expect(context.document.body.append).toHaveBeenCalledOnce();
  expect(target.dataset.celebrated).toBe('true');
  expect(context.setTimeout).not.toHaveBeenCalled();
});
it('installs one particle engine when multiple ranking hosts load it',()=>{
  const {context,listeners}=harness();
  runInNewContext(source,context);
  runInNewContext(source,context);
  expect(listeners.get('atlas-ranking-celebrate')).toHaveLength(1);
  expect(listeners.get('resize')).toHaveLength(1);
});
it('respects reduced motion without creating a canvas',()=>{
  const {context,target,listeners}=harness(true);
  runInNewContext(source,context);
  listeners.get('atlas-ranking-celebrate')![0]({detail:{target}});
  expect(context.document.body.append).not.toHaveBeenCalled();
  expect(target.dataset.celebrated).toBeUndefined();
});
