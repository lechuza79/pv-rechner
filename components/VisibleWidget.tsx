"use client";
import {useEffect,useRef,useState,type ReactNode} from 'react';
/** Mount animations only when their reserved card enters the viewport. */
export default function VisibleWidget({children,minHeight=500}:{children:ReactNode;minHeight?:number}) {
 const ref=useRef<HTMLDivElement>(null);const [visible,setVisible]=useState(false);
 useEffect(()=>{const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){setVisible(true);observer.disconnect();}},{threshold:0.05});if(ref.current)observer.observe(ref.current);return()=>observer.disconnect();},[]);
 return <div ref={ref} style={{minHeight}}>{visible?children:<div className="sc-widget-inset" role="status">Diagramm wird geladen …</div>}</div>;
}
