import React from 'react';

/** One pointer treatment for both device previews; the stage stays untransformed. */
export default function DeviceStage({children,tablet=false}:{children:React.ReactNode;tablet?:boolean}) {
 const reset=(node:HTMLDivElement)=>{node.style.removeProperty('--device-x');node.style.removeProperty('--device-y');node.style.removeProperty('--device-lift');};
 return <div className={`device-stage${tablet?' device-stage-tablet':''}`} onPointerMove={event=>{
  const node=event.currentTarget;
  if(event.pointerType!=='mouse'||!window.matchMedia('(prefers-reduced-motion: no-preference)').matches){reset(node);return;}
  const rect=node.getBoundingClientRect();
  const x=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1));
  const y=Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1));
  node.style.setProperty('--device-x',`${-y*7}deg`);
  node.style.setProperty('--device-y',`${x*9}deg`);
  node.style.setProperty('--device-lift','-5px');
 }} onPointerLeave={event=>reset(event.currentTarget)} onPointerCancel={event=>reset(event.currentTarget)}>{children}</div>;
}
