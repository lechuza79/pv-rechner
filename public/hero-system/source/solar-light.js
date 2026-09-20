// Continuous light levels; compatibility for hosts that only provide daylight.
export function solarLight(state){
 const daylight=Math.max(0,Math.min(1,Number.isFinite(state.daylight)?state.daylight:state.phase==='night'?0:1));
 const elevation=Number.isFinite(state.solarElevation)?state.solarElevation:daylight*35-6;
 return {daylight,sun:Math.max(0,Math.min(1,elevation/6)),sky:.12+.88*daylight};
}
