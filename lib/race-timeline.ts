/** Same accelerating clock for playback and deterministic frame export. */
export function raceTimeline(length:number, tempo:{ruhigeTage:number;msJeTagStart:number;msJeTagEnde:number}):Float64Array {
  const result = new Float64Array(length + 1);
  for(let index=0;index<length;index++) {
    const progress = Math.max(0, Math.min(1, (index-tempo.ruhigeTage)/Math.max(1,length-tempo.ruhigeTage)));
    result[index+1] = result[index] + tempo.msJeTagStart * Math.pow(tempo.msJeTagEnde/tempo.msJeTagStart, Math.sqrt(progress));
  }
  return result;
}
export function racePositionAt(timeline:Float64Array, timeMs:number):number {
  const end = timeline.length-1;
  if(timeMs<=0)return 0;
  if(timeMs>=timeline[end])return end;
  let lo=0,hi=end;
  while(hi-lo>1){const mid=(lo+hi)>>1;if(timeline[mid]<=timeMs)lo=mid;else hi=mid;}
  return lo+(timeMs-timeline[lo])/(timeline[hi]-timeline[lo]);
}

/** Give milestones and the closing years more reading time, without changing data. */
export function milestoneRaceTimeline(length:number,milestones:readonly number[]):Float64Array {
 const result=new Float64Array(length+1);
 for(let index=0;index<length;index++) {
  const near=milestones.some(point=>Math.abs(point-index)<=1);
  const closing=index/Math.max(1,length-1);
  result[index+1]=result[index]+900+(near?1100:0)+1000*closing*closing;
 }
 return result;
}
