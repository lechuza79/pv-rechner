"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {createPortal} from 'react-dom';
import {useRouter} from 'next/navigation';
import RegionScene from "./RegionScene";
import { WidgetSetting } from "../dashboard/WidgetSetting";
import "../dashboard/dashboard.css";
import { barHeight, type ProjectedRegion } from "../../lib/region-perspektive";
import type { Messwert } from "../../lib/atlas-format";
import styles from "./landkreis.module.css";

export type MapValue = { id: string; name: string; value: number | null; formatted: Messwert; href: string | null };

/** Geography and a single, consistently scaled metric arrive as props.
 * A state map can pass districts through the same interface.
 */
export default function RegionKarte({ shapes, metrics, member = "Gemeinde", overview = "Gemeindeübersicht" }: {
  shapes: ProjectedRegion[]; metrics: { id: string; label: string; values: MapValue[] }[];
  /** Singular of the mapped unit (link hint) and the name of the table below. */
  member?: string; overview?: string;
}) {
  const router=useRouter();
  const tooltip=useRef<HTMLDivElement>(null);
  const navigationTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [pointer,setPointer]=useState({x:0,y:0});
  const [flagPosition,setFlagPosition]=useState({left:12,top:12});
  const [navigating,setNavigating]=useState(false);
  useEffect(()=>()=>{if(navigationTimer.current)clearTimeout(navigationTimer.current);},[]);
  const heightEnvelope = useMemo(() => {
    const heights: Record<string, number> = {};
    for (const metric of metrics) {
      const max = Math.max(0, ...metric.values.map(v=>v.value??0));
      for (const value of metric.values) heights[value.id] = Math.max(heights[value.id]??0, max>0?(value.value??0)/max:0);
    }
    return heights;
  }, [metrics]);
  const [metricId, setMetricId] = useState(metrics[0].id);
  const { values, label: metric } = metrics.find(m => m.id === metricId) ?? metrics[0];
  const [sceneFailed, setSceneFailed] = useState(false);
  const [selected, setSelected] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);
  useEffect(() => {
    if (!hovered) return;
    const dismiss = (event: KeyboardEvent) => { if (event.key === "Escape") setHovered(null); };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, [hovered]);
  const openPlace=(id:string)=>{
    const place=values.find(v=>v.id===id);
    if(!place?.href){setHovered(id);return;}
    if(navigating)return;
    setSelected(id);setHovered(null);setNavigating(true);
    const delay=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:180;
    navigationTimer.current=setTimeout(()=>router.push(place.href!),delay);
  };
  useLayoutEffect(()=>{
    if(!hovered||!tooltip.current)return;
    const reposition=()=>{
      const rect=tooltip.current!.getBoundingClientRect(),gap=12;
      const left=Math.max(gap,Math.min(pointer.x+16,window.innerWidth-rect.width-gap));
      const top=Math.max(gap,Math.min(pointer.y+20,window.innerHeight-rect.height-gap));
      setFlagPosition({left,top});
    };
    reposition();window.addEventListener('resize',reposition);
    const dismiss=()=>setHovered(null);window.addEventListener('scroll',dismiss,true);
    return()=>{window.removeEventListener('resize',reposition);window.removeEventListener('scroll',dismiss,true);};
  },[hovered,pointer,metric]);
  const byId = new Map(values.map(v => [v.id, v]));
  const hoverShape = shapes.find(s => s.id === hovered);
  const hoverValue = hovered ? byId.get(hovered) : undefined;
  const contextDescription = (shape?: ProjectedRegion) => shape?.kind === "Gemeindefreies Gebiet"
    ? "Gemeindefreies Waldgebiet · gehört zum Landkreis, aber zu keiner Gemeinde. Deshalb ohne Vergleichssäule."
    : shape?.kind === "Kreisfreie Stadt"
      ? "Kreisfreie Stadt · gehört nicht zum Landkreis."
      : "Gehört nicht zur Gemeindevergleichsgruppe.";
  const maximum = Math.max(0, ...values.map(v => v.value ?? 0));
  const left = Math.min(...shapes.map(s => s.bounds[0])) - 32;
  const right = Math.max(...shapes.map(s => s.bounds[2])) + 32;
  const top = Math.min(...shapes.map(s => Math.min(s.bounds[1], s.anchor[1] - barHeight(byId.get(s.id)?.value ?? null, maximum)))) - 32;
  const bottom = Math.max(...shapes.map(s => s.bounds[3])) + 32;
  return <div className={styles.map} data-navigating={navigating}>
    <div className={`${styles.mapTools} sc-dashboard`} role="group" aria-label="Kennzahl der Karte">
      <WidgetSetting label="Kennzahl der Karte" hideLabel size="md" stepper loop stepLabels={{previous:"Vorheriger Eintrag",next:"Nächster Eintrag"}} options={metrics.map(m=>({value:m.id,label:m.label}))} value={metricId} onChange={setMetricId}/>
    </div>
    <div className={styles.mapCanvas} data-map-canvas onPointerMove={event=>setPointer({x:event.clientX,y:event.clientY})} onPointerLeave={() => setHovered(null)}>
    {/* Drawn only when the 3D scene fails. It used to be server-rendered and
        hidden on every page: 0.9 MB of duplicated boundary paths for the
        Eifelkreis, never shown while the scene works. */}
    {sceneFailed && <div className={styles.mapFallback}>
    <svg viewBox={shapes.length ? `${left} ${top} ${right-left} ${bottom-top}` : "0 0 1000 660"} role="img" aria-label={`${metric} auf der Karte. Gebiete und Werte stehen auch in der ${overview}.`}>
      <g className={styles.mapBase}>
        {shapes.map(s => <path key={s.id} d={s.sidePath} fillRule="nonzero" data-forest={s.kind === "Gemeindefreies Gebiet"} />)}
      </g>
      <g className={styles.mapGround}>
        {shapes.map(s => <path key={s.id} d={s.path} fillRule="evenodd" data-context={!byId.has(s.id)} data-kind={s.kind} data-selected={s.id === selected} data-hovered={s.id === hovered} data-region={s.id} onPointerLeave={() => setHovered(null)} onPointerEnter={e => { if (e.pointerType !== "touch") setHovered(s.id); }} onClick={() => openPlace(s.id)}>
          <title>{s.name + (byId.has(s.id) ? "" : " · " + contextDescription(s))}</title>
        </path>)}
      </g>
      <g>
        {shapes.slice().sort((a, b) => a.anchor[1] - b.anchor[1]).map(s => {
          const v = byId.get(s.id);
          if (!v || v.value === null || v.value <= 0) return null;
          const [x, y] = s.anchor, h = barHeight(v.value, maximum), r = 5;
          return <g key={s.id} className={styles.bar} data-selected={selected === s.id} data-hovered={hovered === s.id} data-bar={s.id} onPointerLeave={() => setHovered(null)} onPointerEnter={e => { if (e.pointerType !== "touch") setHovered(s.id); }} onClick={() => openPlace(s.id)}>
            <title>{`${v.name}: ${v.formatted.value} ${v.formatted.unit}`}</title>
            <path d={`M${x-r},${y}L${x-r},${y-h}L${x},${y-h-3}L${x+r},${y-h}L${x+r},${y}L${x},${y+3}Z`} />
            <path className={styles.barLight} d={`M${x-r},${y-h}L${x},${y-h+3}L${x+r},${y-h}L${x},${y-h-3}Z`} />
            <path className={styles.barSide} d={`M${x},${y-h+3}L${x+r},${y-h}L${x+r},${y}L${x},${y+3}Z`} />
          </g>;
        })}
      </g>
      <g>
        {shapes.filter(s => s.kind === "Kreisfreie Stadt").map(s => <g key={s.id}
          transform={`translate(${s.anchor[0]} ${s.anchor[1]}) scale(.55)`} className={styles.cityPin}
          data-city-pin={s.id} data-selected={selected === s.id} data-hovered={hovered === s.id}
          onPointerLeave={() => setHovered(null)}
          onPointerEnter={e => { if (e.pointerType !== "touch") setHovered(s.id); }}
          onClick={() => openPlace(s.id)}>
          <title>{`${s.name} · ${contextDescription(s)}`}</title>
          <path fill="white" stroke="none" fillRule="evenodd" d="M0,0 C-4,-9 -19,-19 -19,-32 A19,19 0 1,1 19,-32 C19,-19 4,-9 0,0Z" />
          <text x="0" y="-27" textAnchor="middle" fill="#163338" stroke="none" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="15">{s.name.replace(/^Kreisfreie Stadt\s+/, "").slice(0, 2).toLocaleUpperCase("de-DE")}</text>
        </g>)}
      </g>
    </svg>
    </div>}
    <RegionScene heightEnvelope={heightEnvelope} shapes={shapes} values={values} selected={selected} hovered={hovered} onHover={setHovered} onSelect={openPlace} onReady={ready=>setSceneFailed(!ready)} />
    {hoverShape && createPortal(<div ref={tooltip} role="tooltip" className={styles.mapTooltip} style={flagPosition}>
      <strong>{hoverShape.name}</strong>
      <span>{hoverValue ? `${hoverValue.formatted.value} ${hoverValue.formatted.unit} · ${metric}` : contextDescription(hoverShape)}</span>
      <small>{hoverValue?.href?`${member} öffnen ↗`:null}</small>
    </div>,document.body)}
    </div>


  </div>;
}
