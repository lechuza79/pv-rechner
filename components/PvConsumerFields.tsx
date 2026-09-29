"use client";
import {useState} from "react";
import GebaeudeField, {GEBAEUDE_FIELDS} from "./GebaeudeField";
import {AccordionField, ChoiceButtons} from "./AccordionField";
import TriToggle from "./TriToggle";
import PresetNumberInput from "./PresetNumberInput";
import {EA_KM_PRESETS, NUTZUNG, TRI, type Heizsystem} from "../lib/constants";

export interface PvConsumerValues {
  nutzung:number;wp:string;ea:string;eaKm:number;klima:string;klimaRooms:number;klimaKwh:number|null;
  wpHaustyp:number;wpWohnflaeche:number;wpInsulation:number;wpHeizsystem:Heizsystem;
}
export type PvConsumerKind = "wp" | "ea" | "klima";
export const requiredConsumerFields = (v:PvConsumerValues, only?:PvConsumerKind) => [
  ...((!only || only === "wp") && v.wp !== "nein" ? GEBAEUDE_FIELDS : []), ...((!only || only === "ea") && v.ea !== "nein" ? ["ea-km"] : []), ...((!only || only === "klima") && v.klima !== "nein" ? ["klima-rooms"] : []),
];
export const consumersComplete = (v:PvConsumerValues, answered:ReadonlySet<string>, only?:PvConsumerKind) => requiredConsumerFields(v,only).every(key=>answered.has(key));

/** The same in-step questions for result edits and consumer scenarios. */
export default function PvConsumerFields({values:v,update,answered,onAnswered,only}:{only?:PvConsumerKind;values:PvConsumerValues;update:(patch:Partial<PvConsumerValues>)=>void;answered:ReadonlySet<string>;onAnswered:(key:string)=>void}) {
  const [editing,setEditing]=useState<string|null>(null);
  const required=requiredConsumerFields(v,only);
  const current=editing ?? required.find(key=>!answered.has(key)) ?? null;
  const mark=(key:string)=>{onAnswered(key);setEditing(key===required.at(-1) ? key : null);};
  return <div className="wp-input-page">
    {!only && <AccordionField completedStyle="check" label="Nutzungsprofil" answered summary={NUTZUNG[v.nutzung].label} open={editing==="nutzung"} onEdit={()=>setEditing("nutzung")}>
      <ChoiceButtons cards options={NUTZUNG} selected={v.nutzung} onSelect={nutzung=>update({nutzung})} render={n=>n.label} sub={n=>n.sub}/>
    </AccordionField>}
    {!only && <TriToggle wrap label="Wärmepumpe" options={TRI} value={v.wp} onChange={wp=>{update({wp});setEditing(null);}}/>}
    {(!only || only === "wp") && v.wp!=="nein" && <GebaeudeField completedStyle="check" active={current!==null && (GEBAEUDE_FIELDS as readonly string[]).includes(current)}
      werte={{haustypIdx:v.wpHaustyp,wohnflaeche:v.wpWohnflaeche,insulationIdx:v.wpInsulation,heizsystem:v.wpHeizsystem}}
      setWerte={patch=>update({wpHaustyp:patch.haustypIdx??v.wpHaustyp,wpWohnflaeche:patch.wohnflaeche??v.wpWohnflaeche,wpInsulation:patch.insulationIdx??v.wpInsulation,wpHeizsystem:patch.heizsystem??v.wpHeizsystem})}
      beantwortet={new Set(answered)} markiereBeantwortet={mark} bearbeitet={editing} setBearbeitet={setEditing}/>}
    {!only && <TriToggle wrap label="Elektroauto" options={TRI} value={v.ea} onChange={ea=>{update({ea});setEditing(null);}}/>}
    {(!only || only === "ea") && v.ea!=="nein" && <AccordionField completedStyle="check" label="Fahrleistung pro Jahr" answered={answered.has("ea-km")} summary={`${v.eaKm.toLocaleString("de-DE")} km`} open={current==="ea-km"} onEdit={()=>setEditing("ea-km")}>
      <p>Wie viele Kilometer fährst du im Jahr? Wir berücksichtigen das Laden zuhause.</p>
      <ChoiceButtons cards columns={2} options={EA_KM_PRESETS} selected={answered.has("ea-km") ? EA_KM_PRESETS.indexOf(v.eaKm) : null} onSelect={i=>{update({eaKm:EA_KM_PRESETS[i]});mark("ea-km");}} render={km=>`${km.toLocaleString("de-DE")} km`}/>
      <label className="pv-consumer-custom"><span>Eigene Fahrleistung</span><PresetNumberInput placeholder="z. B. 12500" value={v.eaKm} presets={EA_KM_PRESETS} min={1000} max={50000} unit="km" onCommit={eaKm=>{update({eaKm});mark("ea-km");}} onFocus={()=>setEditing("ea-km")}/></label>
    </AccordionField>}
    {!only && <TriToggle wrap label="Klimaanlage" options={TRI} value={v.klima} onChange={klima=>{update({klima});setEditing(null);}}/>}
    {(!only || only === "klima") && v.klima!=="nein" && <AccordionField completedStyle="check" label="Gekühlte Räume" answered={answered.has("klima-rooms")} summary={`${v.klimaRooms} Räume`} open={current==="klima-rooms"} onEdit={()=>setEditing("klima-rooms")}>
      <p>Wie viele Räume möchtest du kühlen?</p>
      <ChoiceButtons cards columns={2} options={[1,2,3,4,5]} selected={answered.has("klima-rooms") ? v.klimaRooms-1 : null} onSelect={i=>{update({klimaRooms:i+1,klimaKwh:null});mark("klima-rooms");}} render={n=>`${n} ${n===1 ? "Raum" : "Räume"}`}/>
    </AccordionField>}
  </div>;
}
