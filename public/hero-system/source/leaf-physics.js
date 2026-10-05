// Calibration assumptions for this stylised scene, not surveyed dimensions:
// near 0.012-unit leaves represent ~10 cm; distant 24-unit trees ~12 m.
export const NEAR_METRES_PER_UNIT=8;
export const TREE_METRES_PER_UNIT=.5;
export const windMetresPerSecond=wind=>wind*15/3.6;
export function createLeafMotion(seed,wind=0,carried=true){
 return {seed,velocity:[carried?windMetresPerSecond(wind)*.55:0,0,0],spin:0};
}
// Integrate in metres. Independent drag, settling and three-dimensional eddies
// create curved trajectories; the camera alone determines apparent speed.
export function advanceLeaf(p,time,dt,wind){
 const s=p.seed,w=windMetresPerSecond(wind),a=Math.abs(w);
 const eddy=Math.sin(time*(1.3+.17*Math.sin(s))+s)+.45*Math.sin(time*3.1+s*2.7);
 const target=[w*.55*(1+.2*Math.sin(s))+eddy*a*.12,
  -(.7+.35*(1+Math.sin(s*1.9)))+Math.sin(time*2.3+s*3.7)*a*.08,
  Math.cos(time*1.7+s*2.1)*a*.09];
 const blend=1-Math.exp(-dt/(.24+.18*(1+Math.sin(s))));
 for(let i=0;i<3;i++)p.velocity[i]+=(target[i]-p.velocity[i])*blend;
 p.spin+=dt*(1.4+a*.15)*Math.sin(time*1.6+s);
 return p.velocity.map(v=>v*dt);
}
