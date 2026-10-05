// A shared animation envelope, not a local wind measurement. Reference: DWD
// Beaufort effects on land; weather speed is normalized as km/h divided by 15.
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function gustPulse(time){
  const cycle=Math.floor((time+2)/11),local=(time+2)-cycle*11;
  const seed=Math.sin(cycle*127.1+9.2)*43758.5453,variation=seed-Math.floor(seed);
  const duration=3.2+variation*2.5,start=variation*2;
  return smooth(start,start+.8,local)*(1-smooth(start+1.3,start+duration,local));
}
export function sampleWind(time,base,direction=1,manual=0){
  const pulse=Math.max(gustPulse(time),manual);
  return {wind:direction*(base*(.72+pulse*.7)+manual*1.2),pulse};
}
export function leafRelease(time,state){
  const pulse=state.windPulse??gustPulse(time);
  return .025+Math.pow(pulse,3)*8;
}
export function treeWindResponse(wind){
  const speed=Math.abs(wind)*15,sign=Math.sign(wind);
  return {
    // Leaf flutter saturates; larger limbs engage progressively as wind rises.
    leaf:sign*3*Math.tanh(Math.abs(wind)/3),
    twig:sign*4*Math.tanh(Math.abs(wind)/4),
    trunk:sign*(.0015*smooth(5,30,speed)+.075*smooth(25,90,speed)),
  };
}
