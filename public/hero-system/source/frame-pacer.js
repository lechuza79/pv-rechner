// Retain fractional frame time: resetting to `now` drops frames whenever
// requestAnimationFrame arrives slightly later than the target interval.
export function createFramePacer(fps=30){
 const interval=1000/fps;
 let next=null;
 return {
  reset(){next=null;},
  shouldDraw(now,force=false){
   if(next===null){next=now+interval;return true;}
   if(now+.5<next)return force;
   next+=Math.max(1,Math.floor((now-next)/interval)+1)*interval;
   // A stalled/hidden tab must never replay missed frames.
   if(next<=now)next=now+interval;
   return true;
  },
 };
}
