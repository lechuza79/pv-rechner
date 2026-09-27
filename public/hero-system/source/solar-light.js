// Artistic exposure curve, not a physical luminance measurement. The sky remains
// illuminated after sunset while direct sunlight and foreground exposure fall.
const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=(a,b,value)=>{const t=clamp((value-a)/(b-a));return t*t*(3-2*t);};
export function solarLight(state){
 const daylight=clamp(Number.isFinite(state.daylight)?state.daylight:state.phase==='night'?0:1);
 const elevation=Number.isFinite(state.solarElevation)?state.solarElevation:daylight*35-6;
 // Low cloud and fog hide the sunlit horizon. High cloud alone does not imply
 // a grey sky, but neither does it guarantee a colourful sunset.
 const cloud=clamp(Number.isFinite(state.cloud)?state.cloud:0);
 const low=clamp(Number.isFinite(state.cloudLow)?state.cloudLow:cloud);
 const warmth=(1-.8*low)*(1-.45*cloud)*(1-.9*clamp(state.fog||0));
 return {daylight,sun:clamp(elevation/6),sky:.12+.88*smooth(-12,3,elevation),
  twilight:smooth(-12,-5,elevation)*(1-smooth(0,10,elevation))*warmth,night:1-smooth(-12,-6,elevation)};
}
