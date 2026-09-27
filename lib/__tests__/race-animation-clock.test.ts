import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {expect,it} from 'vitest';
const window:any={};
runInNewContext(readFileSync('public/gemeinde/landkreis-rennen.js','utf8'),{window});
it('preserves the browser timeline, including slowdowns around rank changes',()=>{
 const frames=[{values:new Map([['a',100],['b',20]])},{values:new Map([['a',110],['b',200]])}];
 const timeline=window.solarDistrictTimeline(frames,['a','b']);
 expect(timeline.duration).toBeGreaterThan(45000);
 expect(timeline.progress(0)).toBe(0);
 expect(timeline.progress(1)).toBe(1);
 expect(timeline.progress(2)).toBe(1);
 expect(timeline.progress(.5)).not.toBe(.5);
});
it('makes row motion independent of how long rendering takes',()=>{
 const move=window.solarRaceRowPosition;
 let state=move(null,0,0);
 state=move(state,44,100);
 expect(move(state,44,210).value).toBe(22);
 expect(move(state,44,320).value).toBe(44);
 expect(move(state,0,0).value).toBe(0);
});
it('settles final ranks immediately when reduced motion skips the race',async()=>{
 class Element {
  style:Record<string,string>={};dataset:Record<string,string>={};children:Element[]=[];
  isConnected=true;className='';textContent='';inert=false;
  append(...nodes:Element[]){this.children.push(...nodes)}
  setAttribute(){} addEventListener(){} removeEventListener(){} querySelector(){return null} contains(){return true}
 }
 const scope:any={};
 const observer=class {observe(){}disconnect(){}};
 runInNewContext(readFileSync('public/gemeinde/landkreis-rennen.js','utf8'),{
  window:scope,document:{createElement:()=>new Element(),hidden:false},
  matchMedia:()=>({matches:true}),performance:{now:()=>0},
  requestAnimationFrame:(callback:(time:number)=>void)=>callback(100),
  IntersectionObserver:observer,MutationObserver:observer,
 });
 const stage=new Element();
 const rows=[{id:'a',name:'A',value:110},{id:'b',name:'B',value:200}];
 await scope.solarDistrictRace({stage,rows,history:[{year:2000,rows:[{id:'a',value:100},{id:'b',value:20}]},{year:2026,rows}],format:String,animate:false,current:()=>true,skip:()=>false});
 const race=stage.children.find(node=>node.className==='district-race')!;
 expect(race.children.find(node=>node.dataset.raceTown==='b')!.style.transform).toBe('translateY(0px)');
 expect(race.children.find(node=>node.dataset.raceTown==='a')!.style.transform).toBe('translateY(44px)');
});
