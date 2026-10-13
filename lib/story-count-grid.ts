/** Every rectangle has the same capacity; the final cell may be partial. */
export function storyCountGrid(total:number,selected:number,maxCells=500){
 if(!Number.isInteger(total)||!Number.isInteger(selected)||total<=0||selected<0||selected>total)throw new Error('Invalid installation counts');
 if(!Number.isInteger(maxCells)||maxCells<1)throw new Error('Invalid cell budget');
 const perCell=10**Math.max(0,Math.ceil(Math.log10(total/maxCells)));
 return {perCell,cells:Array.from({length:Math.ceil(total/perCell)},(_,i)=>({
  occupied:Math.min(perCell,total-i*perCell)/perCell,
  selected:Math.max(0,Math.min(perCell,selected-i*perCell))/perCell,
 }))};
}
