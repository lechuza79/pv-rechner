/** A reproducible weather sample point, not an area-weighted municipal average. */
export function boundaryWeatherPoint(coordinates:unknown):{latitude:number;longitude:number}|null{
 let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
 function visit(value:unknown){if(!Array.isArray(value))return;if(typeof value[0]==='number'&&typeof value[1]==='number'){const [x,y]=value;if(Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x)<=180&&Math.abs(y)<=90){west=Math.min(west,x);east=Math.max(east,x);south=Math.min(south,y);north=Math.max(north,y);}return;}value.forEach(visit);}
 visit(coordinates);return Number.isFinite(west)?{latitude:(south+north)/2,longitude:(west+east)/2}:null;
}
