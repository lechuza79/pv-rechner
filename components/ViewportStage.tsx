"use client";
import {useLayoutEffect,useRef,type ReactNode} from 'react';
import './viewport-stage.css';
/** Reserve the real space above a stage, including headers and breadcrumbs. */
export function ViewportStage({children}:{children:ReactNode}){
 const ref=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const node=ref.current;if(!node)return;
  const measure=()=>node.style.setProperty('--stage-top',`${Math.max(0,node.getBoundingClientRect().top+window.scrollY)}px`);
  const observer=new ResizeObserver(measure);
  let sibling=node.previousElementSibling;
  while(sibling){observer.observe(sibling);sibling=sibling.previousElementSibling;}
  window.addEventListener('resize',measure);document.fonts.ready.then(measure);measure();
  return()=>{observer.disconnect();window.removeEventListener('resize',measure);};
 },[]);
 return <div ref={ref} className="sc-viewport-stage">{children}</div>;
}
