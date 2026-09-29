import {afterEach, describe, expect, it, vi} from 'vitest';
import {waitForChartVisibility} from '../chart-export-visibility';
afterEach(()=>vi.unstubAllGlobals());
function fixture() {
  const doc=Object.assign(new EventTarget(),{hidden:true});
  let mutation=()=>{};
  const disconnect=vi.fn();
  vi.stubGlobal('MutationObserver',class {
    constructor(callback:()=>void){mutation=callback;}
    observe(){} disconnect=disconnect;
  });
  const node={isConnected:true,ownerDocument:doc} as unknown as HTMLElement;
  return {doc,node,disconnect,mutation:()=>mutation()};
}
describe('Background chart export',()=>{
  it('waits without failing and resumes when visible again',async()=>{
    const f=fixture();let finished=false;
    const pending=waitForChartVisibility(f.node).then(()=>{finished=true;});
    await Promise.resolve();expect(finished).toBe(false);
    f.doc.hidden=false;f.doc.dispatchEvent(new Event('visibilitychange'));
    await pending;expect(finished).toBe(true);expect(f.disconnect).toHaveBeenCalledOnce();
  });
  it('rejects and cleans up if the chart is removed while paused',async()=>{
    const f=fixture();const pending=waitForChartVisibility(f.node);
    Object.assign(f.node,{isConnected:false});f.mutation();
    await expect(pending).rejects.toThrow('Diagramm ist nicht mehr geöffnet');
    expect(f.disconnect).toHaveBeenCalledOnce();
  });
  it('passes visible charts and rejects removed charts immediately',async()=>{
    const f=fixture();f.doc.hidden=false;
    await expect(waitForChartVisibility(f.node)).resolves.toBeUndefined();
    Object.assign(f.node,{isConnected:false});
    await expect(waitForChartVisibility(f.node)).rejects.toThrow('Diagramm ist nicht mehr geöffnet');
  });
});
