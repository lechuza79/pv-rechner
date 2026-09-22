/** Fit the plotted extent and center disc into a square, with stroke clearance. */
export function radialPreviewViewBox(points:number[][],center:number,radius:number):string {
 let left=center-radius,right=center+radius,top=center-radius,bottom=center+radius;
 for(const [x,y] of points){if(!Number.isFinite(x)||!Number.isFinite(y))continue;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 const side=Math.max(right-left,bottom-top)*1.08;
 return [(left+right-side)/2,(top+bottom-side)/2,side,side].join(' ');
}
