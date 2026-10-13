export type PlotRect={x:number;y:number;width:number;height:number};
/** Prefer upper corners, but never cover a data mark. Reserve a row if none fits. */
export function chartAnnotationCorner(width:number,height:number,tile:Pick<PlotRect,'width'|'height'>,marks:PlotRect[]):'top-right'|'top-left'|'bottom-right'|'bottom-left'|'above'{
 const candidates=[['top-right',width-tile.width,0],['top-left',0,0],['bottom-right',width-tile.width,height-tile.height],['bottom-left',0,height-tile.height]] as const;
 for(const [corner,x,y] of candidates){
  if(x<0||y<0)continue;
  if(marks.every(m=>x+tile.width+6<=m.x||m.x+m.width+6<=x||y+tile.height+6<=m.y||m.y+m.height+6<=y))return corner;
 }
 return 'above';
}
