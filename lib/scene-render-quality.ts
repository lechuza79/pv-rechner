/** Reduce raster work after sustained slow rendering, without changing geography or optics. */
export function scenePixelRatio(deviceRatio:number,width:number,height:number,level=0){
 const ceiling=[1.5,1.25,1,.75][Math.min(3,Math.max(0,level))];
 return Math.min(Math.max(.5,deviceRatio||1),ceiling,Math.sqrt(2_000_000/Math.max(1,width*height)));
}
export function createSceneQuality(){
 let level=0,last:number|null=null,start=0,slowWindows=0;
 let samples:number[]=[];
 return {
  get level(){return level;},
  get fps(){return level===3?30:60;},
  reset(){last=null;samples=[];slowWindows=0;},
  sample(now:number){
   if(last===null){last=start=now;return null;}
   const elapsed=now-last;last=now;
   // Do not interpret a hidden tab, breakpoint or long task as sustained GPU load.
   if(elapsed<=0||elapsed>250){samples=[];start=now;slowWindows=0;return null;}
   samples.push(elapsed);
   if(now-start<1500||samples.length<24)return null;
   const sorted=[...samples].sort((a,b)=>a-b);
   const p75=sorted[Math.floor((sorted.length-1)*.75)];
   const fps=1000/(samples.reduce((sum,n)=>sum+n,0)/samples.length);
   slowWindows=p75>(level===3?44:26)?slowWindows+1:0;
   let changed=false;
   // Only step down within a mounted scene: no distracting resolution oscillation.
   if(slowWindows>=2&&level<3){level++;slowWindows=0;changed=true;}
   samples=[];start=now;
   return {changed,level,fps,p75Ms:p75,targetFps:level===3?30:60};
  }
 };
}
