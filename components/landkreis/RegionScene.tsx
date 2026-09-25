"use client";
import { useEffect, useRef, useState } from "react";
import type { ProjectedRegion } from "../../lib/region-perspektive";
import type { MapValue } from "./RegionKarte";
import type { createRegionScene, Season } from "./region-scene";
import styles from "./landkreis.module.css";

type Props = { heightEnvelope: Record<string, number>; shapes: ProjectedRegion[]; values: MapValue[]; selected: string; hovered: string|null; season?: Season;
  onHover: (id:string|null)=>void; onSelect: (id:string)=>void; onReady: (ready:boolean)=>void };
export default function RegionScene(props:Props) {
  const host=useRef<HTMLDivElement>(null), current=useRef(props);
  current.current=props;
  const scene=useRef<ReturnType<typeof createRegionScene>|null>(null);
  const [pin,setPin]=useState<{x:number;y:number}|null>(null);
  const [failed,setFailed]=useState(false);
  const [framed,setFramed]=useState(false);
  const city=props.shapes.find(s=>s.kind==="Kreisfreie Stadt");
  useEffect(()=>{
    const stage=host.current?.closest<HTMLElement>("[data-map-hero-stage]");
    const band=stage?.closest<HTMLElement>("[data-map-hero-band]");
    if(!stage||!band)return;
    const measure=()=>{stage.style.setProperty("--map-headroom",`${Math.max(0,stage.getBoundingClientRect().top-band.getBoundingClientRect().top)}px`);setFramed(true);};
    const observer=new ResizeObserver(measure);observer.observe(band);measure();
    window.addEventListener("resize",measure);
    return()=>{observer.disconnect();window.removeEventListener("resize",measure);};
  },[]);
  useEffect(()=>{
    let disposed=false;
    import("./region-scene").then(({createRegionScene})=>{
      if(disposed||!host.current)return;
      const instance=createRegionScene(host.current,current.current.shapes,{
        hover:id=>current.current.onHover(id),select:id=>current.current.onSelect(id),pin:setPin,
        failed:()=>{setFailed(true);current.current.onReady(false);},
      }, current.current.heightEnvelope);
      scene.current=instance;
      instance.update(current.current.values,current.current.selected,current.current.hovered);
      void instance.season(current.current.season??"summer");
      current.current.onReady(true);
    }).catch(()=>{if(!disposed){setFailed(true);current.current.onReady(false);}});
    return()=>{disposed=true;scene.current?.dispose();scene.current=null;};
  },[props.shapes]);
  useEffect(()=>{scene.current?.update(props.values,props.selected,props.hovered);},[props.values,props.selected,props.hovered]);
  useEffect(()=>{void scene.current?.season(props.season??"summer");},[props.season]);
  return <div className={styles.sceneLayer} hidden={failed} style={{visibility:framed?"visible":"hidden"}}>
    <div ref={host} className={styles.sceneHost} data-region-scene />
    {pin&&city&&<button type="button" className={styles.scenePin} data-city-pin={city.id}
      style={{left:pin.x,top:pin.y}} aria-label={`${city.name}: kreisfreie Stadt`}
      onPointerEnter={()=>props.onHover(city.id)} onPointerLeave={()=>props.onHover(null)}
      onFocus={()=>props.onHover(city.id)} onBlur={()=>props.onHover(null)} onClick={()=>props.onSelect(city.id)}>
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 23C10 20 3 14 3 9A9 9 0 0 1 21 9C21 14 14 20 12 23Z"/><text x="12" y="11.5" textAnchor="middle" fill="#163338" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="7">{city.name.replace(/^Kreisfreie Stadt\s+/, "").slice(0, 2).toLocaleUpperCase("de-DE")}</text></svg>
    </button>}
  </div>;
}
