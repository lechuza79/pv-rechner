import {afterEach,expect,it,vi} from 'vitest';
const calls=vi.hoisted(()=>({frames:[] as number[],commands:[] as number[]}));
vi.mock('../chart-export',()=>({captureNodeToBlob:async()=>new Blob()}));
vi.mock('mediabunny',()=>({
 Output:class {target={buffer:new ArrayBuffer(0)};addVideoTrack(){} async start(){} async finalize(){} async cancel(){}},
 Mp4OutputFormat:class {},BufferTarget:class {},
 CanvasSource:class {async add(time:number){calls.frames.push(time)}close(){}},
 canEncodeVideo:async()=>true,
}));
import {downloadChartVideo,chartAnimationDuration} from '../chart-animation-export';
afterEach(()=>vi.unstubAllGlobals());
it('encodes the chart clock at 30fps regardless of capture wall time',async()=>{
 calls.frames=[];calls.commands=[];
 vi.stubGlobal('CustomEvent',class {detail:any;constructor(_name:string,options:any){this.detail=options.detail}});
 vi.stubGlobal('requestAnimationFrame',(callback:()=>void)=>callback());
 vi.stubGlobal('createImageBitmap',async()=>({width:101,height:99,close(){}}));
 vi.stubGlobal('getComputedStyle',()=>({getPropertyValue:()=>''}));
 vi.stubGlobal('URL',{createObjectURL:()=> 'blob:test'});
 vi.stubGlobal('document',{hidden:false,createElement:(tag:string)=>tag==='a'?{click(){}}:{getContext:()=>({fillRect(){},drawImage(){}})}});
 const target={dispatchEvent:(event:any)=>{
  if(event.detail.mode==='describe')event.detail.report({durationMs:100});
  if(event.detail.mode==='seek')calls.commands.push(event.detail.timeMs);
 }};
 const node={isConnected:true,querySelectorAll:()=>[target]} as unknown as HTMLElement;
 expect(chartAnimationDuration(node)).toBe(100);
 const result=await downloadChartVideo(node,'race',()=>{});
 expect(result.filename).toBe('race.mp4');
 expect(calls.commands).toEqual([0,1000/30,2000/30]);
 expect(calls.frames).toEqual([0,1/30,2/30]);
});
