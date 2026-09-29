// Canvas-scoped desktop gestures. Consumers own camera limits and rendering.
// Touch-screen pointer gestures remain with the existing scene controls.
export function bindTrackpadGestures(element,{pan,zoom,mode=()=> 'trackpad',enabled=()=>true}){
 let gestureScale=null;
 const active=()=>enabled();
 const consume=event=>{event.preventDefault();event.stopImmediatePropagation();};
 const wheel=event=>{
  if(!active())return;
  const unit=event.deltaMode===1?16:event.deltaMode===2?element.clientHeight:1;
  if(event.ctrlKey&&zoom){
   consume(event);
   // Safari can emit both event families for one physical pinch.
   if(gestureScale===null)zoom(Math.exp(Math.max(-100,Math.min(100,event.deltaY*unit))*.01));
  }else if(mode()==='trackpad'&&pan){
   // Wheel deltas describe scrolling, opposite to pointer-drag deltas.
   consume(event);pan(-event.deltaX*unit,-event.deltaY*unit);
  }
 };
 const start=event=>{if(!active()||!zoom)return;consume(event);gestureScale=Number.isFinite(event.scale)&&event.scale>0?event.scale:1;};
 const change=event=>{
  if(gestureScale===null||!active()||!zoom)return;
  consume(event);
  if(Number.isFinite(event.scale)&&event.scale>0){zoom(gestureScale/event.scale);gestureScale=event.scale;}
 };
 const end=event=>{if(gestureScale!==null){consume(event);gestureScale=null;}};
 const options={capture:true,passive:false};
 for(const [name,handler] of [['wheel',wheel],['gesturestart',start],['gesturechange',change],['gestureend',end]])element.addEventListener(name,handler,options);
 return ()=>{for(const [name,handler] of [['wheel',wheel],['gesturestart',start],['gesturechange',change],['gestureend',end]])element.removeEventListener(name,handler,{capture:true});gestureScale=null;};
}
